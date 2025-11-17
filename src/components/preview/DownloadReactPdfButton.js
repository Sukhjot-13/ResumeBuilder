
"use client";

import { useState } from 'react';

export default function DownloadReactPdfButton({ resumeData, selectedTemplate }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch('/api/render-pdf-react', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        console.error("Error downloading React PDF:", await response.text());
      }
    } catch (error) {
      console.error("Error downloading React PDF:", error);
    }
    setDownloading(false);
  };

  return (
    <button
      onClick={handleDownload}
      className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-500 transition-colors disabled:bg-gray-500"
      disabled={downloading}
    >
      {downloading ? "Downloading..." : "Download React PDF"}
    </button>
  );
}
