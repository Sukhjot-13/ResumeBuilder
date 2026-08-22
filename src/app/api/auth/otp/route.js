import crypto from 'crypto';
import * as Brevo from '@getbrevo/brevo';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { sha256 } from '@/lib/utils';
import { OTP_CONFIG } from '@/lib/constants';
import env from '@/config/env';
import { ok, fail, withErrorHandler, readJson } from '@/lib/apiResponse';

const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between OTP sends

// Best-effort in-memory throttle keyed on IP + email. Applies the SAME cooldown
// whether or not an account exists, so response differences can't be used to
// probe for registered addresses. (The DB-level cooldown below remains as the
// authoritative per-user guard.)
const recentRequests = new Map();

function pruneRecentRequests(now) {
  if (recentRequests.size < 1000) return;
  for (const [key, ts] of recentRequests) {
    if (now - ts > RESEND_COOLDOWN_MS) recentRequests.delete(key);
  }
}

export const POST = withErrorHandler(async (req) => {
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.response;
  const { email } = parsed.body || {};

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail('A valid email is required', 400);
  }

  // Normalize casing/whitespace so Me@x.com and me@x.com are ONE account
  const normalizedEmail = email.trim().toLowerCase();

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const throttleKey = `${clientIp}:${normalizedEmail}`;
  const now = Date.now();
  pruneRecentRequests(now);

  const lastRequest = recentRequests.get(throttleKey);
  if (lastRequest && now - lastRequest < RESEND_COOLDOWN_MS) {
    return fail('Please wait a moment before requesting a new code.', 429);
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const otpExpires = new Date(Date.now() + OTP_CONFIG.EXPIRY_MS);

  await dbConnect();

  try {
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      // Resend cooldown — prevents email bombing / scripted requests
      if (user.lastOtpSentAt && now - user.lastOtpSentAt.getTime() < RESEND_COOLDOWN_MS) {
        recentRequests.set(throttleKey, now); // count it, keep responses uniform
        return fail('Please wait a moment before requesting a new code.', 429);
      }

      await User.updateOne(
        { _id: user._id },
        {
          $set: { otp: sha256(otp), otpExpires, lastOtpSentAt: new Date() },
          $unset: { otpAttempts: 1 },
        }
      );
    } else {
      user = await User.create({
        email: normalizedEmail,
        otp: sha256(otp),
        otpExpires,
        lastOtpSentAt: new Date(),
      });
    }

    recentRequests.set(throttleKey, now);

    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, env.brevoApiKey);

    const sendSmtpEmail = new Brevo.SendSmtpEmail();

    sendSmtpEmail.subject = "Your login code for ATS-Friendly Resume Builder";
    sendSmtpEmail.htmlContent = `
<html>
  <body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
      <div style="background-color:#ffffff;border-radius:12px;padding:32px;text-align:center;">
        <h1 style="font-size:20px;color:#111827;margin:0 0 8px;">ATS-Friendly Resume Builder</h1>
        <p style="font-size:14px;color:#6b7280;margin:0 0 24px;">Use the code below to sign in. It expires in ${Math.round(OTP_CONFIG.EXPIRY_MS / 60000)} minutes.</p>
        <div style="display:inline-block;background-color:#f3f4f6;border-radius:8px;padding:16px 32px;font-size:32px;font-weight:bold;letter-spacing:8px;color:#111827;">${otp}</div>
        <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;">If you didn't request this code, you can safely ignore this email.</p>
      </div>
    </div>
  </body>
</html>`;
    sendSmtpEmail.sender = { name: "ATS-Friendly Resume Builder", email: env.brevoSenderEmail };
    sendSmtpEmail.to = [{ email: normalizedEmail }];

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    return ok(null);
  } catch (error) {
    console.error('OTP sending error:', error);
    return fail('Failed to send OTP', 500);
  }
});
