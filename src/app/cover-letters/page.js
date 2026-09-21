"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApiClient } from "@/hooks/useApiClient";
import Link from "next/link";

export default function CoverLettersPage() {
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const router = useRouter();
  const apiClient = useApiClient();

  const fetchLetters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient("/api/cover-letters");
      if (res.ok) {
        setLetters(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch cover letters:", err);
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    fetchLetters();
  }, [fetchLetters]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this cover letter?")) return;
    setDeletingId(id);
    setError("");
    try {
      const res = await apiClient(`/api/cover-letters/${id}`, { method: "DELETE" });
      if (res.ok) {
        setLetters((prev) => prev.filter((l) => l._id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete the cover letter. Please try again.");
      }
    } catch (err) {
      setError("Failed to delete the cover letter. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="container mx-auto px-6 pt-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Cover Letters
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                AI Powered
              </span>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm">
              Generate and manage targeted cover letters tailored to specific companies and roles
            </p>
          </div>
          <Link
            href="/cover-letters/new"
            className="btn-primary px-4 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Cover Letter</span>
          </Link>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : letters.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl border border-white/[0.08] text-center max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-4 animate-subtle-float">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white mb-1">No cover letters yet</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Synthesize your first targeted cover letter aligned with your resume experience and job requirements.
            </p>
            <Link
              href="/cover-letters/new"
              className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl"
            >
              <span>Create Your First Letter</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {letters.map((letter) => {
              const companyName = letter.metadata?.companyName || letter.content?.companyName || "Company";
              const jobTitle = letter.metadata?.jobTitle || letter.content?.jobTitle || "";
              const date = new Date(letter.createdAt).toLocaleDateString();

              return (
                <div
                  key={letter._id}
                  className="glass-card glass-card-interactive p-5 rounded-2xl border border-white/[0.08] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/cover-letters/${letter._id}`}
                        className="text-sm font-bold text-white hover:text-cyan-300 transition-colors truncate block"
                      >
                        {letter.metadata?.coverLetterName || `Cover Letter - ${companyName}`}
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {jobTitle ? `${jobTitle} at ` : ""}{companyName} &middot; <span className="text-slate-500">{date}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <Link
                      href={`/cover-letters/${letter._id}`}
                      className="px-3 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-600/15 hover:bg-indigo-600 hover:text-white border border-indigo-500/25 rounded-lg transition-all"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleDelete(letter._id)}
                      disabled={deletingId === letter._id}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20 disabled:opacity-50"
                      title="Delete letter"
                      aria-label="Delete letter"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

