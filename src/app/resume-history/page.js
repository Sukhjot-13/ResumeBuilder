
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApiClient } from '@/hooks/useApiClient';
import ResumeList from '@/components/ResumeList';

export default function ResumeHistoryPage() {
  const [resumes, setResumes] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [tailoredResume, setTailoredResume] = useState(null);
  const router = useRouter();
  const apiClient = useApiClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch profile (includes master resume)
        const profileResponse = await apiClient('/api/user/profile');
        if (profileResponse.ok) {
          const data = await profileResponse.json();
          setProfile(data);
        } else {
          console.error('Failed to fetch profile');
        }

        // Fetch generated resumes
        const resumesResponse = await apiClient('/api/resumes');
        if (resumesResponse.ok) {
          const data = await resumesResponse.json();
          setResumes(data);
        } else {
          console.error('Failed to fetch resumes');
        }
      } catch (err) {
        console.error('An unexpected error occurred while fetching data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiClient]);

  const handleDeleteResume = async (resumeId) => {
    setDeletingId(resumeId);
    try {
      const response = await apiClient(`/api/resumes/${resumeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setResumes(resumes.filter((resume) => resume._id !== resumeId));
      } else {
        console.error('Error deleting resume:', await response.text());
      }
    } catch (error) {
      console.error('Error deleting resume:', error);
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

        <ResumeList
          resumes={resumes}
          deletingId={deletingId}
          onDeleteResume={handleDeleteResume}
          onViewResume={setTailoredResume}
          loading={loading}
          masterResume={profile?.mainResume}
        />

        {tailoredResume && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setTailoredResume(null)}>
            <div className="bg-slate-900 rounded-2xl p-8 max-w-4xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Resume Preview</h2>
                <button
                  onClick={() => setTailoredResume(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="prose prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(tailoredResume, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
