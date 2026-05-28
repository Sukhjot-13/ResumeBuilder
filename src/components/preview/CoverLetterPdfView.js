"use client";

import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;

export default function CoverLetterPdfView({ coverLetterData }) {
  const [pdfUrl, setPdfUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState(null);

  useEffect(() => {
    const fetchPdf = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/render-pdf-react", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coverLetterData,
            type: "cover-letter",
          }),
        });
        const blob = await response.blob();
        setPdfUrl(URL.createObjectURL(blob));
      } catch (error) {
        console.error("Error fetching cover letter PDF:", error);
      } finally {
        setLoading(false);
      }
    };

    if (coverLetterData) fetchPdf();

    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [coverLetterData]);

  return (
    <div style={{ width: "100%", minHeight: 400, display: "flex", flexDirection: "column" }}>
      {loading && <div className="flex justify-center items-center h-96 text-white">Loading PDF...</div>}
      {pdfUrl && !loading && (
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Document
            file={pdfUrl}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            loading={<div className="text-white">Loading PDF document...</div>}
            onLoadError={(error) => console.error("Error loading PDF:", error)}
          >
            {Array.from(new Array(numPages), (_, index) => (
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
