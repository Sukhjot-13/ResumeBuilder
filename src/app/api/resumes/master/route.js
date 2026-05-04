/**
 * PUT    /api/resumes/master — Create or update the master resume.
 * DELETE /api/resumes/master — Delete the master resume.
 *
 * Permission required:
 *   PUT    → UPLOAD_MAIN_RESUME (all users)
 *   DELETE → DELETE_OWN_RESUME  (all users)
 */

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Resume from '@/models/resume';
import { logger } from '@/lib/logger';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import { RESUME_FIELD_SCHEMA } from '@/lib/resumeFields';

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------
function validateContent(content) {
  const errors = [];
  for (const [sectionKey, section] of Object.entries(RESUME_FIELD_SCHEMA)) {
    if (section.type === 'object') {
      const sectionData = content[sectionKey] || {};
      for (const [fieldKey, field] of Object.entries(section.fields)) {
        if (field.required && !sectionData[fieldKey]) {
          errors.push(`${section.label} → ${field.label} is required`);
        }
      }
    } else if (section.type === 'array') {
      const items = content[sectionKey] || [];
      items.forEach((item, idx) => {
        for (const [fieldKey, field] of Object.entries(section.fields)) {
          if (field.required && !item[fieldKey]) {
            errors.push(`${section.label} #${idx + 1} → ${field.label} is required`);
          }
        }
      });
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// PUT — create or update master resume
// ---------------------------------------------------------------------------
export async function PUT(req) {
  const userId = req.headers.get('x-user-id');

  await dbConnect();
  const permResult = await requirePermission(userId, PERMISSIONS.UPLOAD_MAIN_RESUME);
  if (isPermissionError(permResult)) return permResult.error;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { content } = body;
  if (!content || typeof content !== 'object') {
    return NextResponse.json({ error: 'Resume content is required' }, { status: 400 });
  }

  const validationErrors = validateContent(content);
  if (validationErrors.length > 0) {
    return NextResponse.json(
      { error: 'Validation failed', details: validationErrors },
      { status: 422 }
    );
  }

  try {
    const user = await User.findById(userId).populate('mainResume');
    if (!user) {
      logger.warn('User not found in PUT /api/resumes/master', { userId });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let resume;
    if (user.mainResume) {
      resume = await Resume.findByIdAndUpdate(
        user.mainResume._id,
        { $set: { content } },
        { new: true }
      );
      logger.info('Master resume updated', { userId, resumeId: resume._id });
    } else {
      resume = await Resume.create({ userId, content });
      user.mainResume = resume._id;
      await user.save();
      logger.info('Master resume created', { userId, resumeId: resume._id });
    }

    const updatedUser = await User.findById(userId)
      .populate({ path: 'mainResume', populate: { path: 'metadata', model: 'ResumeMetadata' } })
      .select('name email mainResume role');

    return NextResponse.json({ user: updatedUser, resume });
  } catch (error) {
    logger.error('Error in PUT /api/resumes/master', error, { userId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE — remove master resume
// ---------------------------------------------------------------------------
export async function DELETE(req) {
  const userId = req.headers.get('x-user-id');

  await dbConnect();
  const permResult = await requirePermission(userId, PERMISSIONS.DELETE_OWN_RESUME);
  if (isPermissionError(permResult)) return permResult.error;

  try {
    const user = await User.findById(userId);
    if (!user) {
      logger.warn('User not found in DELETE /api/resumes/master', { userId });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.mainResume) {
      return NextResponse.json({ error: 'No master resume to delete' }, { status: 404 });
    }

    const resumeId = user.mainResume;
    await Resume.findByIdAndDelete(resumeId);
    user.mainResume = null;
    await user.save();

    logger.info('Master resume deleted', { userId, resumeId });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in DELETE /api/resumes/master', error, { userId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
