"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { PLANS } from "@/lib/constants";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

        <div className="container mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-slate-300 mb-8 backdrop-blur-md shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-slate-200">Next-Gen Resume Studio</span>
            <span className="text-slate-500">•</span>
            <span className="text-cyan-400 font-normal">ATS-Optimized</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold mb-6 tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
            Build Resumes That Pass <br />
            <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
              Every ATS Filter
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed font-normal">
            Tailor your experience to any job description in seconds. Engineered with battle-tested ATS parsing templates, precision keyword alignment, and live AI editing.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
            <Link
              href={isAuthenticated ? "/dashboard" : "/login"}
              className="btn-primary w-full sm:w-auto text-sm font-semibold px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              <span>{isAuthenticated ? "Open Studio" : "Build Your Resume Free"}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/templates"
              className="btn-secondary w-full sm:w-auto text-sm font-semibold px-7 py-3.5 rounded-xl flex items-center justify-center gap-2"
            >
              Explore Templates
            </Link>
          </div>

          {/* Free trial strip */}
          <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-4 py-2 rounded-full bg-emerald-500/[0.07] border border-emerald-500/20 text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span><span className="font-semibold text-white">{PLANS.FREE.credits} free AI-tailored resumes</span> daily</span>
            </span>
            <span className="text-slate-600">•</span>
            <span>Saved library included</span>
            <span className="text-slate-600">•</span>
            <span>No credit card required</span>
          </div>

          {/* Quick Metrics */}
          <div className="mt-16 pt-10 border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-3 gap-6 max-w-2xl mx-auto text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">99.4%</div>
              <div className="text-xs text-slate-400 mt-1 font-medium">ATS Parse Rate</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">&lt; 15s</div>
              <div className="text-xs text-slate-400 mt-1 font-medium">Tailoring Speed</div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">6 Pro</div>
              <div className="text-xs text-slate-400 mt-1 font-medium">Certified Templates</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 border-t border-white/[0.06] relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300 mb-3">
              Capabilities
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
              Engineered for Highest Interview Callback Rates
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
              Say goodbye to generic AI slop. Generate structured, keyword-dense resumes that both HR software and engineering managers respect.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "ATS-Safe Typography & Structure",
                description: "Clean single & two-column layouts formatted to guarantee flawless extraction by Workday, Greenhouse, Lever, and Taleo.",
                badge: "Compliance",
                icon: (
                  <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                title: "Role-Specific Tailoring",
                description: "Paste any job description and let AI pinpoint required skills, quantifiable accomplishments, and essential keywords.",
                badge: "AI Powered",
                icon: (
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
              },
              {
                title: "Conversational AI Editing",
                description: "Refine any section by simply prompting: 'Make bullets more metrics-driven' or 'Add TypeScript highlights'.",
                badge: "Interactive",
                icon: (
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ),
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="glass-card p-8 rounded-2xl border border-white/[0.07] hover:border-indigo-500/30 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center group-hover:scale-105 transition-transform">
                      {feature.icon}
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                      {feature.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed font-normal">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Unlock with Pro Section */}
      <section className="py-24 border-t border-white/[0.06] relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-300 mb-3">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Pro Power-Ups
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
              Start Free, Unlock More When You&apos;re Ready
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
              Your {PLANS.FREE.credits} daily free credits cover tailored generation. Pro unlocks the full toolkit.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Custom AI Instructions",
                description: "Steer every generation with your own priorities, keywords, and tone.",
              },
              {
                title: "AI Editor + Versions",
                description: "Refine by chat and keep a version tailored to each application.",
              },
              {
                title: "Cover Letter Generator",
                description: "Targeted letters matched to the same job description.",
              },
              {
                title: "Resume Upload Parsing",
                description: "Import your existing resume — AI extracts every detail instantly.",
              },
            ].map((feature, index) => (
              <Link
                key={index}
                href="/pricing"
                className="glass-card glass-card-interactive p-6 rounded-2xl border border-white/[0.07] group flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    Pro
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5 group-hover:text-amber-300 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-normal">
                  {feature.description}
                </p>
              </Link>
            ))}
          </div>

          {/* Compact Free vs Pro comparison */}
          <div className="mt-10 max-w-3xl mx-auto glass-card rounded-2xl border border-white/[0.08] p-6 sm:p-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-6">
            <div className="flex-1 text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Free</p>
              <p className="text-sm text-slate-300">
                <span className="font-bold text-white">{PLANS.FREE.credits} credits/day</span> — generation + library
              </p>
            </div>
            <div className="hidden sm:block w-px self-stretch bg-white/[0.08]" />
            <div className="flex-1 text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-1">
                {PLANS.PRO.name} — ${PLANS.PRO.price}/{PLANS.PRO.interval}
              </p>
              <p className="text-sm text-slate-300">
                <span className="font-bold text-white">{PLANS.PRO.credits} credits/month</span> — everything unlocked
              </p>
            </div>
            <Link
              href="/pricing"
              className="btn-primary text-xs font-semibold px-6 py-3 rounded-xl shrink-0 text-center"
            >
              Compare Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-24 border-t border-white/[0.06] relative">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-300 mb-3">
                Simple 3-Step Process
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-8">
                From Job Listing to Interview-Ready in Minutes
              </h2>

              <div className="space-y-6">
                {[
                  {
                    step: "01",
                    title: "Store Your Master Resume",
                    desc: "Add your full career history once. Our system maintains your master profile as the single source of truth.",
                  },
                  {
                    step: "02",
                    title: "Paste the Target Job Post",
                    desc: "Our AI extracts core competencies, required experience, and ATS keywords to emphasize.",
                  },
                  {
                    step: "03",
                    title: "Review & Export PDF",
                    desc: "Preview across 6 ATS-safe templates, make any instant edits, and export directly to clean PDF.",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex gap-5 items-start">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-sm font-bold text-indigo-400 shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-white mb-1">{item.title}</h4>
                      <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual preview card */}
            <div className="relative">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 blur-xl opacity-50" />
              <div className="relative glass-card rounded-2xl p-6 border border-white/[0.08] shadow-2xl">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60 inline-block" />
                    <span className="text-xs text-slate-400 font-mono ml-2">resume-studio.ats</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    Match 98%
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-indigo-400 font-semibold">Target:</span>{" "}
                    <span className="text-slate-300">Senior Full-Stack Engineer @ TechCorp</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-cyan-400 font-semibold">Key Highlights:</span>{" "}
                    <span className="text-slate-300">Next.js 16, TypeScript, Distributed Systems, Cloud Architecture</span>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-emerald-300">
                    ✓ 12 relevant ATS keywords successfully integrated
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-white/[0.06] relative">
        <div className="container mx-auto px-6">
          <div className="glass-card rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden border border-white/[0.08]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 rounded-full blur-3xl pointer-events-none -z-10" />
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
              Ready to Upgrade Your Job Search?
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mb-8 max-w-xl mx-auto leading-relaxed">
              Create your tailored resume today. No credit card required to get started.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href={isAuthenticated ? "/dashboard" : "/login"}
                className="btn-primary text-sm font-semibold px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-600/25"
              >
                {isAuthenticated ? "Launch Dashboard" : "Get Started for Free"}
              </Link>
              <Link
                href="/pricing"
                className="btn-secondary text-sm font-semibold px-7 py-3.5 rounded-xl"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
