"use client";

import { checkPermission, getPermissionMetadata } from "@/lib/accessControl";
import { PERMISSIONS } from "@/lib/constants";

/**
 * SpecialInstructionsInput
 *
 * Always rendered for every user — never conditionally hidden.
 * Free users see the field and generate button, but both are locked/disabled.
 * A lock badge communicates the upgrade path clearly.
 */
export default function SpecialInstructionsInput({
  specialInstructions,
  setSpecialInstructions,
  handleGenerateResume,
  generating,
  profile,
  loading = false,
}) {
  const canUseSpecialInstructions =
    profile && checkPermission(profile, PERMISSIONS.USE_SPECIAL_INSTRUCTIONS);

  const canGenerate =
    profile && checkPermission(profile, PERMISSIONS.GENERATE_RESUME);

  const siMeta = getPermissionMetadata(PERMISSIONS.USE_SPECIAL_INSTRUCTIONS);
  const genMeta = getPermissionMetadata(PERMISSIONS.GENERATE_RESUME);

  return (
    <div className="space-y-4">
      {/* ── Special Instructions ─────────────────────────── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Special Instructions
            <span className="text-[11px] text-slate-500 font-normal lowercase">(optional)</span>
          </label>

          {/* Pro badge — shown only for free users */}
          {!loading && !canUseSpecialInstructions && (
            <span className="flex items-center gap-1 text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/25 rounded-full px-2 py-0.5">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {siMeta?.requiredPlan ?? "Pro"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="animate-pulse space-y-2 p-3 rounded-xl bg-slate-800/40 border border-white/[0.06]">
            <div className="h-3 bg-slate-700/60 rounded w-full" />
            <div className="h-3 bg-slate-700/60 rounded w-4/5" />
          </div>
        ) : (
          <div className="relative group">
            <textarea
              className={`w-full h-20 p-3 rounded-xl text-xs sm:text-sm resize-none transition-all leading-relaxed ${
                canUseSpecialInstructions
                  ? "app-input"
                  : "bg-slate-900/40 border border-white/[0.06] text-slate-500 cursor-not-allowed select-none focus:outline-none"
              }`}
              placeholder={
                canUseSpecialInstructions
                  ? "e.g. Focus on leadership impact, emphasize AWS and React, keep length concise..."
                  : "Upgrade to Pro to customize tailoring with specific instructions..."
              }
              value={canUseSpecialInstructions ? specialInstructions : ""}
              onChange={(e) =>
                canUseSpecialInstructions && setSpecialInstructions(e.target.value)
              }
              readOnly={!canUseSpecialInstructions}
              aria-label="Special instructions"
            />

            {/* Subtle lock notice overlay */}
            {!canUseSpecialInstructions && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl pointer-events-none bg-slate-950/20 backdrop-blur-[1px]">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/90 border border-amber-500/20 shadow-lg text-[11px] text-slate-300">
                  <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Unlocked with <span className="text-amber-400 font-semibold">{siMeta?.requiredPlan ?? "Pro"}</span></span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Generate Button ───────────────────────────────── */}
      {loading ? (
        <div className="animate-pulse h-11 bg-slate-800/60 rounded-xl" />
      ) : canGenerate ? (
        <button
          onClick={handleGenerateResume}
          disabled={generating}
          className="w-full relative overflow-hidden btn-primary py-3 px-5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
        >
          {generating ? (
            <>
              <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Tailoring Resume with AI...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Generate Tailored Resume</span>
            </>
          )}
        </button>
      ) : (
        /* Free user locked generate state */
        <div className="space-y-1.5">
          <button
            disabled
            className="w-full bg-slate-800/50 text-slate-500 font-medium py-3 px-5 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed text-xs sm:text-sm border border-white/[0.06]"
            title={`Upgrade to ${genMeta?.requiredPlan ?? "Pro"} to generate resumes`}
          >
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Generate Tailored Resume
          </button>
          <p className="text-[11px] text-center text-slate-500">
            Requires <span className="text-amber-400 font-medium">{genMeta?.requiredPlan ?? "Pro"}</span> plan to generate resumes
          </p>
        </div>
      )}
    </div>
  );
}