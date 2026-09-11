'use client';

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const TEMPLATES = [
  {
    name: "Professional",
    description:
      "Centered header, bold uppercase section titles with a clean divider rule, and compact bullet spacing. A battle-tested choice for corporate, finance, and engineering roles.",
    tag: "Most Popular",
    color: "from-indigo-500 to-cyan-400",
    atsScore: "100%",
    layout: "Single Column",
  },
  {
    name: "Modern",
    description:
      "High-contrast two-column structure with a dedicated sidebar for competencies, certifications, and contact details, keeping your impact front and center.",
    tag: "Two-Column",
    color: "from-cyan-500 to-emerald-400",
    atsScore: "99%",
    layout: "Two Column",
  },
  {
    name: "Classic",
    description:
      "Traditional single-column layout in standard typography with chronological section ordering. Trusted by conservative industries like banking, legal, and government.",
    tag: "Executive",
    color: "from-amber-400 to-orange-400",
    atsScore: "100%",
    layout: "Single Column",
  },
  {
    name: "Classic 2",
    description:
      "A variant of our Classic template with an inverted section order — competencies and certifications appear directly under the summary for rapid recruiter scanning.",
    tag: "Skills First",
    color: "from-violet-400 to-pink-400",
    atsScore: "100%",
    layout: "Single Column",
  },
  {
    name: "Creative",
    description:
      "Refined serif accents with a centered header and bordered container. Designed to stand out in creative tech, marketing, and product design roles.",
    tag: "Distinctive",
    color: "from-rose-400 to-amber-300",
    atsScore: "98%",
    layout: "Framed",
  },
  {
    name: "Simple",
    description:
      "Minimalist styling with zero decorative elements and dash-style bullets. Maximum parsing reliability for legacy applicant tracking systems.",
    tag: "Ultra Clean",
    color: "from-slate-400 to-slate-200",
    atsScore: "100%",
    layout: "Minimalist",
  },
];

export default function TemplatesPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <section className="relative pt-20 pb-14 overflow-hidden text-center">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none -z-10" />

        <div className="container mx-auto px-6 relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300 mb-4">
            ATS-Certified Templates
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight text-white">
            Designed for <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">Robots & Recruiters</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Every template is rigorously validated against top applicant tracking engines while maintaining executive visual polish. Switch between them instantly at export time.
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="container mx-auto px-6 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TEMPLATES.map((t) => (
            <div
              key={t.name}
              className="glass-card p-7 rounded-2xl border border-white/[0.07] hover:border-indigo-500/30 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.04] text-slate-300 border border-white/[0.07]">
                    {t.tag}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    <span>{t.atsScore} ATS</span>
                  </div>
                </div>

                {/* Minimal preview mockup header */}
                <div className="h-20 rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 mb-5 flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="h-2 w-20 bg-white/20 rounded" />
                    <div className="h-1.5 w-12 bg-white/10 rounded" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full bg-white/[0.07] rounded" />
                    <div className="h-1.5 w-4/5 bg-white/[0.05] rounded" />
                  </div>
                </div>

                <h2 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                  {t.name}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {t.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">{t.layout}</span>
                <Link
                  href={isAuthenticated ? "/dashboard" : "/login"}
                  className="text-xs font-semibold text-indigo-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                >
                  <span>Use in Studio</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Call to action */}
        <div className="glass-card rounded-3xl p-10 mt-16 text-center relative overflow-hidden border border-white/[0.08]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[450px] h-[180px] bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 rounded-full blur-3xl pointer-events-none -z-10" />
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
            Switch Between All 6 Templates Freely
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mb-6 max-w-lg mx-auto leading-relaxed">
            Generate your resume once, then download or preview in every format to see which best matches your target company&apos;s culture.
          </p>
          <Link
            href={isAuthenticated ? "/dashboard" : "/login"}
            className="btn-primary text-xs sm:text-sm font-semibold px-7 py-3 rounded-xl shadow-lg shadow-indigo-600/25 inline-flex items-center gap-2"
          >
            <span>{isAuthenticated ? "Go to Resume Studio" : "Get Started for Free"}</span>
            <span>→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
