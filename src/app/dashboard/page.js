"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApiClient } from "@/hooks/useApiClient";
import JobDescriptionInput from "@/components/home/JobDescriptionInput";
import SpecialInstructionsInput from "@/components/home/SpecialInstructionsInput";
import TemplateViewer from "@/components/preview/TemplateViewer";
import ResumeList from "@/components/ResumeList";
import { hasPermission } from "@/lib/accessControl";
import { PERMISSIONS } from "@/lib/constants";

function DashboardContent() {
  const [jobDescription, setJobDescription] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [tailoredResume, setTailoredResume] = useState(null);
  const [profile, setProfile] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const apiClient = useApiClient();

  const fetchResumes = async () => {
    try {
      const resumesResponse = await apiClient("/api/resumes");
      if (resumesResponse.ok) {
        const data = await resumesResponse.json();
        setResumes(data);
      } else {
        console.error("Failed to fetch resumes");
      }
    } catch (err) {
      console.error("Error fetching resumes:", err);
    }
  };

  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check for session_id to verify subscription
        const sessionId = searchParams.get('session_id');
        const success = searchParams.get('success');

        if (success && sessionId) {
            try {
                const verifyResponse = await apiClient('/api/checkout/verify-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId }),
                });
                
                if (verifyResponse.ok) {
                    // Clear URL params to prevent re-verification
                    router.replace('/dashboard');
                    // Show success message (could use a toast here)
                    alert('Subscription activated successfully!');
                }
            } catch (err) {
                console.error('Verification failed', err);
            }
        }

        // Fetch profile
        const profileResponse = await apiClient("/api/user/profile");

        if (profileResponse.ok) {
          const data = await profileResponse.json();
          setProfile(data);
        } else {
          console.error("Failed to fetch profile");
        }

        // Fetch resumes
        await fetchResumes();
      } catch (err) {
        console.error("An unexpected error occurred while fetching data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiClient, searchParams, router]);

  const handleGenerateResume = async () => {
    setGenerating(true);
    try {
      const generateResponse = await apiClient("/api/generate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resume: profile.mainResume.content, // Always send the master resume
          jobDescription,
          specialInstructions,
        }),
      });

      if (generateResponse.ok) {
        const { resume, metadata } = await generateResponse.json();
        setTailoredResume(resume);

        const saveResponse = await apiClient("/api/resumes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: resume, metadata }),
        });

        if (saveResponse.ok) {
          const newResume = await saveResponse.json();
          setResumes([newResume, ...resumes]);
        }
      } else {
        console.error(
          "Error generating resume:",
          await generateResponse.text()
        );
      }
    } catch (error) {
      console.error("Error generating resume:", error);
    }
    setGenerating(false);
  };

  const handleDeleteResume = async (resumeId) => {
    setDeletingId(resumeId);
    try {
      const response = await apiClient(`/api/resumes/${resumeId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setResumes(resumes.filter((resume) => resume._id !== resumeId));
      } else {
        console.error("Error deleting resume:", await response.text());
      }
    } catch (error) {
      console.error("Error deleting resume:", error);
    }
    setDeletingId(null);
  };

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
              <div className="space-y-6">
                <JobDescriptionInput
                  jobDescription={jobDescription}
                  setJobDescription={setJobDescription}
                />
                {profile && hasPermission(profile.role, PERMISSIONS.USE_SPECIAL_INSTRUCTIONS) && (
                  <SpecialInstructionsInput
                    specialInstructions={specialInstructions}
                    setSpecialInstructions={setSpecialInstructions}
                    handleGenerateResume={handleGenerateResume}
                    generating={generating}
                    profile={profile}
                  />
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
                <TemplateViewer resume={tailoredResume} />
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
          <ResumeList
            resumes={resumes}
            deletingId={deletingId}
            onDeleteResume={handleDeleteResume}
            onViewResume={setTailoredResume}
            loading={loading}
            masterResume={profile?.mainResume}
            onUpdateResume={fetchResumes}
          />
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
