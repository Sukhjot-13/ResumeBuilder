"use client";

/**
 * A component for inputting a job description.
 * @param {object} props - The component's props.
 * @param {string} props.jobDescription - The current job description.
 * @param {function} props.setJobDescription - The function to call when the job description changes.
 * @returns {JSX.Element} The rendered component.
 */
export default function JobDescriptionInput({ jobDescription, setJobDescription }) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold mb-4">Job Description</h2>
      <textarea
        className="w-full h-24 bg-gray-700 text-white p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Paste the job description here..."
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
      ></textarea>
    </div>
  );
}