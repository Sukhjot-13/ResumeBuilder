import dbConnect from '@/lib/mongodb';
import ResumeMetadata from '@/models/resumeMetadata';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const PUT = withErrorHandler(async (req, { params }) => {
  const userId = req.headers.get('x-user-id');
  const { id } = params;
  const { jobTitle, companyName } = await req.json();

  if (!userId) {
    return fail('Unauthorized', 401);
  }

  await dbConnect();

  const metadata = await ResumeMetadata.findOne({ resumeId: id });

  if (!metadata) {
    return fail('Metadata not found', 404);
  }

  if (metadata.userId.toString() !== userId) {
    return fail('Unauthorized', 403);
  }

  metadata.jobTitle = jobTitle || metadata.jobTitle;
  metadata.companyName = companyName || metadata.companyName;
  await metadata.save();

  return ok(metadata);
});
