"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApiClient } from "@/hooks/useApiClient";

export default function ApplicationsPage() {
  const { user } = useAuth();
  const apiClient = useApiClient();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await apiClient("/api/automation/applications");
      if (res.ok) {
        const data = await res.json();
        setApps(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch applications", err);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status) => {
    const colors = {
      submitted: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      failed: "bg-red-500/20 text-red-400 border-red-500/30",
      pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    };
    return colors[status] || "bg-slate-500/20 text-slate-400 border-slate-500/30";
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Applications
        </h1>
        <p className="text-slate-400 text-sm mt-1">Jobs that the Automation Worker has applied to</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : apps.length === 0 ? (
        <div className="glass-card p-8 rounded-2xl border border-white/5 text-center">
          <div className="flex flex-col items-center justify-center py-8 text-slate-500">
            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg mb-2">No applications yet</p>
            <p className="text-sm">Applications will appear here once the Automation Worker starts applying.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => (
            <div key={app._id} className="glass-card p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-slate-200">{app.jobId?.title || "Unknown Job"}</p>
                  <p className="text-sm text-slate-400 mt-0.5">{app.jobId?.company || ""}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {app.platform} · Submitted {app.submittedAt ? new Date(app.submittedAt).toLocaleString() : "?"}
                    {app.errorMessage && ` · Error: ${app.errorMessage}`}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusBadge(app.status)} shrink-0 ml-3`}>
                  {app.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
