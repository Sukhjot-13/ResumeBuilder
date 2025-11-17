"use client";

import { useRef } from 'react';

/**
 * A component for uploading a resume file.
 * @param {object} props - The component's props.
 * @param {boolean} props.parsing - Whether a file is currently being parsed.
 * @param {function} props.handleFileUpload - The function to call when a file is uploaded.
 * @returns {JSX.Element} The rendered component.
 */
export default function ResumeUpload({ parsing, handleFileUpload }) {
  const fileInputRef = useRef(null);

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold mb-4">
        Upload Your Resume
      </h2>
      <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileUpload}
          className="hidden"
          id="resume-upload"
          ref={fileInputRef}
          disabled={parsing}
        />
        <button
          onClick={() => fileInputRef.current.click()}
          className={`cursor-pointer bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors ${
            parsing ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={parsing}
        >
          {parsing ? "Parsing..." : "Select a file"}
        </button>
        <p className="mt-2 text-sm text-gray-400">PDF or DOCX</p>
      </div>
    </div>
  );
}