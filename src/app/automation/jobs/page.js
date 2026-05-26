"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApiClient } from "@/hooks/useApiClient";
import Link from "next/link";

export default function JobsPage() {
  const { user } = useAuth();
  const apiClient = useApiClient();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", platform: "", search: "" });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.platform) params.set("platform", filters.platform);
      const res = await apiClient(`/api/automation/jobs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch jobs", err);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status) => {
    const colors = {
      pending: "bg-slate-500/20 text-slate-400 border-slate-500/30",
      approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      skipped: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      applied: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      failed: "bg-red-500/20 text-red-400 border-red-500/30",
      review: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      external_apply: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    };
    return colors[status] || "bg-slate-500/20 text-slate-400 border-slate-500/30";
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Job Listings
        </h1>
        <p className="text-slate-400 text-sm mt-1">Jobs found by the Automation Worker</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="skipped">Skipped</option>
          <option value="applied">Applied</option>
          <option value="failed">Failed</option>
          <option value="review">Review</option>
          <option value="external_apply">External Apply</option>
        </select>
        <select
          value={filters.platform}
          onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
          className="bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Platforms</option>
          <option value="linkedin">LinkedIn</option>
          <option value="indeed">Indeed</option>
        </select>
        <button
          onClick={fetchJobs}
          className="bg-slate-800 border border-white/10 text-slate-300 px-4 py-2 rounded-lg text-sm hover:bg-slate-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="glass-card p-8 rounded-2xl border border-white/5 text-center">
          <div className="flex flex-col items-center justify-center py-8 text-slate-500">
            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-lg mb-2">No jobs yet</p>
            <p className="text-sm">Jobs will appear here once the Automation Worker starts scraping.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job._id} className="glass-card p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <Link
                    href={`/automation/jobs/${job._id}`}
                    className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {job.title || "Untitled Job"}
                  </Link>
                  <p className="text-sm text-slate-400 mt-0.5">
                    {job.company || "Unknown Company"}{job.location ? ` · ${job.location}` : ""}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {job.platform} · Scraped {job.scrapedAt ? new Date(job.scrapedAt).toLocaleDateString() : "?"}
                    {job.salary ? ` · ${job.salary}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusBadge(job.status)}`}>
                    {job.status}
                  </span>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete "${job.title || "this job"}"?`)) return;
                      try {
                        const res = await apiClient(`/api/automation/jobs/${job._id}`, { method: "DELETE" });
                        if (res.ok) fetchJobs();
                      } catch (err) {
                        console.error("Failed to delete job", err);
                      }
                    }}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors p-1"
                    title="Delete job"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
