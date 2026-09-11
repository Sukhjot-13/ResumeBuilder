import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#070b12] py-14 mt-auto">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="col-span-1 md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px]">
                <div className="w-full h-full bg-[#0e1526] rounded-[7px] flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                </div>
              </div>
              <span className="text-base font-bold tracking-tight text-white">ResumeForge</span>
            </div>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
              Engineered for job seekers who want real results. High-compliance ATS resumes and precision AI tailoring.
            </p>
          </div>
          
          <div>
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">Product</h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><Link href="/#features" className="hover:text-cyan-400 transition-colors">Features</Link></li>
              <li><Link href="/templates" className="hover:text-cyan-400 transition-colors">Resume Templates</Link></li>
              <li><Link href="/pricing" className="hover:text-cyan-400 transition-colors">Pricing & Plans</Link></li>
              <li><Link href="/dashboard" className="hover:text-cyan-400 transition-colors">Workspace</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">Trust & Legal</h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><Link href="/privacy" className="hover:text-cyan-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-cyan-400 transition-colors">Terms of Service</Link></li>
              <li><span className="text-slate-500 text-xs">ATS Standard ISO-compliant formatting</span></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-xs">
          <p>&copy; {new Date().getFullYear()} ResumeForge AI. All rights reserved.</p>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>All AI systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

