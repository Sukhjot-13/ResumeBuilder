"use client";

import React, { useState } from "react";
import LoadingSpinner from "./common/LoadingSpinner";
import { useApiClient } from "@/hooks/useApiClient";
import PermissionGate from "./common/PermissionGate";
import { PERMISSIONS } from "@/lib/constants";

export default function ResumeList({
  resumes,
  deletingId,
  onDeleteResume,
  onViewResume,
  loading,
  masterResume,
  onUpdateResume,
  user,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ resumeName: "", jobTitle: "", companyName: "" });
  const [savingId, setSavingId] = useState(null);
  const apiClient = useApiClient();

  const startEditing = (resume) => {
    setEditingId(resume._id);
    setEditForm({
      resumeName: resume.metadata?.resumeName || "",
      jobTitle: resume.metadata?.jobTitle || "",
      companyName: resume.metadata?.companyName || "",
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ resumeName: "", jobTitle: "", companyName: "" });
  };

  const saveEditing = async (resumeId) => {
    setSavingId(resumeId);
    try {
      const response = await apiClient(`/api/resumes/${resumeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        if (onUpdateResume) {
          onUpdateResume();
        }
        cancelEditing();
      } else {
        console.error("Failed to update resume");
      }
    } catch (error) {
      console.error("Error updating resume:", error);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="mt-12 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">Your Saved Resumes</h2>
            <p className="text-xs text-slate-400">Manage and preview all generated versions</p>
          </div>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-900 border border-white/[0.08] text-slate-400">
          {resumes.length + (masterResume ? 1 : 0)} Total
        </span>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : resumes.length === 0 && !masterResume ? (
        <div className="glass-card p-12 rounded-2xl text-center border border-white/[0.08]">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-white/[0.08] flex items-center justify-center text-slate-500 mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-slate-300 font-medium text-sm mb-1">No resumes saved yet</p>
          <p className="text-xs text-slate-500">Create your first tailored resume using the studio above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Master Resume Card */}
          {masterResume && (
            <div
              className="glass-card p-6 rounded-2xl border border-amber-500/25 hover:border-amber-500/45 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span>★</span> Master Resume
                  </span>
                </div>
                
                <h3 className="text-base font-bold mb-1 text-white truncate">
                  {masterResume.metadata?.resumeName || masterResume.content?.profile?.full_name || "Master Resume"}
                </h3>
                
                <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                  Your baseline profile template used to synthesize custom resumes.
                </p>
              </div>
              
              <div className="pt-4 border-t border-white/[0.08]">
                <button
                  onClick={() => onViewResume(masterResume.content)}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 transition-all text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview Master
                </button>
              </div>
            </div>
          )}
          
          {/* Tailored Resumes */}
          {[...resumes]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((resume) => (
              <div
                key={resume._id}
                className="glass-card glass-card-interactive p-6 rounded-2xl border border-white/[0.08] flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 bg-slate-900/80 border border-white/[0.06] px-2 py-0.5 rounded-md">
                        {new Date(resume.createdAt).toLocaleDateString()}
                      </span>
                      {editingId !== resume._id && (
                        <PermissionGate user={user} permission={PERMISSIONS.EDIT_RESUME_METADATA} fallback="hidden">
                          <button
                            onClick={() => startEditing(resume)}
                            className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-white/[0.05] rounded-md transition-colors"
                            title="Edit Details"
                            aria-label={`Edit details for ${resume.metadata?.resumeName || resume.metadata?.jobTitle || 'this resume'}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </PermissionGate>
                      )}
                    </div>
                  </div>
                  
                  {editingId === resume._id ? (
                    <div className="mb-4 space-y-2">
                      <input
                        type="text"
                        value={editForm.resumeName}
                        onChange={(e) => setEditForm({ ...editForm, resumeName: e.target.value })}
                        className="w-full app-input px-3 py-1.5 text-xs text-white"
                        placeholder="Resume Label"
                      />
                      <input
                        type="text"
                        value={editForm.jobTitle}
                        onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })}
                        className="w-full app-input px-3 py-1.5 text-xs text-white"
                        placeholder="Target Job Title"
                      />
                      <input
                        type="text"
                        value={editForm.companyName}
                        onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                        className="w-full app-input px-3 py-1.5 text-xs text-white"
                        placeholder="Company Name"
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => saveEditing(resume._id)}
                          disabled={savingId === resume._id}
                          className="flex-1 btn-primary text-xs py-1.5 rounded-lg"
                        >
                          {savingId === resume._id ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={cancelEditing}
                          disabled={savingId === resume._id}
                          className="flex-1 btn-secondary text-xs py-1.5 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-base font-bold mb-1 text-white truncate">
                        {resume.metadata?.resumeName || resume.metadata?.jobTitle || "Untitled Resume"}
                      </h3>
                      
                      <p className="text-xs text-slate-400 mb-4 truncate">
                        {resume.metadata?.jobTitle && resume.metadata?.companyName 
                          ? `${resume.metadata.jobTitle} at ${resume.metadata.companyName}`
                          : resume.metadata?.jobTitle || resume.metadata?.companyName || "Tailored version"}
                      </p>
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-2 pt-4 border-t border-white/[0.08]">
                  <button
                    onClick={() => onViewResume(resume.content)}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-600/15 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/25 transition-all text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Studio View
                  </button>
                  <PermissionGate user={user} permission={PERMISSIONS.DELETE_OWN_RESUME} fallback="hidden">
                    <button
                      onClick={() => {
                        if (!confirm("Delete this resume? This cannot be undone.")) return;
                        onDeleteResume(resume._id);
                      }}
                      disabled={deletingId === resume._id}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all disabled:opacity-50 cursor-pointer"
                      title="Delete resume"
                      aria-label="Delete resume"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </PermissionGate>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

