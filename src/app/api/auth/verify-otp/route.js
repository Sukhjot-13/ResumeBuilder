
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import RefreshToken from '@/models/refreshToken';
import {
  hashToken,
  sha256,
  generateAccessToken,
  generateRefreshToken,
} from '@/lib/utils';
import { TOKEN_CONFIG, COOKIE_NAMES } from '@/lib/constants';
import env from '@/config/env';
import { ok, fail, withErrorHandler, readJson } from '@/lib/apiResponse';

const MAX_OTP_ATTEMPTS = 5;

export const POST = withErrorHandler(async (req) => {
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.response;
  const { email, otp } = parsed.body || {};

  if (!email || !otp || typeof otp !== 'string') {
    return fail('Email and OTP are required', 400);
  }

  // Normalize casing/whitespace to match the OTP request path
  const normalizedEmail = email.trim().toLowerCase();

  await dbConnect();

  try {
    const user = await User.findOne({ email: normalizedEmail });

    // Generic failure — no user enumeration
    const invalidResponse = () => fail('Invalid or expired OTP', 400);

    if (!user || !user.otp) return invalidResponse();

    // Lockout after too many failed attempts — force a fresh code request
    if ((user.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      await User.updateOne(
        { _id: user._id },
        { $unset: { otp: 1, otpExpires: 1, otpAttempts: 1 } }
      );
      return fail('Too many attempts. Please request a new code.', 429);
    }

    if (user.otp !== sha256(otp) || Date.now() > new Date(user.otpExpires).getTime()) {
      // Atomic attempt counter — race-safe against parallel guesses
      await User.updateOne({ _id: user._id }, { $inc: { otpAttempts: 1 } });
      return invalidResponse();
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

    // Clear OTP state on success
    await User.updateOne(
      { _id: user._id },
      { $unset: { otp: 1, otpExpires: 1, otpAttempts: 1 } }
    );

    const response = ok({ newUser });

    // Set cookies
    const secure = env.isProduction;
    response.cookies.set(COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
      path: '/',
      maxAge: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY_SECONDS,
      httpOnly: true,
      secure,
      sameSite: 'lax',
    });
    response.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
      path: '/',
      maxAge: refreshTokenExpirationSeconds,
      httpOnly: true,
      secure,
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    console.error(error);
    return fail('Internal server error', 500);
  }
});
