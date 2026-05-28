"use client";

import { useState } from "react";

export default function DownloadCoverLetterPdfButton({ coverLetterData }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch("/api/render-pdf-react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coverLetterData,
          type: "cover-letter",
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "cover-letter.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        console.error("Error downloading cover letter PDF:", await response.text());
      }
    } catch (error) {
      console.error("Error downloading cover letter PDF:", error);
    }
    setDownloading(false);
  };

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {downloading ? "Downloading..." : "Download PDF"}
    </button>
  );
}
