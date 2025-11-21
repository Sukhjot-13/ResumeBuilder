'use client';

import Link from 'next/link';

export default function CheckoutCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="text-center space-y-6 p-8 glass rounded-2xl max-w-md mx-4">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">
          Payment Cancelled
        </h1>
        
        <p className="text-slate-400">
          Your payment was cancelled and no charges were made. You can try again whenever you're ready.
        </p>

        <div className="pt-4 flex gap-4 justify-center">
          <Link 
            href="/pricing" 
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors border border-white/10"
          >
            View Plans
          </Link>
          <Link 
            href="/dashboard" 
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
