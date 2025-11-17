"use client";

export default function JobDescription({ jobDescription, setJobDescription }) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold mb-4">Job Description</h2>
      <textarea
        className="w-full h-40 bg-gray-700 text-white p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Paste the job description here..."
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
      ></textarea>
    </div>
  );
}
