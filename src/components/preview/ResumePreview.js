"use client";

import { useState } from "react";
import ResumeDisplayView from "./ResumeDisplayView";
import dynamic from "next/dynamic";
import DownloadReactPdfButton from "./DownloadReactPdfButton";

const ReactPdfView = dynamic(() => import("./ReactPdfView"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-xs text-slate-400 gap-2">
      <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <span>Loading PDF renderer...</span>
    </div>
  ),
});

export default function ResumePreview({
  tailoredResume,
  selectedTemplate,
  user,
  templateSelector,
}) {
  const [view, setView] = useState("display"); // 'display' or 'react-pdf'

  if (!tailoredResume) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Studio Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/80 border border-white/[0.08] shadow-sm">
        {/* Template Selector */}
        <div className="flex items-center gap-2">
          {templateSelector}
        </div>

        {/* View Switcher & Action */}
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center p-0.5 rounded-lg bg-[#0a0f1d] border border-white/[0.08]">
            <button
              onClick={() => setView("display")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                view === "display"
                  ? "bg-indigo-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Document
            </button>
            <button
              onClick={() => setView("react-pdf")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                view === "react-pdf"
                  ? "bg-indigo-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              PDF View
            </button>
          </div>

          <DownloadReactPdfButton
            resumeData={tailoredResume}
            selectedTemplate={selectedTemplate}
            user={user}
          />
        </div>
      </div>

      {/* Document Canvas */}
      <div className="w-full min-h-[500px] max-h-[700px] overflow-y-auto p-4 sm:p-6 rounded-2xl bg-[#070c18]/90 border border-white/[0.06] shadow-inner flex justify-center">
        {view === "display" && (
          <div className="w-full">
            <ResumeDisplayView resumeData={tailoredResume} />
          </div>
        )}
        {view === "react-pdf" && (
          <div className="w-full flex justify-center">
            <ReactPdfView
              resumeData={tailoredResume}
              template={selectedTemplate}
            />
          </div>
        )}
      </div>
    </div>
  );
}

