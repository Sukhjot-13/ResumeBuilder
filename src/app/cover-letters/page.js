"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApiClient } from "@/hooks/useApiClient";
import Link from "next/link";

export default function CoverLettersPage() {
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const router = useRouter();
  const apiClient = useApiClient();

  const fetchLetters = async () => {
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
  };

  useEffect(() => {
    fetchLetters();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this cover letter?")) return;
    setDeletingId(id);
    try {
      await apiClient(`/api/cover-letters/${id}`, { method: "DELETE" });
      setLetters((prev) => prev.filter((l) => l._id !== id));
    } catch (err) {
      console.error("Failed to delete cover letter:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-900 to-slate-900 -z-10" />

      <div className="container mx-auto px-6 pt-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Cover Letters
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Generate and manage your cover letters
            </p>
          </div>
          <Link
            href="/cover-letters/new"
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Cover Letter
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : letters.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl border border-white/5 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-slate-400 text-lg mb-2">No cover letters yet</p>
            <p className="text-slate-500 text-sm mb-6">
              Generate your first cover letter to get started.
            </p>
            <Link
              href="/cover-letters/new"
              className="inline-block px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Create Cover Letter
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {letters.map((letter) => {
              const companyName = letter.metadata?.companyName || letter.content?.companyName || "Unknown";
              const jobTitle = letter.metadata?.jobTitle || letter.content?.jobTitle || "";
              const date = new Date(letter.createdAt).toLocaleDateString();

              return (
                <div
                  key={letter._id}
                  className="glass-card p-5 rounded-2xl border border-white/5 flex items-center justify-between hover:border-white/10 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/cover-letters/${letter._id}`}
                      className="text-white font-medium hover:text-blue-400 transition-colors"
                    >
                      {letter.metadata?.coverLetterName || `Cover Letter - ${companyName}`}
                    </Link>
                    <p className="text-slate-400 text-sm mt-1 truncate">
                      {jobTitle && `${jobTitle} at `}{companyName} &middot; {date}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Link
                      href={`/cover-letters/${letter._id}`}
                      className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white glass rounded-lg transition-colors"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleDelete(letter._id)}
                      disabled={deletingId === letter._id}
                      className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 glass rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deletingId === letter._id ? "Deleting..." : "Delete"}
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
