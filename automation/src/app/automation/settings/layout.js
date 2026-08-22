"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SETTINGS_NAV = [
  { href: "/automation/settings", label: "Overview" },
  { href: "/automation/settings/accounts", label: "Accounts" },
  { href: "/automation/settings/criteria", label: "Criteria" },
  { href: "/automation/settings/gatekeeper", label: "Gatekeeper" },
  { href: "/automation/settings/scheduler", label: "Scheduler" },
  { href: "/api-keys", label: "API Keys" },
];

export default function SettingsLayout({ children }) {
  const pathname = usePathname();

  return (
    <div>
      <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-8">
        Settings
      </h1>
      <div className="flex gap-8">
        <nav className="w-48 shrink-0 space-y-1">
          {SETTINGS_NAV.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block text-sm px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-500/20 text-blue-400 font-medium"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
