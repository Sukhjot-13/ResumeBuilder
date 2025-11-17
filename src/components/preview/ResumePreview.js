"use client";

import { useState } from "react";
import ResumeDisplayView from "./ResumeDisplayView";
import dynamic from "next/dynamic";
import DownloadReactPdfButton from "./DownloadReactPdfButton";

const ReactPdfView = dynamic(() => import("./ReactPdfView"), {
  ssr: false,
  loading: () => <p>Loading PDF viewer...</p>,
});

export default function ResumePreview({ tailoredResume, selectedTemplate }) {
  const [view, setView] = useState("display"); // 'display' or 'react-pdf'
  const [downloading, setDownloading] = useState(false);

  if (!tailoredResume) {
    return null;
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Resume Preview</h2>
        <div className="flex gap-4">
          <DownloadReactPdfButton
            resumeData={tailoredResume}
            selectedTemplate={selectedTemplate}
          />
        </div>
      </div>
      <div className="flex mb-4">
        <button
          onClick={() => setView("display")}
          className={`px-4 py-2 rounded-l-lg ${
            view === "display" ? "bg-blue-600" : "bg-gray-700"
          }`}
        >
          Display View
        </button>
        <button
          onClick={() => setView("react-pdf")}
          className={`px-4 py-2 rounded-r-lg ${
            view === "react-pdf" ? "bg-blue-600" : "bg-gray-700"
          }`}
        >
          React PDF
        </button>
      </div>
      <div className="w-full h-96 bg-white">
        {view === "display" && (
          <ResumeDisplayView resumeData={tailoredResume} />
        )}
        {view === "react-pdf" && (
          <ReactPdfView
            resumeData={tailoredResume}
            template={selectedTemplate}
          />
        )}
      </div>
    </div>
  );
}
