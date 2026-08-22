"use client";

import Link from "next/link";

const SETTINGS_CARDS = [
  { href: "/automation/settings/accounts", title: "Accounts", desc: "Connect LinkedIn and Indeed by pasting session cookies. Cookies are encrypted before storage." },
  { href: "/automation/settings/criteria", title: "Job Search Criteria", desc: "Set target job titles, locations, remote preferences, and salary range." },
  { href: "/automation/settings/gatekeeper", title: "Gatekeeper Rules", desc: "Configure which jobs the AI should apply to, skip, or flag for review." },
  { href: "/automation/settings/scheduler", title: "Scheduler", desc: "Set automation schedule: time windows, daily caps, and delays between applications." },
  { href: "/automation/settings/api-keys", title: "API Keys", desc: "Generate API keys for the Automation Worker to call this app's API." },
  { href: "/automation/settings/apply-instructions", title: "Apply Instructions", desc: "Write plain-English instructions for the AI to follow when filling forms." },
  { href: "/automation/settings/notifications", title: "Notifications", desc: "Configure which events trigger email notifications." },
];

export default function SettingsOverviewPage() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        Configure your job automation system. Each section below handles a different part of the setup.
      </p>

      <div className="grid grid-cols-1 gap-4">
        {SETTINGS_CARDS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="glass-card p-5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all"
          >
            <h3 className="font-medium text-blue-400 mb-1">{item.title}</h3>
            <p className="text-sm text-slate-400">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
