"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

const QUICK_LINKS = [
  { href: "/automation/settings", label: "Configure Settings", desc: "Set up job search criteria, gatekeeper rules, and schedule" },
  { href: "/automation/settings/accounts", label: "Connect Accounts", desc: "Add LinkedIn and Indeed session cookies" },
  { href: "/api-keys", label: "Manage API Keys", desc: "Create API keys for the Automation Worker" },
];

export default function AutomationDashboard() {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Job Automation
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Automate your job search. Set up your criteria, connect your accounts, and let the system find and apply to jobs for you.
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-5 rounded-2xl border border-white/5">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Status</p>
          <p className="text-lg font-semibold text-yellow-400 mt-1">Not Configured</p>
          <p className="text-xs text-slate-500 mt-1">Set up settings first</p>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-white/5">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Today</p>
          <p className="text-lg font-semibold text-white mt-1">0</p>
          <p className="text-xs text-slate-500 mt-1">applications</p>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-white/5">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">This Week</p>
          <p className="text-lg font-semibold text-white mt-1">0</p>
          <p className="text-xs text-slate-500 mt-1">applications</p>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-white/5">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Worker</p>
          <p className="text-lg font-semibold text-slate-400 mt-1">Offline</p>
          <p className="text-xs text-slate-500 mt-1">not deployed</p>
        </div>
      </div>

      {/* Quick Links */}
      <h2 className="text-lg font-semibold text-white mb-4">Get Started</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="glass-card p-5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all"
          >
            <h3 className="font-medium text-blue-400 mb-1">{link.label}</h3>
            <p className="text-sm text-slate-400">{link.desc}</p>
          </Link>
        ))}
      </div>

      {/* Info Section */}
      <div className="glass-card p-5 rounded-2xl border border-blue-500/20">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <h3 className="font-medium text-slate-200 text-sm">How it works</h3>
        </div>
        <ol className="list-decimal list-inside text-sm text-slate-400 space-y-1 ml-1">
          <li>Configure your job search criteria (titles, locations, salary)</li>
          <li>Connect your LinkedIn/Indeed accounts by pasting session cookies</li>
          <li>Set up gatekeeper rules to filter which jobs to apply to</li>
          <li>Create an API key for the Automation Worker</li>
          <li>Deploy the Worker to Render and enable the schedule</li>
        </ol>
      </div>
    </div>
  );
}
