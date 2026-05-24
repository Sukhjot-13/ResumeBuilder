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
          router.replace(ROUTES.DASHBOARD);
          alert('Subscription activated successfully!');
        }
      } catch (err) {
        console.error('Verification failed', err);
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
        }),
      });

      if (res.ok) {
        const { resume, metadata } = await res.json();
        setTailoredResume(resume);
        await createResume(resume, metadata);
      } else {
        const errData = await res.json().catch(() => ({}));
        setGenerateError(errData.message || errData.error || 'Failed to generate resume.');
      }
    } catch {
      setGenerateError('An unexpected error occurred.');
    } finally {
      setGenerating(false);
    }
  }, [apiClient, profile, jobDescription, specialInstructions, createResume]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-900 to-slate-900 -z-10" />

      <div className="container mx-auto px-6 pt-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Manage your resumes and create new ones</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Inputs */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-card p-6 rounded-2xl border border-white/5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                Job Details
              </h2>
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
                {generateError && (
                  <p className="text-sm text-red-400 flex items-center gap-1.5">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {generateError}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Preview */}
          <div className="lg:col-span-7">
            <div className="glass-card p-6 rounded-2xl border border-white/5 h-full min-h-[500px]">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </span>
                Live Preview
              </h2>
              {tailoredResume ? (
                <TemplateViewer resume={tailoredResume} user={profile} />
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
                  <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>Generated resume preview will appear here</p>
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
