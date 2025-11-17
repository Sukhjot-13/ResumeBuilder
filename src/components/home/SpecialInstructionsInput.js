"use client";

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
      <button
        onClick={handleGenerateResume}
        className="mt-4 w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-500 transition-colors disabled:bg-gray-500"
        disabled={generating || !profile}
      >
        {generating ? "Generating..." : "Generate Tailored Resume"}
      </button>
    </div>
  );
}