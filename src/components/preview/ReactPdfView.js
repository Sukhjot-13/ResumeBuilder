"use client";

import React, { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import useWindowWidth from "../../hooks/useWindowWidth";
import {
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;

export default function ReactPdfView({ resumeData, template }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(0.5);
  const [error, setError] = useState(null);
  const pdfUrlRef = useRef(null);
  const { width } = useWindowWidth();

  useEffect(() => {
    if (!resumeData) return;
    let cancelled = false;

    const fetchPdf = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/render-pdf-react", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeData, template }),
        });

        if (!response.ok) {
          setError("Failed to generate PDF");
          return;
        }

        const blob = await response.blob();
        if (cancelled) return;

        if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
        const url = URL.createObjectURL(blob);
        pdfUrlRef.current = url;
        setPdfUrl(url);
      } catch (error) {
        console.error("Error fetching PDF:", error);
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
  }, [resumeData, template]);

  function onLoadSuccess({ numPages: nextNumPages }) {
    setNumPages(nextNumPages);
  }

  function zoomIn() {
    setScale((prevScale) => prevScale + 0.1);
  }

  function zoomOut() {
    setScale((prevScale) => Math.max(prevScale - 0.1, 0.5));
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {loading && (
        <div className="flex justify-center items-center h-full text-white">
          Loading PDF...
        </div>
      )}
      {error && (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
          <p>{error}</p>
        </div>
      )}
      {pdfUrl && !loading && (
        <>
          <div className="pdf-controls bg-gray-500 p-2 flex justify-center items-center space-x-4">
            <button onClick={zoomOut} className="p-1 bg-gray-300 rounded">
              <MagnifyingGlassMinusIcon className="h-5 w-5" />
            </button>
            <span className="text-white">{(scale * 100).toFixed(0)}%</span>
            <button onClick={zoomIn} className="p-1 bg-gray-300 rounded">
              <MagnifyingGlassPlusIcon className="h-5 w-5" />
            </button>
            <a
              href={pdfUrl}
              download="resume.pdf"
              className="p-1 bg-blue-500 text-white rounded"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
            </a>
          </div>
          <div
            style={{
              flex: 1,
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Document
              file={pdfUrl}
              key={pdfUrl}
              onLoadSuccess={onLoadSuccess}
              loading={<div className="text-white">Loading PDF document...</div>}
              onLoadError={(error) => {
                console.error("Error loading PDF:", error);
                setError("Failed to render PDF");
              }}
            >
              {Array.from(new Array(numPages), (el, index) => (
                <div
                  key={`page_${index + 1}`}
                  style={{
                    marginBottom: 12,
                    borderBottom: "1px solid black",
                  }}
                >
                  <Page
                    pageNumber={index + 1}
                    scale={scale}
                    width={Math.min(1200, width ? width - 20 : 1180)}
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
