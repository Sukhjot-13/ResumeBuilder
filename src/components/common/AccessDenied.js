'use client';

/**
 * A simple access denied component that does not prompt for upgrades.
 * Use this when you want to show a restriction without an upsell flow.
 * 
 * @param {object} props
 * @param {string} props.title - Title of the message (default: "Access Restricted")
 * @param {string} props.message - Description text (default: "You do not have permission to access this feature.")
 * @param {React.ReactNode} props.icon - Optional custom icon
 */
export default function AccessDenied({ 
  title = "Access Restricted", 
  message = "You do not have permission to access this content.",
  icon
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center max-w-lg mx-auto">
      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-black/20 border border-slate-700 text-red-400">
        {icon || (
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )}
      </div>

      <h3 className="text-xl font-bold text-white mb-2">
        {title}
      </h3>
      
      <p className="text-slate-400">
        {message}
      </p>
    </div>
  );
}
