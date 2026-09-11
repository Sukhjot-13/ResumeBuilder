"use client";

import { useState } from "react";

/**
 * JobDescriptionInput
 *
 * Props:
 *   jobDescription     {string}   - current value
 *   setJobDescription  {function} - setter
 *   loading            {boolean}  - show skeleton while profile is fetching
 */
export default function JobDescriptionInput({
  jobDescription,
  setJobDescription,
  loading = false,
}) {
  const [pasteStatus, setPasteStatus] = useState(false);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setJobDescription(text);
        setPasteStatus(true);
        setTimeout(() => setPasteStatus(false), 1500);
      }
    } catch {
      // Clipboard access might be denied by browser permissions
    }
  };

  const wordCount = jobDescription.trim() ? jobDescription.trim().split(/\s+/).length : 0;
  const charCount = jobDescription.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Target Job Description
          <span className="text-rose-400">*</span>
        </label>

        <div className="flex items-center gap-2">
          {jobDescription && (
            <button
              type="button"
              onClick={() => setJobDescription("")}
              className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={handlePaste}
            className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08] transition-all flex items-center gap-1"
          >
            <svg className="w-3 h-3 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {pasteStatus ? "Pasted!" : "Paste"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2 p-4 rounded-xl bg-slate-800/40 border border-white/[0.06]">
          <div className="h-3.5 bg-slate-700/60 rounded w-3/4" />
          <div className="h-3.5 bg-slate-700/60 rounded w-full" />
          <div className="h-3.5 bg-slate-700/60 rounded w-5/6" />
          <div className="h-3.5 bg-slate-700/60 rounded w-2/3" />
        </div>
      ) : (
        <div className="relative">
          <textarea
            className="w-full h-36 app-input p-3.5 text-xs sm:text-sm resize-none leading-relaxed"
            placeholder="Paste the target job description or paste requirements here (responsibilities, skills, qualifications)..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
          <div className="absolute bottom-2.5 right-3 text-[10px] text-slate-400 pointer-events-none select-none">
            {wordCount} words &middot; {charCount} chars
          </div>
        </div>
      )}
    </div>
  );
}