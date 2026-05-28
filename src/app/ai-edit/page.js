'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PERMISSIONS } from '@/lib/constants';
import { checkPermission, getPermissionMetadata } from '@/lib/accessControl';
import PremiumFeatureLock from "@/components/common/PremiumFeatureLock";
import TemplateViewer from "@/components/preview/TemplateViewer";
import CoverLetterPreview from "@/components/preview/CoverLetterPreview";

export default function AIEditPage() {
  const router = useRouter();
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

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    if (!userProfile) return;
    if (editType === 'resume') fetchResumes();
    if (editType === 'cover-letter') fetchCoverLetters();
  }, [userProfile, editType]);

  const checkAccess = async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
        if (data.mainResume?._id) {
          setSelectedResumeId(data.mainResume._id.toString());
        }
      } else {
        router.push('/login');
      }
    } catch (err) {
      console.error('Error checking access:', err);
      router.push('/dashboard');
    } finally {
      setIsCheckingAccess(false);
    }
  };

  const fetchResumes = async () => {
    try {
      const res = await fetch('/api/resumes');
      if (res.ok) {
        const data = await res.json();
        setResumes(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching resumes:', err);
    }
  };

  const fetchCoverLetters = async () => {
    try {
      const res = await fetch('/api/cover-letters');
      if (res.ok) {
        const data = await res.json();
        setCoverLetters(Array.isArray(data) ? data : []);
        if (data.length > 0) {
          setSelectedCoverLetterId(data[0]._id);
        }
      }
    } catch (err) {
      console.error('Error fetching cover letters:', err);
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
    const name =
      resume.metadata?.resumeName ||
      resume.metadata?.jobTitle ||
      resume.content?.profile?.headline ||
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
        fetchResumes();
      } else {
        fetchCoverLetters();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingAccess) {
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
      <div className="min-h-screen bg-slate-900">
        <div className="text-white text-center mt-20">Loading...</div>
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
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                AI Editor
              </h1>
              <p className="mt-2 text-slate-400">
                Enhance your resume or cover letter with AI-powered edits.
              </p>
            </div>

            {/* Type Toggle */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex bg-slate-800/50 rounded-xl p-1 border border-slate-700/50">
                <button
                  onClick={() => setEditType('resume')}
                  className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                    editType === 'resume'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Resume
                </button>
                <button
                  onClick={() => setEditType('cover-letter')}
                  className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                    editType === 'cover-letter'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cover Letter
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Editor Form */}
              <div className="glass-card rounded-2xl p-8 animate-float">
                <div className="space-y-6">
                  {/* Selection */}
                  {editType === 'resume' ? (
                    <div>
                      <label htmlFor="resume" className="block text-sm font-medium text-slate-300 mb-2">
                        Select Resume
                      </label>
                      <div className="relative">
                        <select
                          id="resume"
                          className="block w-full rounded-xl bg-slate-800/50 border border-slate-700 text-slate-200 py-3 pl-4 pr-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm appearance-none cursor-pointer transition-colors hover:bg-slate-800/80"
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
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {allResumes.length === 0 && (
                        <p className="mt-2 text-sm text-yellow-500 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                          No resumes found. Upload one in your Profile first.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="cover-letter" className="block text-sm font-medium text-slate-300 mb-2">
                        Select Cover Letter
                      </label>
                      <div className="relative">
                        <select
                          id="cover-letter"
                          className="block w-full rounded-xl bg-slate-800/50 border border-slate-700 text-slate-200 py-3 pl-4 pr-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm appearance-none cursor-pointer transition-colors hover:bg-slate-800/80"
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
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {coverLetters.length === 0 && (
                        <p className="mt-2 text-sm text-yellow-500 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                          No cover letters found. Generate one first.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Instructions */}
                  <div>
                    <label htmlFor="instructions" className="block text-sm font-medium text-slate-300 mb-2">
                      AI Instructions
                    </label>
                    <div className="relative">
                      <textarea
                        id="instructions"
                        rows={6}
                        className="block w-full rounded-xl bg-slate-800/50 border border-slate-700 text-slate-200 p-4 focus:border-blue-500 focus:ring-blue-500 sm:text-sm placeholder-slate-500 transition-colors hover:bg-slate-800/80 resize-none"
                        placeholder={
                          editType === 'resume'
                            ? "e.g., Rewrite the professional summary to highlight my leadership experience..."
                            : "e.g., Make the tone more enthusiastic and mention my project management skills..."
                        }
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Save as new (resume only) */}
                  {editType === 'resume' && canCreateNew && (
                    <div className="flex items-center p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                      <input
                        id="createNew"
                        name="createNew"
                        type="checkbox"
                        className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer"
                        checked={createNew}
                        onChange={(e) => setCreateNew(e.target.checked)}
                      />
                      <div className="ml-3">
                        <label htmlFor="createNew" className="text-sm font-medium text-slate-200 cursor-pointer select-none">
                          Save as new resume
                        </label>
                        <p className="text-xs text-slate-500">The original resume will be preserved.</p>
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      <p className="text-sm text-red-200">{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
                      <svg className="w-5 h-5 text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      <p className="text-sm text-green-200">{success}</p>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    type="button"
                    onClick={handleEdit}
                    disabled={loading || !query}
                    className={`w-full group relative flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-medium text-white transition-all duration-200 ${
                      loading || !query
                        ? 'bg-slate-700 cursor-not-allowed opacity-50'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.99]'
                    }`}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Processing edits...
                      </div>
                    ) : (
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                        Generate AI Edits
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Right: Preview */}
              <div className="glass-card rounded-2xl p-6 animate-float">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview
                </h2>

                {editType === 'resume' && selectedResume?.content ? (
                  <TemplateViewer resume={selectedResume.content} user={userProfile} />
                ) : editType === 'cover-letter' && selectedCoverLetter?.content ? (
                  <CoverLetterPreview coverLetterData={selectedCoverLetter.content} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
                    <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>Select a {editType === 'resume' ? 'resume' : 'cover letter'} to preview</p>
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
