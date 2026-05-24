import User from '@/models/User';
import { verifyAuthEdge } from '@/lib/auth-edge';
import { ROLES } from '@/lib/constants';
import dbConnect from '@/lib/mongodb';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const PATCH = withErrorHandler(async (req, { params }) => {
  await dbConnect();

  const accessToken = req.cookies.get('accessToken')?.value;
  const auth = await verifyAuthEdge({ accessToken });

  if (!auth.ok || auth.role !== ROLES.ADMIN) {
    return fail('Unauthorized', 403);
  }

  const { id } = await params;
  const { role } = await req.json();

  if (typeof role !== 'number') {
    return fail('Invalid role', 400);
  }

  const user = await User.findByIdAndUpdate(id, { role }, { new: true });

  if (!user) {
    return fail('User not found', 404);
  }

  return ok({ user });
});
