"use client";

import { useState } from "react";
import { checkPermission, getPermissionMetadata } from "@/lib/accessControl";
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
      toast.info("Upgrade to Pro to download PDFs");
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
        a.download = "resume-react.pdf";
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
    } catch (error) {
      toast.error("Failed to download PDF. Please check your connection and try again.");
    }
    setDownloading(false);
  };

  // If user doesn't have permission, show locked state
  if (!hasPermission) {
    return (
      <button
        onClick={handleDownload}
        className="bg-gray-600 text-gray-400 px-6 py-2 rounded-lg cursor-not-allowed flex items-center gap-2"
        title="Upgrade to Pro to download PDFs"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Download PDF (Pro)
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-500 transition-colors disabled:bg-gray-500"
      disabled={downloading}
    >
      {downloading ? "Downloading..." : "Download PDF"}
    </button>
  );
}
