"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PLANS, PERMISSIONS } from "@/lib/constants";
import { checkPermission } from "@/lib/accessControl";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
const router = useRouter();
const pathname = usePathname();
const auth = useAuth();

const handleLogout = async () => {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    // Refresh auth state and redirect
    if (auth.refetch) await auth.refetch();
    router.push("/login");
  }
};

  const [user, setUser] = useState(null);

  useEffect(() => {
    if (auth.isAuthenticated) {
      fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => setUser(data))
        .catch(err => console.error('Failed to fetch user profile', err));
    }
  }, [auth.isAuthenticated]);

  return (
    <header className="fixed top-0 w-full z-50 glass border-b border-white/10">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
          ResumeAI
        </Link>

        {/* Desktop Nav */}
        {!auth.loading && !auth.isAuthenticated && (
          <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-300">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/templates" className="hover:text-white transition-colors">Templates</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          </nav>
        )}

        {/* CTA & Mobile Toggle */}
        <div className="flex items-center gap-4">
          {!auth.loading && (auth.isAuthenticated ? (
            <div className="hidden md:flex gap-3 items-center">
              {/* Credit Badge */}
              {user && (
                 <div className="px-3 py-1.5 text-xs font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center gap-1.5">
                   <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                   </svg>
                   {checkPermission(user, PERMISSIONS.UNLIMITED_CREDITS) ? 'Unlimited' : `${Math.max(0, (user.role === 99 ? PLANS.PRO.credits : PLANS.FREE.credits) - (user.creditsUsed || 0))} Left`}
                 </div>
              )}
              
              <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white glass rounded-lg transition-colors hover:bg-white/5 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </Link>
              {user && checkPermission(user, PERMISSIONS.ACCESS_ADMIN_PANEL) && (
                <Link href="/admin/dashboard" className="px-4 py-2 text-sm font-medium text-purple-300 hover:text-white glass rounded-lg transition-colors hover:bg-purple-500/20 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  Admin
                </Link>
              )}
              <Link href="/profile" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white glass rounded-lg transition-colors hover:bg-white/5 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </Link>
              <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 glass rounded-lg transition-colors hover:bg-red-500/10 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          ) : (
            <Link href="/login" className="hidden md:block px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40">
              Get Started
            </Link>
          ))}
          
          <button 
            className="md:hidden text-slate-300 hover:text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"} />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {!auth.loading && (auth.isAuthenticated ? (
          isMenuOpen && (
            <div className="md:hidden glass border-t border-white/10 p-4 absolute w-full">
              <nav className="flex flex-col gap-4 text-sm font-medium text-slate-300">
                <Link href="/dashboard" className="hover:text-white transition-colors" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
                <Link href="/profile" className="hover:text-white transition-colors" onClick={() => setIsMenuOpen(false)}>Profile</Link>
                <button onClick={handleLogout} className="hover:text-white transition-colors text-left">Logout</button>
              </nav>
            </div>
          )
        ) : (
          isMenuOpen && (
            <div className="md:hidden glass border-t border-white/10 p-4 absolute w-full">
              <nav className="flex flex-col gap-4 text-slate-300">
                <Link href="/" className="hover:text-white transition-colors" onClick={() => setIsMenuOpen(false)}>Home</Link>
                <Link href="/templates" className="hover:text-white transition-colors" onClick={() => setIsMenuOpen(false)}>Templates</Link>
                <Link href="/login" className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 text-center" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
              </nav>
            </div>
          )
        ))}
    </header>
  );
}
