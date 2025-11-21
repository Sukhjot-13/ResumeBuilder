import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ResumeMetadata from '@/models/resumeMetadata';

export async function PUT(req, { params }) {
  const userId = req.headers.get('x-user-id');
  const { id } = params;
  const { jobTitle, companyName } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  try {
    const metadata = await ResumeMetadata.findOne({ resumeId: id });

    if (!metadata) {
      return NextResponse.json({ error: 'Metadata not found' }, { status: 404 });
    }

    if (metadata.userId.toString() !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    metadata.jobTitle = jobTitle || metadata.jobTitle;
    metadata.companyName = companyName || metadata.companyName;
    await metadata.save();

    return NextResponse.json(metadata);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
