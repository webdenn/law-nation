"use client";

import { useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const ChevronLeft = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);
const ChevronRight = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);
const ZoomIn = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
  </svg>
);
const ZoomOut = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
  </svg>
);

export default function PdfViewer({ pdfUrl }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const onDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
  }, []);

  const onDocumentLoadError = useCallback((err) => {
    console.error("PDF load error:", err);
    setError(true);
    setLoading(false);
  }, []);

  const goToPrevPage = () => setPageNumber((p) => Math.max(1, p - 1));
  const goToNextPage = () => setPageNumber((p) => Math.min(numPages, p + 1));
  const zoomIn = () => setScale((s) => Math.min(2.5, +(s + 0.2).toFixed(1)));
  const zoomOut = () => setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(1)));

  if (error) {
    return (
      <div className="py-6 text-center text-gray-400 text-sm italic">
        PDF preview unavailable.
      </div>
    );
  }

  return (
    <div className="w-full">

      {/* Minimal inline controls — blends with page */}
      <div className="flex items-center justify-between py-3 mb-4 border-b border-gray-100">
        <div className="flex items-center gap-2 text-gray-500">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="p-1 rounded hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft />
          </button>
          <span className="text-xs font-medium tabular-nums">
            Page {pageNumber} of {numPages ?? "…"}
          </span>
          <button
            onClick={goToNextPage}
            disabled={!numPages || pageNumber >= numPages}
            className="p-1 rounded hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronRight />
          </button>
        </div>

        <div className="flex items-center gap-2 text-gray-500">
          <button onClick={zoomOut} className="p-1 rounded hover:text-gray-900 transition">
            <ZoomOut />
          </button>
          <span className="text-xs font-medium tabular-nums">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="p-1 rounded hover:text-gray-900 transition">
            <ZoomIn />
          </button>
        </div>
      </div>

      {/* PDF content — no bg, no border, just the page */}
      <div className="overflow-auto flex justify-center">
        {loading && (
          <div className="flex items-center gap-2 py-10 text-gray-400 text-sm">
            <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            Loading...
          </div>
        )}
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading=""
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>

      {/* Bottom page nav */}
      {numPages && numPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-gray-100 text-gray-500">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="flex items-center gap-1 text-xs font-medium hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft /> Previous
          </button>
          <span className="text-xs tabular-nums">{pageNumber} / {numPages}</span>
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="flex items-center gap-1 text-xs font-medium hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            Next <ChevronRight />
          </button>
        </div>
      )}
    </div>
  );
}
