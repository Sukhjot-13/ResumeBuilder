"use client";

import { checkPermission, getPermissionMetadata } from "@/lib/accessControl";
import { PERMISSIONS } from "@/lib/constants";

/**
 * A component for inputting special instructions and generating a tailored resume.
 * @param {object} props - The component's props.
 * @param {string} props.specialInstructions - The current special instructions.
 * @param {function} props.setSpecialInstructions - The function to call when the special instructions change.
 * @param {function} props.handleGenerateResume - The function to call when the "Generate Tailored Resume" button is clicked.
 * @param {boolean} props.generating - Whether a tailored resume is currently being generated.
 * @param {object} props.profile - The user's profile data.
 * @returns {JSX.Element} The rendered component.
 */
export default function SpecialInstructionsInput({
  specialInstructions,
  setSpecialInstructions,
  handleGenerateResume,
  generating,
  profile,
}) {
  const canGenerate = profile && checkPermission(profile, PERMISSIONS.GENERATE_RESUME);

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold mb-4">
        Special Instructions
      </h2>
      <textarea
        className="w-full h-24 bg-gray-700 text-white p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Add any special instructions for tailoring your resume (e.g., 'Focus on leadership roles', 'Highlight my experience with React.js')..."
        value={specialInstructions}
        onChange={(e) => setSpecialInstructions(e.target.value)}
      ></textarea>
      {canGenerate ? (
        <button
          onClick={handleGenerateResume}
          className="mt-4 w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-500 transition-colors disabled:bg-gray-500"
          disabled={generating || !profile}
        >
          {generating ? "Generating..." : "Generate Tailored Resume"}
        </button>
      ) : (
        <button
          disabled
          className="mt-4 w-full bg-gray-600 text-gray-400 px-6 py-3 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed"
          title="Upgrade to Pro to generate resumes"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Generate Resume (Pro)
        </button>
      )}
    </div>
  );
}