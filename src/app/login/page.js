
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  console.log('LoginPage component rendered');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { refetch } = useAuth();

  useEffect(() => {
    // This effect will run on mount and redirect if the middleware logic
    // determines the user is already logged in.
  }, []);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    console.log('handleSendOtp called');
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        console.log('OTP sent successfully');
        setOtpSent(true);
      } else {
        const data = await response.json();
        console.error('Failed to send OTP:', data.error);
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      console.error('An unexpected error occurred while sending OTP:', err);
      setError('An unexpected error occurred.');
    }

    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    console.log('handleVerifyOtp called');
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
        console.log('OTP verified successfully');
        
        // Update auth state immediately
        await refetch();

        if (newUser) {
          console.log('New user, redirecting to onboarding...');
          router.push('/onboarding');
        } else {
          console.log('Existing user, redirecting to dashboard...');
          router.push('/dashboard');
        }
      } else {
        const data = await response.json();
        console.error('Failed to verify OTP:', data.error);
        setError(data.error || 'Failed to verify OTP');
      }
    } catch (err) {
      console.error('An unexpected error occurred while verifying OTP:', err);
      setError('An unexpected error occurred.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900 -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl -z-10 animate-pulse-glow" />
      
      <div className="glass-card p-10 rounded-2xl shadow-2xl w-full max-w-md relative z-10 border border-white/10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent mb-2">Welcome Back</h1>
          <p className="text-slate-400 text-sm">Sign in to continue building your resume</p>
        </div>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}
        
        {!otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-white placeholder-slate-500"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending Code...' : 'Send Login Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-slate-300 mb-2">Enter OTP Code</label>
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-white placeholder-slate-500 text-center tracking-widest text-lg"
                placeholder="123456"
              />
              <p className="text-xs text-slate-500 mt-2 text-center">
                We sent a code to <span className="text-slate-300">{email}</span>
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button 
              type="button"
              onClick={() => setOtpSent(false)}
              className="w-full text-sm text-slate-400 hover:text-white transition-colors"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
