"use client";

import { checkPermission, getPermissionMetadata } from "@/lib/accessControl";
import { PERMISSIONS } from "@/lib/constants";

/**
 * SpecialInstructionsInput
 *
 * Always rendered for every user — never conditionally hidden.
 * Free users see the field and generate button, but both are locked/disabled.
 * A lock badge communicates the upgrade path clearly.
 *
 * Props:
 *   specialInstructions     {string}   - current value
 *   setSpecialInstructions  {function} - setter (no-op for free users, locked UI)
 *   handleGenerateResume    {function} - called on generate button click
 *   generating              {boolean}  - whether generation is in progress
 *   profile                 {object}   - user profile (null while loading)
 *   loading                 {boolean}  - show skeleton while profile loads
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
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg space-y-4">
      {/* ── Special Instructions ─────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Special Instructions
          </h2>

          {/* Pro badge — shown only for free users */}
          {!loading && !canUseSpecialInstructions && (
            <span className="flex items-center gap-1 text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full px-2.5 py-0.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {siMeta?.requiredPlan ?? "Pro"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-700 rounded w-full" />
            <div className="h-4 bg-gray-700 rounded w-4/5" />
            <div className="h-4 bg-gray-700 rounded w-3/4" />
          </div>
        ) : (
          <div className="relative">
            <textarea
              className={`w-full h-24 p-4 rounded-lg text-sm resize-none transition-colors focus:outline-none focus:ring-2
                ${canUseSpecialInstructions
                  ? "bg-gray-700 text-white focus:ring-purple-500 placeholder-gray-500"
                  : "bg-gray-700/40 text-gray-500 cursor-not-allowed focus:ring-0 placeholder-gray-600 select-none"
                }`}
              placeholder={
                canUseSpecialInstructions
                  ? "e.g. Focus on leadership roles, highlight React.js experience…"
                  : "Upgrade to Pro to use custom instructions…"
              }
              value={canUseSpecialInstructions ? specialInstructions : ""}
              onChange={(e) =>
                canUseSpecialInstructions && setSpecialInstructions(e.target.value)
              }
              readOnly={!canUseSpecialInstructions}
              aria-label="Special instructions"
            />

            {/* Lock overlay for free users */}
            {!canUseSpecialInstructions && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg pointer-events-none">
                <div className="flex flex-col items-center gap-1.5 text-center px-4">
                  <svg className="w-6 h-6 text-amber-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-xs text-gray-400">
                    Available on <span className="text-amber-400 font-semibold">{siMeta?.requiredPlan ?? "Pro"}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Generate Button ───────────────────────────────── */}
      {loading ? (
        <div className="animate-pulse h-12 bg-gray-700 rounded-lg" />
      ) : canGenerate ? (
        <button
          onClick={handleGenerateResume}
          disabled={generating}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold px-6 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
        >
          {generating ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Tailored Resume
            </>
          )}
        </button>
      ) : (
        /* Free user — generate button locked */
        <div className="space-y-2">
          <button
            disabled
            className="w-full bg-gray-700/50 text-gray-500 font-semibold px-6 py-3 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed text-sm border border-gray-600/40"
            title={`Upgrade to ${genMeta?.requiredPlan ?? "Pro"} to generate resumes`}
          >
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Generate Tailored Resume
          </button>
          <p className="text-xs text-center text-gray-500">
            Upgrade to{" "}
            <span className="text-amber-400 font-medium">{genMeta?.requiredPlan ?? "Pro"}</span>{" "}
            to unlock AI resume generation
          </p>
        </div>
      )}
    </div>
  );
}