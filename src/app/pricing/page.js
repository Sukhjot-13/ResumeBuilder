'use client';

import { useState } from 'react';
import { PLANS } from '@/lib/constants';

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (planName) => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add Authorization header if you have the token in localStorage or cookie
          // For now, we assume the API handles cookie-based auth or we need to pass it
          // If using cookies, fetch automatically sends them if same-origin.
          // But our API checks Authorization header in one place.
          // Let's assume we need to pass it if we stored it.
          // If we rely on cookies, we should update API to check cookies too.
          // The API I wrote checks header. I should update it to check cookie too or pass header here.
          // For simplicity, let's assume we rely on cookies and I'll update API to check cookie if header missing.
        },
        body: JSON.stringify({ planName }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Something went wrong');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Simple, transparent pricing
        </h2>
        <p className="mt-4 text-xl text-gray-600">
          Choose the plan that fits your needs.
        </p>
      </div>

      <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-2">
        {/* Free Plan */}
        <div className="border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200 bg-white">
          <div className="p-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">{PLANS.FREE.name}</h2>
            <p className="mt-4 text-sm text-gray-500">Basic access for everyone.</p>
            <p className="mt-8">
              <span className="text-4xl font-extrabold text-gray-900">${PLANS.FREE.price}</span>
              <span className="text-base font-medium text-gray-500">/{PLANS.FREE.interval}</span>
            </p>
            <button
              disabled
              className="mt-8 block w-full bg-gray-100 border border-transparent rounded-md py-2 text-sm font-semibold text-gray-400 text-center cursor-not-allowed"
            >
              Current Plan
            </button>
          </div>
          <div className="pt-6 pb-8 px-6">
            <h3 className="text-xs font-medium text-gray-900 tracking-wide uppercase">What's included</h3>
            <ul className="mt-6 space-y-4">
              <li className="flex space-x-3">
                <span className="text-green-500">✓</span>
                <span className="text-gray-500">{PLANS.FREE.credits} Credits / Day</span>
              </li>
              <li className="flex space-x-3">
                <span className="text-green-500">✓</span>
                <span className="text-gray-500">Basic Resume Templates</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Pro Plan */}
        <div className="border border-indigo-200 rounded-lg shadow-sm divide-y divide-gray-200 bg-white ring-2 ring-indigo-500">
          <div className="p-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">{PLANS.PRO.name}</h2>
            <p className="mt-4 text-sm text-gray-500">For serious job seekers.</p>
            <p className="mt-8">
              <span className="text-4xl font-extrabold text-gray-900">${PLANS.PRO.price}</span>
              <span className="text-base font-medium text-gray-500">/{PLANS.PRO.interval}</span>
            </p>
            <button
              onClick={() => handleUpgrade('PRO')}
              disabled={loading}
              className="mt-8 block w-full bg-indigo-600 border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-indigo-700"
            >
              {loading ? 'Processing...' : 'Upgrade to Pro'}
            </button>
          </div>
          <div className="pt-6 pb-8 px-6">
            <h3 className="text-xs font-medium text-gray-900 tracking-wide uppercase">What's included</h3>
            <ul className="mt-6 space-y-4">
              <li className="flex space-x-3">
                <span className="text-green-500">✓</span>
                <span className="text-gray-500">{PLANS.PRO.credits} Credits / Month</span>
              </li>
              <li className="flex space-x-3">
                <span className="text-green-500">✓</span>
                <span className="text-gray-500">Premium Templates</span>
              </li>
              <li className="flex space-x-3">
                <span className="text-green-500">✓</span>
                <span className="text-gray-500">AI Resume Editing</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
