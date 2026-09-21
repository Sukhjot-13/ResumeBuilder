'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PLANS } from '@/lib/constants';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/common/ToastProvider';

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  // Subscribers/Admins already have the Free tier included
  const isSubscriber = isAuthenticated && typeof user?.role === 'number' && user.role <= 99;

  const handleUpgrade = async (planName) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planName }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Something went wrong');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-5xl mx-auto text-center mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300 mb-4">
          <span>⚡ Simple, Transparent Pricing</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
          Invest in Your Next <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">Career Leap</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
          Unlock unlimited AI resume tailoring, natural language editing, and ATS-compliant PDF exports.
        </p>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* Free Plan */}
        <div className="glass-card p-8 rounded-3xl border border-white/[0.08] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Starter</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">{PLANS.FREE.name}</h2>
            <p className="text-xs text-slate-400 mb-6">Essential tools for job hunters starting out.</p>

            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-white">${PLANS.FREE.price}</span>
              <span className="text-xs text-slate-400 font-medium">/{PLANS.FREE.interval}</span>
            </div>

            <div className="pt-6 border-t border-white/[0.08] space-y-3.5 mb-8">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Included</h3>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-cyan-400 text-[10px]">✓</div>
                  <span>{PLANS.FREE.credits} Resume credits / day</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-cyan-400 text-[10px]">✓</div>
                  <span>AI tailored resume generation</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-cyan-400 text-[10px]">✓</div>
                  <span>Saved resume library</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-cyan-400 text-[10px]">✓</div>
                  <span>Standard ATS templates</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-cyan-400 text-[10px]">✓</div>
                  <span>Master resume builder</span>
                </li>
                <li className="flex items-center gap-2.5 text-slate-500">
                  <div className="w-4 h-4 rounded-full bg-slate-900 flex items-center justify-center text-slate-600 text-[10px]">✕</div>
                  <span>Custom AI instructions & AI editor</span>
                </li>
                <li className="flex items-center gap-2.5 text-slate-500">
                  <div className="w-4 h-4 rounded-full bg-slate-900 flex items-center justify-center text-slate-600 text-[10px]">✕</div>
                  <span>Cover letters & resume upload parsing</span>
                </li>
              </ul>
            </div>
          </div>

          <button
            disabled={isSubscriber || isAuthenticated}
            className={`w-full py-3 px-4 rounded-xl text-xs font-semibold transition-all ${
              isSubscriber
                ? 'bg-slate-800/40 text-slate-500 border border-white/[0.06] cursor-not-allowed'
                : isAuthenticated
                ? 'bg-slate-800/60 text-slate-300 border border-white/[0.08] cursor-default'
                : 'btn-secondary'
            }`}
          >
            {isSubscriber ? 'Included in your Plan' : isAuthenticated ? 'Current Plan' : 'Get Started Free'}
          </button>
        </div>

        {/* Pro Plan */}
        <div className="glass-card p-8 rounded-3xl border border-indigo-500/40 relative shadow-2xl shadow-indigo-950/40 flex flex-col justify-between">
          {/* Top highlight bar */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 text-[10px] font-bold text-white uppercase tracking-wider shadow-md">
            Most Popular
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Professional</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">{PLANS.PRO.name}</h2>
            <p className="text-xs text-slate-400 mb-6">Complete AI toolkit for active applicants.</p>

            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-white">${PLANS.PRO.price}</span>
              <span className="text-xs text-slate-400 font-medium">/{PLANS.PRO.interval}</span>
            </div>

            <div className="pt-6 border-t border-white/[0.08] space-y-3.5 mb-8">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Everything in Free, plus:</h3>
              <ul className="space-y-3 text-xs text-slate-200">
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-indigo-500/20 text-cyan-300 flex items-center justify-center text-[10px]">✓</div>
                  <span className="font-medium text-white">{PLANS.PRO.credits} Generation credits / month</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-indigo-500/20 text-cyan-300 flex items-center justify-center text-[10px]">✓</div>
                  <span>Custom instructions & keyword prioritization</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-indigo-500/20 text-cyan-300 flex items-center justify-center text-[10px]">✓</div>
                  <span>AI natural language resume editor + version history</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-indigo-500/20 text-cyan-300 flex items-center justify-center text-[10px]">✓</div>
                  <span>AI cover letter generator + library</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-indigo-500/20 text-cyan-300 flex items-center justify-center text-[10px]">✓</div>
                  <span>Resume upload parsing & high-resolution PDF exports</span>
                </li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => handleUpgrade('PRO')}
            disabled={loading || isSubscriber}
            className={`w-full py-3 px-4 rounded-xl text-xs font-semibold transition-all ${
              isSubscriber
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 cursor-default'
                : 'btn-primary'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Connecting to Stripe...
              </span>
            ) : isSubscriber ? (
              'Active Pro Subscription'
            ) : (
              'Upgrade to Pro'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

