
"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { OTP_CONFIG } from '@/lib/constants';

const OTP_LENGTH = 6;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_S = 60;
const OTP_EXPIRY_MS = OTP_CONFIG.EXPIRY_MS;

function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSentAt, setOtpSentAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockedOut, setLockedOut] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [remember, setRemember] = useState(false);
  const [shake, setShake] = useState(0);
  const [magicLink, setMagicLink] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refetch } = useAuth();
  const verifyingRef = useRef(false);
  const magicConsumedRef = useRef(false);
  const boxRefs = useRef([]);

  const codeExpired = otpSent && now - otpSentAt > OTP_EXPIRY_MS;

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setOtpSent(true);
        setOtp('');
        setOtpSentAt(Date.now());
        setNow(Date.now());
        setAttempts(0);
        setLockedOut(false);
        setResendIn(RESEND_COOLDOWN_S);
        setTimeout(() => boxRefs.current[0]?.focus(), 50);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    }

    setLoading(false);
  };

  const handleVerifyOtp = useCallback(async (code) => {
    if (verifyingRef.current || code.length !== OTP_LENGTH) return;
    verifyingRef.current = true;
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code, remember }),
      });

      if (response.ok) {
        const { newUser } = await response.json();

        // Update auth state immediately
        await refetch();

        if (newUser) {
          router.push('/onboarding');
        } else {
          router.push('/dashboard');
        }
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (response.status === 429) {
        setLockedOut(true);
        setError(data.error || 'Too many attempts. Please request a new code.');
      } else {
        setAttempts((a) => a + 1);
        setError(
          `${data.error || 'Invalid or expired OTP'} — attempt ${Math.min(attempts + 1, MAX_OTP_ATTEMPTS)} of ${MAX_OTP_ATTEMPTS}`
        );
      }
      setOtp('');
      setShake((s) => s + 1);
      setTimeout(() => boxRefs.current[0]?.focus(), 50);
    } catch (err) {
      setError('An unexpected error occurred.');
    }

    setLoading(false);
    verifyingRef.current = false;
  }, [email, remember, refetch, router, attempts]);

  // Auto-submit the moment a complete code is present (typed, pasted, magic link)
  useEffect(() => {
    if (otpSent && otp.length === OTP_LENGTH && !loading && !codeExpired && !lockedOut) {
      handleVerifyOtp(otp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, otpSent]);

  // Magic link: /login?email=…&code=…… — pre-fill and verify once
  useEffect(() => {
    if (magicConsumedRef.current) return;
    const linkEmail = searchParams.get('email');
    const linkCode = (searchParams.get('code') || '').replace(/\D/g, '');
    if (linkEmail && linkCode.length === OTP_LENGTH) {
      magicConsumedRef.current = true;
      setMagicLink(true);
      setEmail(linkEmail);
      setOtpSent(true);
      setOtpSentAt(Date.now());
      setNow(Date.now());
      setAttempts(0);
      setLockedOut(false);
      setOtp(linkCode);
      router.replace('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Expiry countdown ticker (only while a code is live)
  useEffect(() => {
    if (!otpSent || codeExpired) return;
    const timer = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(timer);
  }, [otpSent, now, codeExpired]);

  // Resend cooldown countdown (mirrors the server's 60s throttle)
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  // Re-trigger the shake animation on each failure (key change restarts it)
  useEffect(() => {
    if (shake === 0) return;
    const timer = setTimeout(() => setShake(0), 500);
    return () => clearTimeout(timer);
  }, [shake]);

  const focusBox = (index) => boxRefs.current[index]?.focus();

  const handleBoxChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    if (!digit && value !== '') return;
    const next = (otp + '      ').split('').slice(0, OTP_LENGTH);
    next[index] = digit;
    setOtp(next.join('').slice(0, OTP_LENGTH));
    if (digit && index < OTP_LENGTH - 1) focusBox(index + 1);
  };

  const handleBoxKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      e.preventDefault();
      const next = otp.split('');
      next[index - 1] = '';
      setOtp(next.join(''));
      focusBox(index - 1);
    }
  };

  const handlePaste = (e) => {
    const digits = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!digits) return;
    e.preventDefault();
    setOtp(digits);
    focusBox(Math.min(digits.length, OTP_LENGTH - 1));
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="glass-card p-8 sm:p-10 rounded-3xl shadow-2xl w-full max-w-md relative z-10 border border-white/[0.08]">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 p-[1px] mx-auto mb-4 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-[#090d16] rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">Welcome Back</h1>
          <p className="text-slate-400 text-xs sm:text-sm">Sign in with a secure one-time passcode</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-xl mb-6 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {!otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="app-input w-full px-4 py-3 text-sm text-white"
                placeholder="you@example.com"
              />
            </div>
            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800/80 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Remember this device for 30 days</span>
            </label>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending Passcode...</span>
                </>
              ) : (
                <span>Send Login Code</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(otp); }} className="space-y-5">
            <div>
              <label htmlFor="otp-0" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3 text-center">
                Enter Verification Code
              </label>
              <div key={shake} className={shake ? 'animate-shake flex justify-center gap-2' : 'flex justify-center gap-2'} onPaste={handlePaste}>
                {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    ref={(el) => { boxRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    value={otp[i] || ''}
                    onChange={(e) => handleBoxChange(i, e.target.value)}
                    onKeyDown={(e) => handleBoxKeyDown(i, e)}
                    disabled={loading || lockedOut || codeExpired}
                    maxLength={1}
                    aria-label={`Digit ${i + 1}`}
                    className="app-input w-11 h-13 sm:w-12 sm:h-14 px-0 py-3 text-center font-mono text-xl text-white disabled:opacity-50"
                  />
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3 text-center">
                {magicLink ? (
                  <>Signing you in via email link for <span className="text-white font-medium">{email}</span></>
                ) : (
                  <>We sent a 6-digit code to <span className="text-white font-medium">{email}</span></>
                )}
              </p>
              <p className={`text-xs mt-1.5 text-center font-mono ${codeExpired ? 'text-rose-400 font-semibold' : 'text-slate-500'}`}>
                {codeExpired ? 'Code expired — request a new one below' : `Code expires in ${formatCountdown(otpSentAt + OTP_EXPIRY_MS - now)}`}
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || otp.length !== OTP_LENGTH || lockedOut || codeExpired}
              className="btn-primary w-full py-3 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify & Sign In</span>
              )}
            </button>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading || resendIn > 0}
              className="w-full text-xs text-slate-400 hover:text-white transition-colors text-center font-medium pt-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
            </button>
            <button
              type="button"
              onClick={() => { setOtpSent(false); setOtp(''); setAttempts(0); setLockedOut(false); }}
              className="w-full text-xs text-slate-400 hover:text-white transition-colors text-center font-medium"
            >
              ← Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
