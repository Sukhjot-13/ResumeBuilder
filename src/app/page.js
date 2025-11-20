"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900 -z-10" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/10 rounded-full blur-3xl -z-10 animate-pulse-glow" />
        
        <div className="container mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-blue-300 mb-8 animate-float">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            New: AI Resume Editor Available
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            Build Your <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Dream Career</span> <br />
            With AI Precision
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Create ATS-friendly resumes tailored to your target job descriptions in seconds. 
            Powered by advanced AI to help you stand out.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/login" className="px-8 py-4 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-1">
              Create My Resume
            </Link>
            <Link href="/templates" className="px-8 py-4 text-base font-semibold text-slate-300 hover:text-white glass rounded-xl transition-all hover:bg-white/5">
              View Templates
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-slate-900/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose ResumeAI?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Our platform combines cutting-edge AI with professional design to give you the competitive edge.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "ATS Optimization",
                description: "Ensure your resume gets past automated filters with our ATS-friendly templates and content.",
                icon: (
                  <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )
              },
              {
                title: "AI Content Generation",
                description: "Generate tailored bullet points and summaries based on your job description instantly.",
                icon: (
                  <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )
              },
              {
                title: "Real-time Editing",
                description: "Edit your resume with natural language commands. Just ask the AI to make changes.",
                icon: (
                  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                )
              }
            ].map((feature, index) => (
              <div key={index} className="glass-card p-8 rounded-2xl hover:bg-white/5 transition-colors group">
                <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-violet-900/20 via-slate-900 to-slate-900 -z-10" />
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Three Steps to Your <br />
                <span className="text-blue-400">Perfect Resume</span>
              </h2>
              <div className="space-y-8">
                {[
                  { step: "01", title: "Upload or Create", desc: "Upload your existing resume or start from scratch with our easy builder." },
                  { step: "02", title: "Tailor with AI", desc: "Paste the job description and let our AI optimize your content for the role." },
                  { step: "03", title: "Download & Apply", desc: "Choose a template, export as PDF, and apply with confidence." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="text-3xl font-bold text-slate-700">{item.step}</div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">{item.title}</h4>
                      <p className="text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-violet-500 rounded-2xl blur-2xl opacity-20 animate-pulse-glow" />
              <div className="relative glass-card rounded-2xl p-6 border border-white/10 aspect-square flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium text-slate-300">AI is analyzing your resume...</p>
                  <div className="mt-4 w-48 h-2 bg-slate-700 rounded-full mx-auto overflow-hidden">
                    <div className="h-full bg-blue-500 w-2/3 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="glass-card rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/10 to-violet-600/10 -z-10" />
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Land Your Dream Job?</h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              Join thousands of job seekers who have successfully optimized their resumes with our AI-powered builder.
            </p>
            <Link href="/login" className="inline-block px-8 py-4 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40">
              Get Started for Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
