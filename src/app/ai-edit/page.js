'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PERMISSIONS } from '@/lib/constants';
import { checkPermission, getPermissionMetadata } from '@/lib/accessControl';
import { useAuth } from '@/context/AuthContext';
import PremiumFeatureLock from "@/components/common/PremiumFeatureLock";
import TemplateViewer from "@/components/preview/TemplateViewer";
import CoverLetterPreview from "@/components/preview/CoverLetterPreview";

export default function AIEditPage() {
  const router = useRouter();
  const { loading: authLoading, isAuthenticated, user: authUser, refetch: refetchProfile } = useAuth();
  const [editType, setEditType] = useState('resume'); // 'resume' | 'cover-letter'

  // Resume state
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');

  // Cover letter state
  const [coverLetters, setCoverLetters] = useState([]);
  const [selectedCoverLetterId, setSelectedCoverLetterId] = useState('');

  // Common state
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createNew, setCreateNew] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // Sync profile from AuthContext (single shared fetch — no duplicate requests)
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !authUser) {
      router.push('/login');
      return;
    }
    setUserProfile(authUser);
    setIsCheckingAccess(false);
    if (!selectedResumeId && authUser.mainResume?._id) {
      setSelectedResumeId(authUser.mainResume._id.toString());
    }
  }, [authLoading, isAuthenticated, authUser, router, selectedResumeId]);

  useEffect(() => {
    if (!userProfile) return;
    if (editType === 'resume') fetchResumes();
    if (editType === 'cover-letter') fetchCoverLetters();
  }, [userProfile, editType]);

  const fetchResumes = async () => {
    try {
      const res = await fetch('/api/resumes');
      if (res.ok) {
        const data = await res.json();
        setResumes(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching resumes:', err);
    } finally {
      setInitialDataLoaded(true);
    }
  };

  const fetchCoverLetters = async () => {
    try {
      const res = await fetch('/api/cover-letters');
      if (res.ok) {
        const data = await res.json();
        setCoverLetters(Array.isArray(data) ? data : []);
        // Keep the current selection if it still exists — don't jump to the first item
        setSelectedCoverLetterId((prev) => {
          if (prev && Array.isArray(data) && data.some((cl) => cl._id === prev)) {
            return prev;
          }
          return data[0]?._id || '';
        });
      }
    } catch (err) {
      console.error('Error fetching cover letters:', err);
    } finally {
      setInitialDataLoaded(true);
    }
  };

  // Resume helpers
  const masterResumeId = userProfile?.mainResume?._id?.toString();
  const allResumes = [
    ...(userProfile?.mainResume ? [{ ...userProfile.mainResume, _isMaster: true }] : []),
    ...resumes.filter(r => r._id?.toString() !== masterResumeId),
  ];
  const selectedResume = allResumes.find(r => r._id?.toString() === selectedResumeId);

  // Cover letter helpers
  const selectedCoverLetter = coverLetters.find(cl => cl._id === selectedCoverLetterId);

  const getResumeLabel = (resume) => {
    const metadata = resume.metadata || {};
    const content = resume.content || {};

    // Priority: resumeName > jobTitle > profile headline > profile name > fallback
    const name =
      metadata.resumeName ||
      metadata.jobTitle ||
      content?.profile?.headline ||
      content?.profile?.name ||
      'Untitled Resume';

    const date = resume.updatedAt
      ? new Date(resume.updatedAt).toLocaleDateString()
      : '';
    const tag = resume._isMaster ? '⭐ Master — ' : '';
    return `${tag}${name}${date ? ` (${date})` : ''}`;
  };

  const getCoverLetterLabel = (cl) => {
    const name = cl.metadata?.coverLetterName || cl.metadata?.companyName || 'Untitled Cover Letter';
    const date = new Date(cl.createdAt).toLocaleDateString();
    return `${name} (${date})`;
  };

  const handleEdit = async () => {
    if (!query) {
      setError('Please enter instructions');
      return;
    }

    if (editType === 'resume' && !selectedResumeId) {
      setError('Please select a resume');
      return;
    }

    if (editType === 'cover-letter' && !selectedCoverLetter) {
      setError('Please select a cover letter');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const body = editType === 'resume'
        ? {
            resume: selectedResume.content,
            resumeId: selectedResume._id,
            query,
            createNewResume: createNew,
          }
        : {
            type: 'cover-letter',
            coverLetterContent: selectedCoverLetter.content,
            coverLetterId: selectedCoverLetter._id,
            query,
          };

      const res = await fetch('/api/edit-resume-with-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to edit');
      }

      const label = editType === 'resume' ? 'Resume' : 'Cover letter';
      setSuccess(`${label} edited successfully!`);
      setQuery('');

      if (editType === 'resume') {
        await fetchResumes();
        // If the MASTER resume was edited in place, refetch the profile (via the
        // shared AuthContext) so the preview and dropdown reflect the new content.
        if (!createNew && selectedResumeId && selectedResumeId === masterResumeId) {
          await refetchProfile();
        }
      } else {
        await fetchCoverLetters();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingAccess || !initialDataLoaded) {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-slate-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-slate-900 text-center mt-20 px-6">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const hasAccess = checkPermission(userProfile, PERMISSIONS.EDIT_RESUME_WITH_AI);
  const canCreateNew = checkPermission(userProfile, PERMISSIONS.CREATE_NEW_RESUME_ON_EDIT);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {!hasAccess ? (
          <PremiumFeatureLock
            featureName={getPermissionMetadata(PERMISSIONS.EDIT_RESUME_WITH_AI)?.name || "Feature Locked"}
            description={getPermissionMetadata(PERMISSIONS.EDIT_RESUME_WITH_AI)?.description}
            planName={getPermissionMetadata(PERMISSIONS.EDIT_RESUME_WITH_AI)?.requiredPlan}
          />
        ) : (
          <>
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                Natural Language AI Studio
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
                Interactive AI Editor
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
                Issue natural language instructions to refine bullet points, rewrite summaries, or tailor tone.
              </p>
            </div>

            {/* Type Toggle */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex p-1 rounded-xl bg-slate-900/90 border border-white/[0.08] shadow-inner">
                <button
                  onClick={() => setEditType('resume')}
                  className={`px-6 py-2 rounded-lg text-xs font-semibold transition-all ${
                    editType === 'resume'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Resume Editor
                </button>
                <button
                  onClick={() => setEditType('cover-letter')}
                  className={`px-6 py-2 rounded-lg text-xs font-semibold transition-all ${
                    editType === 'cover-letter'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cover Letter Editor
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left: Editor Form */}
              <div className="lg:col-span-5 glass-card rounded-2xl p-6 border border-white/[0.08] space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Instruction Prompt</h2>
                    <p className="text-[11px] text-slate-400">Select target document and issue edits</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Selection */}
                  {editType === 'resume' ? (
                    <div>
                      <label htmlFor="resume" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                        Target Resume
                      </label>
                      <div className="relative">
                        <select
                          id="resume"
                          className="block w-full rounded-xl app-input py-2.5 pl-3.5 pr-10 text-xs sm:text-sm appearance-none cursor-pointer transition-colors"
                          value={selectedResumeId}
                          onChange={(e) => setSelectedResumeId(e.target.value)}
                        >
                          <option value="" className="bg-slate-900">Select a resume...</option>
                          {allResumes.map((resume) => (
                            <option key={resume._id} value={resume._id?.toString()} className="bg-slate-900">
                              {getResumeLabel(resume)}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {allResumes.length === 0 && (
                        <p className="mt-2 text-xs text-amber-400 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                          No resumes found. Set up your master resume in Profile first.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="cover-letter" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                        Target Cover Letter
                      </label>
                      <div className="relative">
                        <select
                          id="cover-letter"
                          className="block w-full rounded-xl app-input py-2.5 pl-3.5 pr-10 text-xs sm:text-sm appearance-none cursor-pointer transition-colors"
                          value={selectedCoverLetterId}
                          onChange={(e) => setSelectedCoverLetterId(e.target.value)}
                        >
                          <option value="" className="bg-slate-900">Select a cover letter...</option>
                          {coverLetters.map((cl) => (
                            <option key={cl._id} value={cl._id} className="bg-slate-900">
                              {getCoverLetterLabel(cl)}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {coverLetters.length === 0 && (
                        <p className="mt-2 text-xs text-amber-400 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                          No cover letters found. Generate one first.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Preset prompt helper chips */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Quick Prompt Starters</label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Strengthen action verbs in recent roles",
                        "Quantify results with metric estimates",
                        "Make summary concise (under 3 sentences)",
                        "Optimize keywords for ATS ranking",
                      ].map((promptText) => (
                        <button
                          key={promptText}
                          type="button"
                          onClick={() => setQuery(promptText)}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-300 border border-white/[0.08] hover:border-indigo-500/30 transition-all text-left"
                        >
                          + {promptText}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Instructions */}
                  <div>
                    <label htmlFor="instructions" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Your Instructions
                    </label>
                    <textarea
                      id="instructions"
                      rows={5}
                      className="block w-full rounded-xl app-input p-3.5 text-xs sm:text-sm resize-none leading-relaxed"
                      placeholder={
                        editType === 'resume'
                          ? "e.g., Rewrite work experience bullets for the Senior Engineer position with strong leadership impact and metrics..."
                          : "e.g., Make the tone more engaging and highlight my project turnaround expertise..."
                      }
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>

                  {/* Save as new (resume only) */}
                  {editType === 'resume' && canCreateNew && (
                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-white/[0.06] cursor-pointer select-none">
                      <input
                        id="createNew"
                        name="createNew"
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800/80 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        checked={createNew}
                        onChange={(e) => setCreateNew(e.target.checked)}
                      />
                      <div className="text-xs">
                        <span className="font-semibold text-slate-200">Save as a new resume version</span>
                        <p className="text-[11px] text-slate-400">Preserves original without overwriting</p>
                      </div>
                    </label>
                  )}

                  {/* Messages */}
                  {error && (
                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <svg className="w-4 h-4 shrink-0 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                      <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      <span>{success}</span>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    type="button"
                    onClick={handleEdit}
                    disabled={loading || !query}
                    className="w-full btn-primary py-3 px-5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Applying AI Edits...</span>
                      </div>
                    ) : (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                        <span>Apply AI Edits</span>
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Right: Live Preview */}
              <div className="lg:col-span-7 glass-card rounded-2xl p-6 border border-white/[0.08] min-h-[560px]">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-white">Document Preview</h2>
                      <p className="text-[11px] text-slate-400">Real-time updated document state</p>
                    </div>
                  </div>
                </div>

                {editType === 'resume' && selectedResume?.content ? (
                  <TemplateViewer resume={selectedResume.content} user={userProfile} />
                ) : editType === 'cover-letter' && selectedCoverLetter?.content ? (
                  <CoverLetterPreview coverLetterData={selectedCoverLetter.content} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[460px] text-center p-8 rounded-xl border border-dashed border-white/[0.08] bg-[#070c18]/40">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-sm animate-subtle-float">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-slate-200 mb-1">
                      Select a {editType === 'resume' ? 'resume' : 'cover letter'}
                    </p>
                    <p className="text-xs text-slate-400 max-w-xs">
                      Choose a target from the dropdown on the left to review its content and apply updates.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
}
