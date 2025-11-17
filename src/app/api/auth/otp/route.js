
import { NextResponse } from 'next/server';
import * as Brevo from '@getbrevo/brevo';
import dbConnect from '@/lib/mongodb';
import User from '@/models/user';

export async function POST(req) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes

  await dbConnect();

  try {
    let user = await User.findOne({ email });

    if (user) {
      user.otp = otp;
      user.otpExpires = otpExpires;
      await user.save();
    } else {
      user = await User.create({ email, otp, otpExpires });
    }

    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

    const sendSmtpEmail = new Brevo.SendSmtpEmail();

    sendSmtpEmail.subject = "Your OTP for ATS-Friendly Resume Builder";
    sendSmtpEmail.htmlContent = `<html><body><h1>Your OTP is ${otp}</h1></body></html>`;
    sendSmtpEmail.sender = { name: "ATS-Friendly Resume Builder", email: process.env.BREVO_SENDER_EMAIL };
    sendSmtpEmail.to = [{ email }];

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    return NextResponse.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('OTP sending error:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
