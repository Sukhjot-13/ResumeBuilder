"use client";

/**
 * JobDescriptionInput
 *
 * Props:
 *   jobDescription     {string}   - current value
 *   setJobDescription  {function} - setter
 *   loading            {boolean}  - show skeleton while profile is fetching
 */
export default function JobDescriptionInput({ jobDescription, setJobDescription, loading = false }) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Job Description
      </h2>

      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-700 rounded w-5/6" />
          <div className="h-4 bg-gray-700 rounded w-2/3" />
          <div className="h-4 bg-gray-700 rounded w-full mt-1" />
        </div>
      ) : (
        <textarea
          className="w-full h-36 bg-gray-700 text-white p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm placeholder-gray-500"
          placeholder="Paste the job description here…"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />
      )}
    </div>
  );
}