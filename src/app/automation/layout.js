"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PERMISSIONS } from "@/lib/constants";
import PermissionGate from "@/components/common/PermissionGate";

const NAV_ITEMS = [
  { href: "/automation", label: "Dashboard", permission: PERMISSIONS.VIEW_AUTOMATION },
  { href: "/automation/jobs", label: "Jobs", permission: PERMISSIONS.VIEW_AUTOMATION },
  { href: "/automation/applications", label: "Applications", permission: PERMISSIONS.VIEW_APPLICATIONS },
  { href: "/automation/settings", label: "Settings", permission: PERMISSIONS.VIEW_AUTOMATION },
];

export default function AutomationLayout({ children }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <PermissionGate user={user} permission={PERMISSIONS.VIEW_AUTOMATION}>
      <div className="min-h-screen bg-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-900 to-slate-900 -z-10" />
        <nav className="border-b border-white/5 bg-slate-900/80 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center gap-6 h-12">
              <span className="font-semibold text-sm text-white">Automation</span>
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm transition-colors ${
                      isActive
                        ? "text-blue-400 font-medium"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </div>
    </PermissionGate>
  );
}
