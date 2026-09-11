"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApiClient } from "@/hooks/useApiClient";
import { useProfile } from "@/hooks/useProfile";
import { useResumes } from "@/hooks/useResumes";
import JobDescriptionInput from "@/components/home/JobDescriptionInput";
import SpecialInstructionsInput from "@/components/home/SpecialInstructionsInput";
import TemplateViewer from "@/components/preview/TemplateViewer";
import ResumeList from "@/components/ResumeList";
import { PERMISSIONS, API_ENDPOINTS, ROUTES } from "@/lib/constants";
import PermissionGate from "@/components/common/PermissionGate";

function DashboardContent() {
  const [jobDescription, setJobDescription] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [tailoredResume, setTailoredResume] = useState(null);
  const [saveResume, setSaveResume] = useState(true);
  const [checkoutStatus, setCheckoutStatus] = useState(null); // { type: 'success'|'error', message }

  const router = useRouter();
  const searchParams = useSearchParams();
  const apiClient = useApiClient();

  // ── Hook layer: no fetch calls in this component ───────────────────────────
  const { profile, loading } = useProfile();
  const { resumes, deletingId, fetchResumes, createResume, deleteResume } = useResumes(profile);

  // Verify subscription after Stripe redirect
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const success = searchParams.get('success');
    if (!success || !sessionId) return;

    const verifySession = async () => {
      try {
        const res = await apiClient(API_ENDPOINTS.CHECKOUT.VERIFY_SESSION, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        if (res.ok) {
          setCheckoutStatus({ type: 'success', message: 'Subscription activated successfully. Welcome to Pro!' });
          router.replace(ROUTES.DASHBOARD);
        } else {
          const data = await res.json().catch(() => ({}));
          setCheckoutStatus({
            type: 'error',
            message: data.error || 'Could not verify your payment. If you were charged, please contact support.',
          });
          router.replace(ROUTES.DASHBOARD);
        }
      } catch (err) {
        console.error('Verification failed', err);
        setCheckoutStatus({
          type: 'error',
          message: 'Could not verify your payment. Please check your subscription status in your profile.',
        });
      }
    };

    verifySession();
  }, [searchParams, apiClient, router]);

  // Fetch resumes once profile is loaded
  useEffect(() => {
    if (profile) fetchResumes();
  }, [profile, fetchResumes]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleGenerateResume = useCallback(async () => {
    if (!profile?.mainResume?.content) {
      setGenerateError('Please save a master resume in your Profile first.');
      return;
    }
    setGenerating(true);
    setGenerateError('');
    try {
      const res = await apiClient(API_ENDPOINTS.GENERATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume: profile.mainResume.content,
          jobDescription,
          specialInstructions, // server enforces the permission
          save: saveResume,
        }),
      });

      if (res.ok) {
        const { resume, metadata, resumeId } = await res.json();
        setTailoredResume(resume);
        if (saveResume && resumeId) {
          // Server already saved it — refresh so it appears in "Your Saved Resumes"
          await fetchResumes();
        } else if (saveResume) {
          await createResume(resume, metadata);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setGenerateError(errData.message || errData.error || 'Failed to generate resume.');
      }
    } catch {
      setGenerateError('An unexpected error occurred.');
    } finally {
      setGenerating(false);
    }
  }, [apiClient, profile, jobDescription, specialInstructions, saveResume, createResume, fetchResumes]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-20">
      <div className="container mx-auto px-6 pt-8">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Resume Studio
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                AI Engine v2
              </span>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm">
              Target job descriptions and tailor high-scoring ATS resumes in real time
            </p>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex items-center gap-2.5">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/[0.08] text-xs flex items-center gap-2 shadow-sm">
              <span className="text-slate-400">Master Resume:</span>
              {profile?.mainResume ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Active
                </span>
              ) : (
                <span className="text-amber-400 font-medium">Needs Setup</span>
              )}
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/[0.08] text-xs flex items-center gap-2 shadow-sm">
              <span className="text-slate-400">Saved Resumes:</span>
              <span className="font-semibold text-white">{resumes?.length || 0}</span>
            </div>
          </div>
        </div>

        {checkoutStatus && (
          <div
            className={`mb-6 px-4 py-3 rounded-xl text-xs sm:text-sm flex items-center justify-between shadow-lg ${
              checkoutStatus.type === 'success'
                ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border border-rose-500/30 text-rose-300'
            }`}
            role="status"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{checkoutStatus.type === 'success' ? '✓' : '⚠️'}</span>
              <span>{checkoutStatus.message}</span>
            </div>
            <button
              onClick={() => setCheckoutStatus(null)}
              className="ml-4 opacity-70 hover:opacity-100 p-1"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: AI Tailoring Studio */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-card p-6 rounded-2xl border border-white/[0.08] space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">AI Tailoring Studio</h2>
                    <p className="text-[11px] text-slate-400">Contextual keyword & impact alignment</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <JobDescriptionInput
                  jobDescription={jobDescription}
                  setJobDescription={setJobDescription}
                  loading={loading}
                />

                <SpecialInstructionsInput
                  specialInstructions={specialInstructions}
                  setSpecialInstructions={setSpecialInstructions}
                  handleGenerateResume={handleGenerateResume}
                  generating={generating}
                  profile={profile}
                  loading={loading}
                />

                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={saveResume}
                    onChange={(e) => setSaveResume(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800/80 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Save tailored resume to your version history</span>
                </label>

                {generateError && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{generateError}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Studio Live Preview */}
          <div className="lg:col-span-7">
            <div className="glass-card p-6 rounded-2xl border border-white/[0.08] min-h-[560px]">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Live Document Preview</h2>
                    <p className="text-[11px] text-slate-400">High-fidelity ATS preview & export</p>
                  </div>
                </div>
              </div>

              {tailoredResume ? (
                <TemplateViewer resume={tailoredResume} user={profile} />
              ) : (
                <div className="flex flex-col items-center justify-center h-[460px] text-center p-8 rounded-xl border border-dashed border-white/[0.08] bg-[#070c18]/40">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-sm animate-subtle-float">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-1">
                    Ready to Generate Your Resume
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">
                    Paste your target job description on the left and click &ldquo;Generate Tailored Resume&rdquo; to preview it instantly.
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    <span>ATS Keyword Matcher Ready</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>


        <div className="mt-12">
          {loading || !profile ? (
            <ResumeList
              resumes={[]}
              deletingId={null}
              onDeleteResume={deleteResume}
              onViewResume={setTailoredResume}
              loading={true}
              masterResume={null}
              onUpdateResume={() => {}}
              user={null}
            />
          ) : (
            <PermissionGate user={profile} permission={PERMISSIONS.VIEW_OWN_RESUMES} fallback="default">
              <ResumeList
                resumes={resumes}
                deletingId={deletingId}
                onDeleteResume={deleteResume}
                onViewResume={setTailoredResume}
                loading={false}
                masterResume={profile?.mainResume}
                onUpdateResume={fetchResumes}
                user={profile}
              />
            </PermissionGate>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
