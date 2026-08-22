import crypto from 'crypto';
import * as Brevo from '@getbrevo/brevo';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { sha256 } from '@/lib/utils';
import { OTP_CONFIG } from '@/lib/constants';
import env from '@/config/env';
import { ok, fail, withErrorHandler, readJson } from '@/lib/apiResponse';

const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between OTP sends

export const POST = withErrorHandler(async (req) => {
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.response;
  const { email } = parsed.body || {};

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail('A valid email is required', 400);
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const otpExpires = new Date(Date.now() + OTP_CONFIG.EXPIRY_MS);

  await dbConnect();

  try {
    let user = await User.findOne({ email });

    if (user) {
      // Resend cooldown — prevents email bombing / scripted requests
      if (user.lastOtpSentAt && Date.now() - user.lastOtpSentAt.getTime() < RESEND_COOLDOWN_MS) {
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
        email,
        otp: sha256(otp),
        otpExpires,
        lastOtpSentAt: new Date(),
      });
    }

    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, env.brevoApiKey);

    const sendSmtpEmail = new Brevo.SendSmtpEmail();

    sendSmtpEmail.subject = "Your OTP for ATS-Friendly Resume Builder";
    sendSmtpEmail.htmlContent = `<html><body><h1>Your OTP is ${otp}</h1></body></html>`;
    sendSmtpEmail.sender = { name: "ATS-Friendly Resume Builder", email: env.brevoSenderEmail };
    sendSmtpEmail.to = [{ email }];

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    return ok(null);
  } catch (error) {
    console.error('OTP sending error:', error);
    return fail('Failed to send OTP', 500);
  }
});
