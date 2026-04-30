import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Resume from '@/models/resume';
import ResumeMetadata from '@/models/resumeMetadata';
import { checkPermission } from '@/lib/accessControl';
import { PERMISSIONS } from '@/lib/constants';
import { logger } from '@/lib/logger';

// ARCH-1: This route now follows the standard pattern — read x-user-id injected
// by the middleware proxy. No manual cookie/token verification needed here.

export async function GET(req) {
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();

    const user = await User.findById(userId).populate({
      path: 'mainResume',
      populate: {
        path: 'metadata',
        model: 'ResumeMetadata',
      },
    });

    if (!user) {
      logger.warn('User not found in GET /api/user/profile', { userId });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!checkPermission(user, PERMISSIONS.VIEW_OWN_PROFILE)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    return NextResponse.json({
      id: user._id,
      email: user.email,
      name: user.name,
      dateOfBirth: user.dateOfBirth,
      mainResume: user.mainResume,
      creditsUsed: user.creditsUsed || 0,
      role: user.role,
    });
  } catch (error) {
    logger.error('Error in GET /api/user/profile', error, { userId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req) {
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();

    const body = await req.json();
    const { mainResume, name, dateOfBirth } = body;

    const user = await User.findById(userId);

    if (!user) {
      logger.warn('User not found in PUT /api/user/profile', { userId });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!checkPermission(user, PERMISSIONS.EDIT_OWN_PROFILE)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Handle mainResume update
    if (mainResume) {
      const newResume = new Resume({
        userId: user._id,
        content: mainResume,
      });
      await newResume.save();
      user.mainResume = newResume._id;
    }

    if (name !== undefined) user.name = name;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;

    await user.save();

    const updatedUser = await User.findById(user._id).populate({
      path: 'mainResume',
      populate: {
        path: 'metadata',
        model: 'ResumeMetadata',
      },
    });

    logger.info('Profile updated', { userId });
    return NextResponse.json({
      id: updatedUser._id,
      email: updatedUser.email,
      name: updatedUser.name,
      dateOfBirth: updatedUser.dateOfBirth,
      mainResume: updatedUser.mainResume,
    });
  } catch (error) {
    logger.error('Error in PUT /api/user/profile', error, { userId });
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
