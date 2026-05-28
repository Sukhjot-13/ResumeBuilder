"use client";

import { useState } from "react";
import CoverLetterDisplayView from "./CoverLetterDisplayView";
import dynamic from "next/dynamic";

const CoverLetterPdfView = dynamic(() => import("./CoverLetterPdfView"), {
  ssr: false,
  loading: () => <p className="text-white p-4">Loading PDF viewer...</p>,
});

export default function CoverLetterPreview({ coverLetterData }) {
  const [view, setView] = useState("display");

  if (!coverLetterData) return null;

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/5 h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">Cover Letter Preview</h2>
      </div>
      <div className="flex mb-4">
        <button
          onClick={() => setView("display")}
          className={`px-4 py-2 rounded-l-lg text-sm ${
            view === "display" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"
          }`}
        >
          Text View
        </button>
        <button
          onClick={() => setView("pdf")}
          className={`px-4 py-2 rounded-r-lg text-sm ${
            view === "pdf" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"
          }`}
        >
          PDF View
        </button>
      </div>
      <div className="w-full min-h-[400px]">
        {view === "display" && <CoverLetterDisplayView coverLetterData={coverLetterData} />}
        {view === "pdf" && <CoverLetterPdfView coverLetterData={coverLetterData} />}
      </div>
    </div>
  );
}
