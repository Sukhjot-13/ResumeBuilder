export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-900/50 py-12 mt-auto">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent mb-4">
              ResumeAI
            </div>
            <p className="text-slate-400 text-sm max-w-xs">
              Build professional, ATS-friendly resumes in minutes with the power of AI.
            </p>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="/features" className="hover:text-blue-400 transition-colors">Features</a></li>
              <li><a href="/templates" className="hover:text-blue-400 transition-colors">Templates</a></li>
              <li><a href="/pricing" className="hover:text-blue-400 transition-colors">Pricing</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="/privacy" className="hover:text-blue-400 transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-blue-400 transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-white/10 pt-8 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} ATS-Friendly Resume Builder. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
