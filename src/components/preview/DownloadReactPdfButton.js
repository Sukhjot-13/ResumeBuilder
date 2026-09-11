"use client";

import { useState } from "react";
import { checkPermission } from "@/lib/accessControl";
import { PERMISSIONS } from "@/lib/constants";
import { useToast } from "@/components/common/ToastProvider";

export default function DownloadReactPdfButton({
  resumeData,
  selectedTemplate,
  user,
}) {
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();

  const hasPermission = user && checkPermission(user, PERMISSIONS.DOWNLOAD_PDF);

  const handleDownload = async () => {
    if (!hasPermission) {
      toast.info("Upgrade to Pro to export high-resolution PDFs");
      return;
    }
    setDownloading(true);
    try {
      const response = await fetch("/api/render-pdf-react", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeData,
          template: selectedTemplate,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "tailored-resume.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();

        window.URL.revokeObjectURL(url);
      } else {
        let message = "Failed to download PDF. Please try again.";
        try {
          const data = await response.json();
          if (data?.error) message = data.error;
        } catch {}
        toast.error(message);
      }
    } catch {
      toast.error("Failed to download PDF. Please check your connection and try again.");
    }
    setDownloading(false);
  };

  // If user doesn't have permission, show locked state
  if (!hasPermission) {
    return (
      <button
        onClick={handleDownload}
        className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 text-amber-300/90 border border-amber-500/20 hover:border-amber-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
        title="Upgrade to Pro to export PDF"
      >
        <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Export PDF (Pro)</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-sm shadow-indigo-600/30 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
    >
      {downloading ? (
        <>
          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Rendering PDF...</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Download PDF</span>
        </>
      )}
    </button>
  );
}

