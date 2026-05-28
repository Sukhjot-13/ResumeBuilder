"use client";

import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;

export default function CoverLetterPdfView({ coverLetterData }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState(null);
  const [error, setError] = useState(null);
  const pdfUrlRef = useRef(null);

  useEffect(() => {
    if (!coverLetterData) return;
    let cancelled = false;

    const fetchPdf = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/render-pdf-react", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coverLetterData,
            type: "cover-letter",
          }),
        });

        if (!response.ok) {
          setError("Failed to generate PDF");
          return;
        }

        const blob = await response.blob();
        if (cancelled) return;

        const url = URL.createObjectURL(blob);
        // Revoke previous URL
        if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = url;
        setPdfUrl(url);
      } catch (err) {
        console.error("Error fetching cover letter PDF:", err);
        setError("Error loading PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPdf();

    return () => {
      cancelled = true;
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = null;
      }
    };
  }, [coverLetterData]);

  return (
    <div style={{ width: "100%", minHeight: 400, display: "flex", flexDirection: "column" }}>
      {loading && <div className="flex justify-center items-center h-96 text-white">Loading PDF...</div>}
      {error && (
        <div className="flex flex-col items-center justify-center h-96 text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
          <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01" />
          </svg>
          <p>{error}</p>
        </div>
      )}
      {pdfUrl && !loading && (
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Document
            file={pdfUrl}
            key={pdfUrl}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            loading={<div className="text-white">Loading PDF document...</div>}
            onLoadError={(e) => {
              console.error("Error loading PDF:", e);
              setError("Failed to render PDF");
            }}
          >
            {Array.from(new Array(numPages || 1), (_, index) => (
              <div key={`page_${index + 1}`} style={{ marginBottom: 12 }}>
                <Page
                  pageNumber={index + 1}
                  scale={0.7}
                  renderAnnotationLayer={false}
                  renderTextLayer={true}
                />
              </div>
            ))}
          </Document>
        </div>
      )}
    </div>
  );
}
