'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { PERMISSIONS } from '@/lib/constants';
import { checkPermission, getPermissionMetadata } from '@/lib/accessControl';
// TemplateViewer is unused in this file, but keeping imports clean is good practice.
// import TemplateViewer from "@/components/preview/TemplateViewer"; 
import PremiumFeatureLock from "@/components/common/PremiumFeatureLock";

export default function AIEditPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
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
    if (userProfile) {
      fetchResumes();
    }
  }, [userProfile]);

  const checkAccess = async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      } else {
        router.push('/auth/login');
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
      setError('Failed to fetch resumes');
    }
  };

  const handleEdit = async () => {
    if (!selectedResumeId || !query) {
      setError('Please select a resume and enter instructions');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const selectedResume = resumes.find(r => r._id === selectedResumeId);
      
      const res = await fetch('/api/edit-resume-with-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume: selectedResume.content,
          query,
          createNewResume: createNew
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to edit resume');
      }

      setSuccess('Resume edited successfully!');
      setQuery('');
      fetchResumes();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Loading state with dark theme
  if (isCheckingAccess) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-slate-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated / Loading profile
  if (!userProfile) {
    return (
       <div className="min-h-screen bg-slate-900">
        <Navbar />
        <div className="text-white text-center mt-20">Loading...</div>
      </div>
    );
  }

  const hasAccess = checkPermission(userProfile, PERMISSIONS.EDIT_RESUME_WITH_AI);
  const canCreateNew = checkPermission(userProfile, PERMISSIONS.CREATE_NEW_RESUME_ON_EDIT);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px]" />
      </div>

      <Navbar />
      
      <div className="relative z-10 max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {!hasAccess ? (
          <PremiumFeatureLock 
            featureName={getPermissionMetadata(PERMISSIONS.EDIT_RESUME_WITH_AI)?.name || "Feature Locked"}
            description={getPermissionMetadata(PERMISSIONS.EDIT_RESUME_WITH_AI)?.description}
            planName={getPermissionMetadata(PERMISSIONS.EDIT_RESUME_WITH_AI)?.requiredPlan}
          />
        ) : (
          <div className="glass-card rounded-2xl p-8 animate-float">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                AI Resume Editor
              </h1>
              <p className="mt-2 text-slate-400">
                Enhance your resume with AI-powered edits and optimizations.
              </p>
            </div>

            <div className="space-y-6">
              {/* Resume Selection */}
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
                    {resumes.map((resume) => (
                      <option key={resume._id} value={resume._id} className="bg-slate-900">
                        {resume.metadata?.resumeName || resume.jobTitle || resume.content?.profile?.headline || 'Untitled Resume'} — {new Date(resume.updatedAt).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                   <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                </div>
                {resumes.length === 0 && (
                  <p className="mt-2 text-sm text-yellow-500 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    No resumes found. Please create a resume first.
                  </p>
                )}
              </div>

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
                    placeholder="e.g., Rewrite the professional summary to highlight my leadership experience and use stronger action verbs..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Options */}
              {canCreateNew && (
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
                disabled={loading || !selectedResumeId || !query}
                className={`w-full group relative flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-medium text-white transition-all duration-200 ${
                  loading || !selectedResumeId || !query
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
        )}
      </div>
    </div>
  );
}
