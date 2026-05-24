import User from '@/models/User';
import { verifyAuthEdge } from '@/lib/auth-edge';
import { ROLES } from '@/lib/constants';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const POST = withErrorHandler(async (req, { params }) => {
  const accessToken = req.cookies.get('accessToken')?.value;
  const auth = await verifyAuthEdge({ accessToken });

  if (!auth.ok || auth.role !== ROLES.ADMIN) {
    return fail('Unauthorized', 403);
  }

  const { id } = await params;
  const { amount } = await req.json();

  if (typeof amount !== 'number') {
    return fail('Invalid amount', 400);
  }

  const user = await User.findById(id);

  if (!user) {
    return fail('User not found', 404);
  }

  user.credits += amount;
  await user.save();

  return ok({ credits: user.credits });
});
