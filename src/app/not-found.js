import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-6 shadow-xl">
        <span className="text-2xl font-bold font-mono text-indigo-400">404</span>
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">Page Not Found</h1>
      <p className="text-sm text-slate-400 mb-8 max-w-md">
        The page you are looking for doesn&apos;t exist or has been moved to another location.
      </p>
      <Link
        href="/dashboard"
        className="btn-primary text-xs sm:text-sm font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
