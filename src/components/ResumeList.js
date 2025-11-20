"use client";

import React from "react";
import LoadingSpinner from "./common/LoadingSpinner";

export default function ResumeList({
  resumes,
  deletingId,
  onDeleteResume,
  onViewResume,
  loading,
  masterResume,
}) {
  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </span>
        Your Saved Resumes
      </h2>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : resumes.length === 0 && !masterResume ? (
        <div className="glass-card p-8 rounded-xl text-center border border-white/5">
          <p className="text-slate-400">No resumes found. Create your first one above!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Master Resume Card */}
          {masterResume && (
            <div
              className="glass-card p-6 rounded-xl border border-yellow-500/30 hover:border-yellow-500/50 transition-all hover:-translate-y-1 group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center text-yellow-400 group-hover:bg-yellow-600 group-hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <span className="text-xs text-yellow-400 bg-yellow-500/20 px-2 py-1 rounded-md font-semibold">
                  Master Resume
                </span>
              </div>
              
              <h3 className="text-lg font-semibold mb-1 text-white">
                {masterResume.profile?.full_name || "Master Resume"}
              </h3>
              
              <p className="text-sm text-slate-400 mb-4">
                Your primary resume template
              </p>
              
              <div className="flex gap-3 mt-4 pt-4 border-t border-yellow-500/20">
                <button
                  onClick={() => onViewResume(masterResume)}
                  className="flex-1 bg-yellow-600/10 hover:bg-yellow-600 text-yellow-400 hover:text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                >
                  View
                </button>
              </div>
            </div>
          )}
          
          {/* Generated Resumes */}
          {resumes
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((resume) => (
              <div
                key={resume._id}
                className="glass-card p-6 rounded-xl border border-white/5 hover:border-blue-500/30 transition-all hover:-translate-y-1 group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded-md">
                    {new Date(resume.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold mb-1 text-white truncate">
                  {resume.metadata?.jobTitle || "Untitled Resume"}
                </h3>
                
                {resume.metadata?.companyName && (
                  <p className="text-sm text-slate-400 mb-4 truncate">
                    Target: {resume.metadata.companyName}
                  </p>
                )}
                
                <div className="flex gap-3 mt-4 pt-4 border-t border-white/5">
                  <button
                    onClick={() => onViewResume(resume.content)}
                    className="flex-1 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    View
                  </button>
                  <button
                    onClick={() => onDeleteResume(resume._id)}
                    disabled={deletingId === resume._id}
                    className="flex-1 bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm disabled:opacity-50"
                  >
                    {deletingId === resume._id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
