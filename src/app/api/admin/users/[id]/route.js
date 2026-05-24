import User from '@/models/User';
import { verifyAuthEdge } from '@/lib/auth-edge';
import { ROLES } from '@/lib/constants';
import dbConnect from '@/lib/mongodb';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const DELETE = withErrorHandler(async (req, { params }) => {
  const accessToken = req.cookies.get('accessToken')?.value;
  const auth = await verifyAuthEdge({ accessToken });

  if (!auth.ok || auth.role !== ROLES.ADMIN) {
    return fail('Unauthorized', 403);
  }

  const { id } = await params;

  // Don't allow deleting yourself
  if (auth.userId === id) {
    return fail('Cannot delete your own account', 400);
  }

  const user = await User.findByIdAndDelete(id);

  if (!user) {
    return fail('User not found', 404);
  }

  return ok(null, 'User deleted successfully');
});
