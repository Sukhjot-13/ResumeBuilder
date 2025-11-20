import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: 'Logged out successfully' });

  // Clear cookies
  response.cookies.set('accessToken', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
    sameSite: 'lax',
  });

  response.cookies.set('refreshToken', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
    sameSite: 'lax',
  });

  return response;
}
