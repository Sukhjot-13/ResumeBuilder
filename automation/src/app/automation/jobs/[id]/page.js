"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApiClient } from "@/hooks/useApiClient";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function JobDetailPage() {
  const { user } = useAuth();
  const apiClient = useApiClient();
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchJob();
  }, []);

  const handleApplyNow = async () => {
    setApplying(true);
    setApplyMsg({ type: "", text: "" });
    try {
      const res = await apiClient(`/api/automation/jobs/${params.id}/apply`, { method: "POST" });
      if (res.ok) {
        setApplyMsg({ type: "success", text: "Apply job queued — check the worker logs for progress." });
      } else {
        const data = await res.json();
        setApplyMsg({ type: "error", text: data.error || "Failed to queue apply" });
      }
    } catch (err) {
      setApplyMsg({ type: "error", text: "Could not reach the worker. Is it running?" });
    } finally {
      setApplying(false);
    }
  };

  const fetchJob = async () => {
    setLoading(true);
    try {
      const res = await apiClient(`/api/automation/jobs/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setJob(data);
      }
    } catch (err) {
      console.error("Failed to fetch job", err);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400 mb-4">Job not found</p>
        <Link href="/automation/jobs" className="text-blue-400 hover:text-blue-300 text-sm">
          &larr; Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Link href="/automation/jobs" className="text-blue-400 hover:text-blue-300 text-sm">
          &larr; Back to Jobs
        </Link>
        <button
          onClick={async () => {
            if (!confirm(`Delete "${job.title}"?`)) return;
            try {
              const res = await apiClient(`/api/automation/jobs/${params.id}`, { method: "DELETE" });
              if (res.ok) router.push("/automation/jobs");
            } catch (err) {
              console.error("Failed to delete job", err);
            }
          }}
          className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      </div>

      <div className="glass-card p-6 rounded-2xl border border-white/5 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              {job.title || "Untitled Job"}
            </h1>
            <p className="text-slate-400 mt-1">
              {job.company || "Unknown Company"}{job.location ? ` · ${job.location}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusBadge(job.status)}`}>
              {job.status}
            </span>
            {job.status !== "applied" && job.status !== "external_apply" && job.status !== "failed" && (
              <button
                onClick={handleApplyNow}
                disabled={applying}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applying ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Queuing...
                  </span>
                ) : "Apply Now"}
              </button>
            )}
          </div>
        </div>

        {applyMsg.text && (
          <div className={`text-sm rounded-lg p-3 mb-4 ${
            applyMsg.type === "success"
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
              : "bg-red-500/15 border border-red-500/30 text-red-400"
          }`}>
            {applyMsg.text}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-slate-500 text-xs mb-1">Platform</p>
            <p className="text-slate-200 capitalize">{job.platform || "N/A"}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-slate-500 text-xs mb-1">Salary</p>
            <p className="text-slate-200">{job.salary || "Not listed"}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-slate-500 text-xs mb-1">Scraped</p>
            <p className="text-slate-200">{job.scrapedAt ? new Date(job.scrapedAt).toLocaleString() : "N/A"}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-slate-500 text-xs mb-1">Work Mode</p>
            <p className="text-slate-200 capitalize">{job.workMode || (job.remote ? "Remote" : job.hybrid ? "Hybrid" : job.onSite ? "On-site" : "N/A")}</p>
          </div>
        </div>
      </div>

      {job.description && (
        <div className="glass-card p-6 rounded-2xl border border-white/5 mb-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-3">Description</h2>
          <div className="text-sm text-slate-400 whitespace-pre-wrap leading-relaxed">
            {job.description}
          </div>
        </div>
      )}

      {job.applyUrl && (
        <div className="glass-card p-6 rounded-2xl border border-white/5 mb-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-3">Apply URL</h2>
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm break-all"
          >
            {job.applyUrl}
          </a>
        </div>
      )}

      {job.application && job.application.status === "external_apply" && (
        <div className="glass-card p-6 rounded-2xl border border-orange-500/20 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <h2 className="text-lg font-semibold text-orange-400">External Apply</h2>
          </div>
          <p className="text-sm text-slate-400">
            This job redirected to an external application site — the automation worker cannot fill forms there.
            Open the job link above to apply manually.
          </p>
          {job.application.submittedAt && (
            <p className="text-xs text-slate-500 mt-2">
              Attempted: {new Date(job.application.submittedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {job.application && job.application.status === "submitted" && (
        <div className="glass-card p-6 rounded-2xl border border-emerald-500/20 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-emerald-400">Applied Successfully</h2>
          </div>
          <p className="text-sm text-slate-400">The AI successfully submitted an application for this job.</p>
          {job.application.submittedAt && (
            <p className="text-xs text-slate-500 mt-2">
              Submitted: {new Date(job.application.submittedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {job.gatekeeperDecision && (
        <div className="glass-card p-6 rounded-2xl border border-white/5 mb-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-3">
            Gatekeeper AI Decision
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">Confidence:</span>
              <span className="text-lg font-bold text-blue-400">{job.gatekeeperDecision.confidence ?? "N/A"}</span>
            </div>
            {job.gatekeeperDecision.action && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">Action:</span>
                <span className={`text-sm font-medium px-2.5 py-1 rounded-full border ${statusBadge(job.gatekeeperDecision.action)}`}>
                  {job.gatekeeperDecision.action}
                </span>
              </div>
            )}
            {job.gatekeeperDecision.reasoning && (
              <div>
                <span className="text-sm text-slate-400 block mb-1">AI Reasoning:</span>
                <p className="text-sm text-slate-300 bg-slate-800/50 rounded-lg p-3 whitespace-pre-wrap">
                  {job.gatekeeperDecision.reasoning}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
