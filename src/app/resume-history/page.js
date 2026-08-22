
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from '@/hooks/useApiClient';
import { useProfile } from '@/hooks/useProfile';
import ResumeList from '@/components/ResumeList';
import ResumeDisplayView from '@/components/preview/ResumeDisplayView';

export default function ResumeHistoryPage() {
  const [resumes, setResumes] = useState([]);
  const [masterResume, setMasterResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [tailoredResume, setTailoredResume] = useState(null);
  const apiClient = useApiClient();
  const { profile } = useProfile();

  const fetchResumes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient('/api/resumes');
      if (response.ok) {
        const data = await response.json();
        setResumes(data);
      } else {
        setError('Failed to load your resumes. Please try again.');
      }
    } catch (error) {
      setError('Failed to load your resumes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch profile (includes master resume)
        const profileResponse = await apiClient('/api/user/profile');
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setMasterResume(profileData.mainResume);
        } else {
          setError('Failed to load your profile. Please refresh the page.');
        }

        // Fetch generated resumes
        await fetchResumes();
      } catch (err) {
        setError('Something went wrong while loading this page.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiClient, fetchResumes]);

  const handleDeleteResume = async (resumeId) => {
    setDeletingId(resumeId);
    try {
      const response = await apiClient(`/api/resumes/${resumeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setResumes(resumes.filter((resume) => resume._id !== resumeId));
      } else {
        setError('Could not delete that resume. Please try again.');
      }
    } catch (error) {
      setError('Could not delete that resume. Please try again.');
    }
    setDeletingId(null);
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-900 to-slate-900 -z-10" />
      
      <div className="container mx-auto px-6 pt-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Resume History</h1>
            <p className="text-slate-400 text-sm mt-1">View and manage all your resumes</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        <ResumeList
          resumes={resumes}
          deletingId={deletingId}
          onDeleteResume={handleDeleteResume}
          onViewResume={setTailoredResume}
          loading={loading}
          masterResume={masterResume || profile?.mainResume || null}
          onUpdateResume={fetchResumes}
          user={profile}
        />

        {tailoredResume && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setTailoredResume(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Resume preview"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setTailoredResume(null);
            }}
          >
              <div className="bg-slate-100 rounded-2xl p-8 max-w-4xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Resume Preview</h2>
                  <button
                    onClick={() => setTailoredResume(null)}
                    className="text-gray-500 hover:text-gray-900 transition-colors"
                    aria-label="Close preview"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {tailoredResume ? (
                  <ResumeDisplayView resumeData={tailoredResume} />
                ) : (
                  <p className="text-gray-500">No content available for this resume.</p>
                )}
              </div>
          </div>
        )}
      </div>
    </div>
  );
}
