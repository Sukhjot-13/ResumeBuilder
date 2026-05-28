"use client";

import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;

export default function CoverLetterPdfView({ coverLetterData }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState(null);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 0.5 : 0.8
  );
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
        <>
          <div className="pdf-controls bg-gray-500 p-2 flex justify-center items-center space-x-4">
            <button onClick={() => setScale((s) => Math.max(s - 0.1, 0.5))} className="p-1 bg-gray-300 rounded">
              <MagnifyingGlassMinusIcon className="h-5 w-5" />
            </button>
            <span className="text-white">{(scale * 100).toFixed(0)}%</span>
            <button onClick={() => setScale((s) => s + 0.1)} className="p-1 bg-gray-300 rounded">
              <MagnifyingGlassPlusIcon className="h-5 w-5" />
            </button>
            <a href={pdfUrl} download="cover-letter.pdf" className="p-1 bg-blue-500 text-white rounded">
              <ArrowDownTrayIcon className="h-5 w-5" />
            </a>
          </div>
          <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
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
                    scale={scale}
                    renderAnnotationLayer={false}
                    renderTextLayer={true}
                  />
                </div>
              ))}
            </Document>
          </div>
        </>
      )}
    </div>
  );
}
