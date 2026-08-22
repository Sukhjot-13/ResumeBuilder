'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PLANS } from '@/lib/constants';

/**
 * A reusable component to lock premium features.
 * 
 * @param {object} props
 * @param {string} props.featureName - The name of the feature (e.g., "AI Resume Parsing")
 * @param {string} props.description - Optional description text
 * @param {string} props.planName - The plan required (default: 'PRO')
 * @param {function} props.onUpgrade - Optional custom handler for upgrade action
 * @param {string} props.buttonText - Custom text for the upgrade button
 * @param {'default' | 'compact'} props.variant - Display variant. 'compact' for inline/smaller views.
 */
export default function PremiumFeatureLock({ 
  featureName, 
  description, 
  planName = 'PRO',
  onUpgrade,
  buttonText,
  variant = 'default'
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (onUpgrade) {
      onUpgrade();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planName: planName,
        }),
      });
      
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to initiate checkout. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to initiate checkout');
      setLoading(false);
    }
  };

  // Compact variant - smaller, inline-friendly
  if (variant === 'compact') {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 flex-shrink-0">
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white">{featureName}</p>
            <p className="text-xs text-slate-400">Upgrade to {PLANS[planName]?.name || planName} to unlock</p>
          </div>
        </div>
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex-shrink-0"
        >
          {loading ? 'Processing...' : `Unlock`}
        </button>
      </div>
    );
  }

  // Default variant - full-size, centered
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center relative overflow-hidden group">
      {/* Background Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -z-10 group-hover:bg-blue-500/20 transition-all duration-700" />
      
      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-black/20 border border-slate-700">
        <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>

      <h3 className="text-xl font-bold text-white mb-2">
        {featureName} is locked
      </h3>
      
      <p className="text-slate-400 mb-8 max-w-md mx-auto">
        {description || `Upgrade to the ${PLANS[planName]?.name || planName} plan to unlock this advanced feature and take your resume to the next level.`}
      </p>

      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-blue-500/25 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </>
        ) : (
          <>
            <span>{buttonText || `Unlock for $${PLANS[planName]?.price || ''}/mo`}</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}

