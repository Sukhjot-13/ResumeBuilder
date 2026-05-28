"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useApiClient } from "@/hooks/useApiClient";
import { useProfile } from "@/hooks/useProfile";
import CoverLetterPreview from "@/components/preview/CoverLetterPreview";
import JobDescriptionInput from "@/components/home/JobDescriptionInput";

export default function CoverLetterDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const apiClient = useApiClient();
  const { profile, loading: profileLoading } = useProfile();

  const isNew = id === "new";

  // Generation form state (for new + regenerate)
  const [jobDescription, setJobDescription] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Existing letter state
  const [coverLetter, setCoverLetter] = useState(null);
  const [letterLoading, setLetterLoading] = useState(!isNew);

  // Fetch existing cover letter
  useEffect(() => {
    if (isNew) return;
    const fetchLetter = async () => {
      try {
        const res = await apiClient(`/api/cover-letters/${id}`);
        if (res.ok) {
          const data = await res.json();
          setCoverLetter(data);
        } else {
          setError("Cover letter not found");
        }
      } catch (err) {
        setError("Failed to load cover letter");
      } finally {
        setLetterLoading(false);
      }
    };
    fetchLetter();
  }, [id, isNew, apiClient]);

  const handleGenerate = async () => {
    if (!profile?.mainResume?.content) {
      setError("Please save a master resume in your Profile first.");
      return;
    }
    if (!jobDescription.trim()) {
      setError("Please enter a job description.");
      return;
    }

    setGenerating(true);
    setError("");

    try {
      const res = await apiClient("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          recipientName: recipientName || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Navigate to the newly created cover letter
        if (data.coverLetterId) {
          router.push(`/cover-letters/${data.coverLetterId}`);
        } else {
          // Not saved but we can show the preview
          setCoverLetter({ content: data, _id: null });
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || errData.error || "Failed to generate cover letter.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this cover letter?")) return;
    try {
      const res = await apiClient(`/api/cover-letters/${id}`, { method: "DELETE" });
      if (res.ok) router.push("/cover-letters");
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  if (profileLoading || letterLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error && !generating) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push("/cover-letters")}
            className="text-blue-400 hover:text-blue-300"
          >
            Back to Cover Letters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-900 to-slate-900 -z-10" />

      <div className="container mx-auto px-6 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              {isNew ? "New Cover Letter" : "Cover Letter"}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {isNew
                ? "Generate a tailored cover letter from a job description"
                : `For ${coverLetter?.content?.companyName || coverLetter?.metadata?.companyName || "..."}`}
            </p>
          </div>
          <div className="flex gap-3">
            {!isNew && (
              <>
                <button
                  onClick={() => {
                    setJobDescription("");
                    setRecipientName("");
                    // Scroll to top to show generation form
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white glass rounded-lg transition-colors"
                >
                  Regenerate
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 glass rounded-lg transition-colors"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Input Form (shown for new or when regenerating) */}
          {(isNew) && (
            <div className="lg:col-span-5 space-y-6">
              <div className="glass-card p-6 rounded-2xl border border-white/5">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                  <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  Job Details
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Recipient Name (optional)
                    </label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g. Hiring Manager or John Smith"
                      className="w-full px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>

                  <JobDescriptionInput
                    jobDescription={jobDescription}
                    setJobDescription={setJobDescription}
                    loading={profileLoading}
                  />

                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {generating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Generating...
                      </>
                    ) : (
                      "Generate Cover Letter"
                    )}
                  </button>

                  {error && (
                    <p className="text-sm text-red-400 flex items-center gap-1.5">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Right: Preview */}
          <div className={isNew ? "lg:col-span-7" : "lg:col-span-12"}>
            {coverLetter ? (
              <CoverLetterPreview coverLetterData={coverLetter.content} />
            ) : (
              <div className="glass-card p-12 rounded-2xl border border-white/5 text-center">
                <div className="flex flex-col items-center justify-center h-[400px] text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
                  <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p>Fill in the details and generate a cover letter</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
