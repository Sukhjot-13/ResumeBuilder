"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 w-full z-50 glass border-b border-white/10">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
          ResumeAI
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-300">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <Link href="/templates" className="hover:text-white transition-colors">Templates</Link>
        </nav>

        {/* CTA & Mobile Toggle */}
        <div className="flex items-center gap-4">
          <Link href="/login" className="hidden md:block px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40">
            Get Started
          </Link>
          
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
      {isMenuOpen && (
        <div className="md:hidden glass border-t border-white/10 p-4 absolute w-full">
          <nav className="flex flex-col gap-4 text-sm font-medium text-slate-300">
            <Link href="/" className="hover:text-white transition-colors" onClick={() => setIsMenuOpen(false)}>Home</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
            <Link href="/templates" className="hover:text-white transition-colors" onClick={() => setIsMenuOpen(false)}>Templates</Link>
            <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
