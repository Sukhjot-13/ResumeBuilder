'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { PERMISSIONS } from '@/lib/constants';
import { checkPermission, getPermissionMetadata } from '@/lib/accessControl';
import TemplateViewer from "@/components/preview/TemplateViewer";
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
        
        // The redirection logic for permissions is now handled by the conditional rendering below
        // if (!checkPermission(data, PERMISSIONS.EDIT_RESUME_WITH_AI)) {
        //   router.push('/dashboard');
        // }
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
        // API returns array directly, not wrapped in an object
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
      // Refresh resumes
      fetchResumes();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking access
  if (isCheckingAccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return <div className="text-white text-center mt-20">Loading...</div>;
  }

  // Check permission but DO NOT redirect. 
  // We will conditionally render the lock screen below.
  const hasAccess = checkPermission(userProfile, PERMISSIONS.EDIT_RESUME_WITH_AI);

  // Check if user can create new resume on edit
  const canCreateNew = checkPermission(userProfile, PERMISSIONS.CREATE_NEW_RESUME_ON_EDIT);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {!hasAccess ? (
          <PremiumFeatureLock 
            featureName={getPermissionMetadata(PERMISSIONS.EDIT_RESUME_WITH_AI)?.name || "Feature Locked"}
            description={getPermissionMetadata(PERMISSIONS.EDIT_RESUME_WITH_AI)?.description}
            planName={getPermissionMetadata(PERMISSIONS.EDIT_RESUME_WITH_AI)?.requiredPlan}
          />
        ) : (
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                AI Resume Editor
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Select a resume and provide instructions for the AI to edit it.</p>
              </div>

              <div className="mt-5 space-y-6">
                <div>
                  <label htmlFor="resume" className="block text-sm font-medium text-gray-700">
                    Select Resume
                  </label>
                  <select
                    id="resume"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                  >
                    <option value="">Select a resume...</option>
                    {resumes.map((resume) => (
                      <option key={resume._id} value={resume._id}>
                        {resume.content?.profile?.headline || resume.jobTitle || 'Untitled Resume'} ({new Date(resume.updatedAt).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                  {resumes.length === 0 && (
                    <p className="mt-2 text-sm text-gray-500">
                      No resumes found. Create a resume first to use AI editing.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="instructions" className="block text-sm font-medium text-gray-700">
                    AI Instructions
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="instructions"
                      rows={4}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="e.g., Make the summary more professional and add keywords for software engineering positions..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                </div>

                {canCreateNew && (
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="createNew"
                        name="createNew"
                        type="checkbox"
                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        checked={createNew}
                        onChange={(e) => setCreateNew(e.target.checked)}
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="createNew" className="font-medium text-gray-700">
                        Create as new resume
                      </label>
                      <p className="text-gray-500">If checked, the original resume will be preserved.</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">{error}</h3>
                      </div>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="rounded-md bg-green-50 p-4">
                    <div className="flex">
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">{success}</h3>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={handleEdit}
                    disabled={loading || !selectedResumeId || !query}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                      loading || !selectedResumeId || !query ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading ? 'Processing...' : 'Edit with AI'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
