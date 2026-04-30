
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import RefreshToken from '@/models/refreshToken';
import {
  hashToken,
  sha256,
  generateAccessToken,
  generateRefreshToken,
} from '@/lib/utils';
import { TOKEN_CONFIG } from '@/lib/constants';

export async function POST(req) {
  const { email, otp } = await req.json();

  if (!email || !otp) {
    return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
  }

  await dbConnect();

  try {
    const user = await User.findOne({ email });

    if (!user || user.otp !== sha256(otp) || Date.now() > user.otpExpires) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    let newUser = !user.name;
    const refreshTokenExpirationSeconds = TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY_MS / 1000;

    const accessToken = await generateAccessToken(user._id, user.role);
    const refreshToken = await generateRefreshToken(user._id);

    // Hash the refresh token
    const hashedRefreshToken = hashToken(refreshToken);

    // Save the new refresh token to its own collection
    await RefreshToken.create({
      userId: user._id,
      token: hashedRefreshToken,
      expiresAt: new Date(Date.now() + refreshTokenExpirationSeconds * 1000),
      ip: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
    });

    // Remove OTP fields from user
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const response = NextResponse.json({ newUser });

    // Set cookies
    const secure = process.env.NODE_ENV === 'production';
    response.cookies.set('accessToken', accessToken, {
      path: '/',
      maxAge: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY_SECONDS,
      httpOnly: true,
      secure,
      sameSite: 'lax',
    });
    response.cookies.set('refreshToken', refreshToken, {
      path: '/',
      maxAge: refreshTokenExpirationSeconds,
      httpOnly: true,
      secure,
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
