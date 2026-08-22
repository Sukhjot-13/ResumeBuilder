import { cookies } from 'next/headers';
import { ok } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import RefreshToken from '@/models/refreshToken';
import { hashToken } from '@/lib/utils';
import { COOKIE_NAMES } from '@/lib/constants';

export async function POST() {
  // Revoke the refresh token server-side so a captured token
  // can't outlive "logout" (shared machines, XSS elsewhere, logs).
  try {
    const refreshToken = (await cookies()).get(COOKIE_NAMES.REFRESH_TOKEN)?.value;
    if (refreshToken) {
      await dbConnect();
      await RefreshToken.deleteMany({
        token: hashToken(refreshToken),
        // token hashes are unique per device; deleteMany is defensive
      });
    }
  } catch {
    // Never block logout on DB issues — still clear cookies below.
  }

  const response = ok(null);

  // Clear cookies
  response.cookies.set(COOKIE_NAMES.ACCESS_TOKEN, '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
    sameSite: 'lax',
  });

  response.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
    sameSite: 'lax',
  });

  return response;
}

