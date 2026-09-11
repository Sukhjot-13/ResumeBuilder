
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { refetch } = useAuth();

  const handleSendOtp = async (e) => {
    e.preventDefault();
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
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    }

    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
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
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to verify OTP');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    }

    setLoading(false);
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
                className="app-input w-full"
                placeholder="you@example.com"
              />
            </div>
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
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label htmlFor="otp" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 text-center">
                Enter Verification Code
              </label>
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="app-input w-full text-center tracking-[0.3em] font-mono text-xl py-3"
                placeholder="123456"
                maxLength={6}
              />
              <p className="text-xs text-slate-400 mt-2 text-center">
                We sent a 6-digit code to <span className="text-white font-medium">{email}</span>
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
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
              onClick={() => setOtpSent(false)}
              className="w-full text-xs text-slate-400 hover:text-white transition-colors text-center font-medium pt-2"
            >
              ← Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
