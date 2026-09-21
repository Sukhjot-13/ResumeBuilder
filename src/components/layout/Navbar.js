"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PLANS, ROLES, PERMISSIONS } from "@/lib/constants";
import { checkPermission } from "@/lib/accessControl";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const user = auth.isAuthenticated ? auth.user : null;

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      if (auth.refetch) await auth.refetch();
      router.push("/login");
    }
  };

  const remainingCredits = user
    ? checkPermission(user, PERMISSIONS.UNLIMITED_CREDITS)
      ? "Unlimited"
      : typeof user.creditsRemaining === "number"
      ? user.creditsRemaining
      : Math.max(
          0,
          (user.role === ROLES.SUBSCRIBER ? PLANS.PRO.credits : PLANS.FREE.credits) -
            (user.creditsUsed || 0)
        )
    : 0;

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", permission: null },
    { href: "/cover-letters", label: "Cover Letters", permission: PERMISSIONS.VIEW_COVER_LETTERS },
    { href: "/ai-edit", label: "AI Studio", permission: PERMISSIONS.ACCESS_AI_EDIT_PAGE },
    { href: "/resume-history", label: "History", permission: PERMISSIONS.VIEW_OWN_RESUMES },
  ];

  return (
    <header className="fixed top-0 w-full z-50 glass border-b border-white/[0.08]">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-sm shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all">
            <div className="w-full h-full bg-[#0e1526] rounded-[7px] flex items-center justify-center">
              <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="12" y1="18" x2="12" y2="12"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold tracking-tight text-white group-hover:text-cyan-300 transition-colors">
              ResumeForge
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              ATS
            </span>
          </div>
        </Link>

        {/* Public Desktop Nav */}
        {!auth.loading && !auth.isAuthenticated && (
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link
              href="/"
              className={`transition-colors hover:text-white ${pathname === "/" ? "text-white font-semibold" : ""}`}
            >
              Home
            </Link>
            <Link
              href="/templates"
              className={`transition-colors hover:text-white ${pathname === "/templates" ? "text-white font-semibold" : ""}`}
            >
              Templates
            </Link>
            <Link
              href="/pricing"
              className={`transition-colors hover:text-white ${pathname === "/pricing" ? "text-white font-semibold" : ""}`}
            >
              Pricing
            </Link>
          </nav>
        )}

        {/* Authenticated Desktop Nav (Segmented Pill) */}
        {!auth.loading && auth.isAuthenticated && (
          <nav className="hidden md:flex items-center p-1 rounded-xl bg-slate-900/80 border border-white/[0.08] shadow-inner">
            {navLinks.map((item) => {
              if (item.permission && (!user || !checkPermission(user, item.permission))) {
                return null;
              }
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {user && checkPermission(user, PERMISSIONS.ACCESS_ADMIN_PANEL) && (
              <Link
                href="/admin/dashboard"
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  pathname.startsWith("/admin")
                    ? "bg-purple-600 text-white shadow-sm shadow-purple-600/30 font-semibold"
                    : "text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                }`}
              >
                Admin
              </Link>
            )}
          </nav>
        )}

        {/* Right CTA / User Status */}
        <div className="flex items-center gap-3">
          {!auth.loading &&
            (auth.isAuthenticated ? (
              <div className="hidden md:flex items-center gap-3">
                {/* Credit Badge */}
                {user && (
                  <div
                    className="px-2.5 py-1 text-xs font-medium text-cyan-300 bg-cyan-950/40 border border-cyan-500/20 rounded-full flex items-center gap-1.5 shadow-sm"
                    title="Available Generation Credits"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                    <span className="font-semibold text-white">{remainingCredits}</span>
                    <span className="text-cyan-400/80 text-[11px]">credits</span>
                  </div>
                )}

                {/* Profile Link */}
                <Link
                  href="/profile"
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    pathname === "/profile"
                      ? "bg-white/[0.08] text-white border-indigo-500/40"
                      : "text-slate-300 hover:text-white border-white/[0.08] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                    {user?.name ? user.name[0] : "U"}
                  </div>
                  <span>{user?.name?.split(" ")[0] || "Profile"}</span>
                </Link>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-2 text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
                  aria-label="Logout"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden md:flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-primary rounded-lg transition-all"
              >
                <span>Get Started</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"} />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden glass border-t border-white/[0.08] p-5 shadow-2xl space-y-4">
          {!auth.loading && auth.isAuthenticated ? (
            <nav className="flex flex-col gap-2">
              <div className="pb-3 mb-1 border-b border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-xs font-bold text-white">
                    {user?.name ? user.name[0] : "U"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{user?.name || "User"}</p>
                    <p className="text-[11px] text-slate-400">{user?.email}</p>
                  </div>
                </div>
                <div className="text-xs px-2.5 py-1 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-500/20">
                  {remainingCredits} credits
                </div>
              </div>

              <Link
                href="/dashboard"
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  pathname === "/dashboard" ? "bg-indigo-600/30 text-white font-medium" : "text-slate-300 hover:bg-white/[0.04]"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              {user && checkPermission(user, PERMISSIONS.VIEW_COVER_LETTERS) && (
                <Link
                  href="/cover-letters"
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    pathname.startsWith("/cover-letters") ? "bg-indigo-600/30 text-white font-medium" : "text-slate-300 hover:bg-white/[0.04]"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Cover Letters
                </Link>
              )}
              {user && checkPermission(user, PERMISSIONS.ACCESS_AI_EDIT_PAGE) && (
                <Link
                  href="/ai-edit"
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    pathname === "/ai-edit" ? "bg-indigo-600/30 text-white font-medium" : "text-slate-300 hover:bg-white/[0.04]"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  AI Studio
                </Link>
              )}
              {user && checkPermission(user, PERMISSIONS.VIEW_OWN_RESUMES) && (
                <Link
                  href="/resume-history"
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    pathname.startsWith("/resume-history") ? "bg-indigo-600/30 text-white font-medium" : "text-slate-300 hover:bg-white/[0.04]"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  History
                </Link>
              )}
              {user && checkPermission(user, PERMISSIONS.ACCESS_ADMIN_PANEL) && (
                <Link
                  href="/admin/dashboard"
                  className="px-3 py-2 text-sm rounded-lg text-purple-300 hover:bg-purple-500/10 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Admin Panel
                </Link>
              )}
              <Link
                href="/profile"
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  pathname === "/profile" ? "bg-indigo-600/30 text-white font-medium" : "text-slate-300 hover:bg-white/[0.04]"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Profile & Settings
              </Link>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleLogout();
                }}
                className="mt-2 px-3 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-left flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </nav>
          ) : (
            <nav className="flex flex-col gap-3">
              <Link
                href="/"
                className="px-3 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-white/[0.04]"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/templates"
                className="px-3 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-white/[0.04]"
                onClick={() => setIsMenuOpen(false)}
              >
                Templates
              </Link>
              <Link
                href="/pricing"
                className="px-3 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-white/[0.04]"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/login"
                className="mt-2 text-center py-2.5 text-sm font-semibold text-white btn-primary rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Get Started
              </Link>
            </nav>
          )}
        </div>
      )}
    </header>
  );
}

