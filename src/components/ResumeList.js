"use client";

import React from "react";
import LoadingSpinner from "./common/LoadingSpinner";

export default function ResumeList({
  resumes,
  deletingId,
  onDeleteResume,
  onViewResume,
  loading,
}) {
  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold mb-4">Your Saved Resumes</h2>
      {loading ? (
        <LoadingSpinner />
      ) : resumes.length === 0 ? (
        <p>No resumes found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((resume) => (
              <div
                key={resume._id}
                className="bg-gray-800 p-6 rounded-lg shadow-lg"
              >
                <h3 className="text-xl font-semibold mb-2">
                  {resume.metadata?.jobTitle || "Resume"}
                </h3>
                {resume.metadata?.companyName && (
                  <p className="text-gray-400">
                    Company: {resume.metadata.companyName}
                  </p>
                )}
                <p className="text-gray-400">
                  Created At: {new Date(resume.createdAt).toLocaleString()}
                </p>
                <div className="flex gap-4 mt-4">
                  <button
                    onClick={() => onViewResume(resume.content)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
                  >
                    View
                  </button>
                  <button
                    onClick={() => onDeleteResume(resume._id)}
                    disabled={deletingId === resume._id}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded w-full disabled:bg-gray-500"
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
