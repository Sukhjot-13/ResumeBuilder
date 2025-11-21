'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CheckoutSuccess() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard after 5 seconds
    const timeout = setTimeout(() => {
      router.push('/dashboard');
    }, 5000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="text-center space-y-6 p-8 glass rounded-2xl max-w-md mx-4">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
          Payment Successful!
        </h1>
        
        <p className="text-slate-400">
          Thank you for your purchase. Your account has been upgraded and credits have been added.
        </p>

        <div className="pt-4">
          <Link 
            href="/dashboard" 
            className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
        
        <p className="text-xs text-slate-500">
          Redirecting automatically in 5 seconds...
        </p>
      </div>
    </div>
  );
}
