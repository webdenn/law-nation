import React from "react";

// ✅ 1. ICONS (Yahi define kar diye taaki import ki tension na ho)
const DownloadIcon = () => (
  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const WordIcon = () => (
  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// ✅ 2. DIFF VIEWER COMPONENT
const DiffViewer = ({ diffData }) => {
  if (!diffData || !diffData.summary)
    return <p className="text-xs text-gray-400 italic">No diff data available.</p>;

  return (
    <div className="mt-3 bg-gray-50 rounded border border-gray-200 text-xs font-mono overflow-hidden">
      {/* Summary Header */}
      <div className="bg-gray-100 p-2 border-b flex gap-2 font-bold uppercase tracking-wider text-[10px]">
        <span className="text-green-600">+{diffData.summary.totalAdded} Added</span>
        <span className="text-red-600">-{diffData.summary.totalRemoved} Removed</span>
        <span className="text-blue-600">~{diffData.summary.totalModified} Modified</span>
      </div>

      {/* Scrollable Diff Body */}
      <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
        {diffData.removed?.map((line, i) => (
          <div key={`rem-${i}`} className="flex bg-red-50 text-red-700">
            <span className="w-6 text-gray-400 border-r border-red-200 mr-2 text-right pr-1 select-none">
              {line.oldLineNumber}
            </span>
            <span className="line-through decoration-red-300 opacity-75">- {line.content}</span>
          </div>
        ))}
        {diffData.added?.map((line, i) => (
          <div key={`add-${i}`} className="flex bg-green-50 text-green-700">
            <span className="w-6 text-gray-400 border-r border-green-200 mr-2 text-right pr-1 select-none">
              {line.newLineNumber}
            </span>
            <span>+ {line.content}</span>
          </div>
        ))}
        {diffData.modified?.map((line, i) => (
          <div key={`mod-${i}`} className="flex bg-blue-50 text-blue-700">
            <span className="w-6 text-gray-400 border-r border-blue-200 mr-2 text-right pr-1 select-none">
              {line.newLineNumber}
            </span>
            <span>~ {line.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ✅ 3. MAIN COMPONENT (Jo export hoga)
const ReviewInterface = ({
  selectedArticle,
  pdfViewMode,
  getPdfUrlToView,
  uploadedFile,
  setUploadedFile,
  uploadComment,
  setUploadComment,
  isUploading,
  handleUploadCorrection,
  handleEditorApprove,
  changeHistory,
  handleViewVisualDiff, // ye shayad ab use na ho raha ho kyunki sidebar se click ho raha hai, but rakh lo
  handleDownloadDiffReport,
  handleDownloadFile,
}) => {
  if (!selectedArticle) return null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-full">
      {/* ---------------- PDF VIEWER SECTION ---------------- */}
      <div className="flex-1 bg-gray-100 rounded-xl border border-gray-300 p-4 flex flex-col h-[500px] lg:h-auto min-h-[500px]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-700 uppercase text-sm md:text-base">
            {pdfViewMode === "original" ? " Original Submission" : " Latest Edited Version"}
          </h3>
          {getPdfUrlToView() && (
            <a
              href={getPdfUrlToView()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              Open in New Tab ↗
            </a>
          )}
        </div>

        <div className="flex-1 bg-white rounded-lg shadow-inner flex items-center justify-center border-2 border-dashed border-gray-300 relative overflow-hidden">
          {getPdfUrlToView() ? (
            <iframe
              src={getPdfUrlToView()}
              className="w-full h-full absolute inset-0"
              title="PDF Viewer"
            />
          ) : (
            <div className="text-center text-gray-400">
              <p className="text-4xl mb-2">📄</p>
              <p>PDF not available for this version</p>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- ACTION PANEL (Right Side) ---------------- */}
      <div className="w-full lg:w-[350px] space-y-6 shrink-0 h-full overflow-y-auto pb-10">
        
        {/* 1. UPLOAD SECTION */}
        <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            Upload Correction
          </h3>

          <div className="space-y-3">
            {/* Corrected File Input */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center bg-gray-50 relative hover:bg-gray-100 transition cursor-pointer">
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => setUploadedFile(e.target.files[0])}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <p className="text-[10px] font-bold text-gray-500 uppercase">
                CORRECTED FILE
              </p>
              <p className="text-xs truncate font-medium text-gray-700">
                {uploadedFile ? `📄 ${uploadedFile.name}` : "Select Corrected Version"}
              </p>
            </div>

            {/* Comment Input */}
            <textarea
              className="w-full p-2 text-sm border rounded bg-gray-50 focus:ring-2 ring-red-200 outline-none resize-none mt-2"
              rows="2"
              placeholder="Describe changes (e.g. Fixed typos on pg 2)..."
              value={uploadComment}
              onChange={(e) => setUploadComment(e.target.value)}
            />

            {/* Upload Button */}
            <button
              onClick={handleUploadCorrection}
              disabled={!uploadedFile || isUploading}
              className={`w-full py-2.5 text-sm font-bold rounded-lg shadow-sm transition text-white mt-2 ${
                !uploadedFile
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-95"
              }`}
            >
              {isUploading ? "Processing Diff..." : "Upload & Generate Diff"}
            </button>
          </div>
        </div>

        {/* 2. APPROVE BUTTON */}
        <button
          onClick={handleEditorApprove}
          className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg transition flex items-center justify-center gap-2 transform active:scale-95"
        >
          <CheckCircleIcon /> Approve & Notify Admin
        </button>

        {/* 3. CHANGE HISTORY LIST */}
        <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Change History</h3>

          <div className="space-y-6">
            {changeHistory.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-2">No edits made yet.</p>
            ) : (
              changeHistory.map((log) => (
                <div key={log.id || log._id} className="relative pl-4 border-l-2 border-gray-200">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white"></div>
                  
                  <div className="mb-1">
                    <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      Version {log.versionNumber}
                    </span>
                    <span className="text-[10px] text-gray-400 ml-2">
                      {new Date(log.editedAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-600 italic mb-2">
                    "{log.comments || "No comments provided"}"
                  </p>

                  <button
                    onClick={() => handleDownloadDiffReport(log.id || log._id, "pdf")}
                    className="mb-2 flex items-center text-[10px] font-bold text-red-600 hover:text-red-800 bg-red-50 px-2 py-1 rounded border border-red-100 transition"
                  >
                    <DownloadIcon /> Download PDF Report
                  </button>
                  
                  <button
                    onClick={() => handleDownloadDiffReport(log.id || log._id, "word")}
                    className="flex items-center text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded border border-blue-100 transition"
                  >
                    <WordIcon /> Download Word Report
                  </button>

                  <DiffViewer diffData={log.diffData} />
                </div>
              ))
            )}

            {/* Original Submission Marker */}
            <div className="relative pl-4 border-l-2 border-gray-200 opacity-60">
              <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-gray-400 ring-4 ring-white"></div>
              <p className="text-xs font-bold text-gray-500">Original Submission</p>
            </div>
          </div>
        </div>

        {/* 4. SOURCE FILES */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4">Source Files</h3>
          <div className="flex flex-col gap-3">
            {selectedArticle.originalWordUrl ? (
              <button
                onClick={() =>
                  handleDownloadFile(selectedArticle.originalWordUrl, selectedArticle.title, "Word")
                }
                className="flex items-center justify-center w-full py-2 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg hover:bg-blue-100 transition"
              >
                <WordIcon /> Download Word
              </button>
            ) : (
              <div className="text-xs text-center text-gray-400">No Word file</div>
            )}

            {selectedArticle.originalPdfUrl && (
              <button
                onClick={() =>
                  handleDownloadFile(selectedArticle.originalPdfUrl, selectedArticle.title, "PDF")
                }
                className="flex items-center justify-center w-full py-2 bg-red-50 text-red-700 border border-red-200 text-xs font-bold rounded-lg hover:bg-red-100 transition"
              >
                <DownloadIcon /> Download PDF
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewInterface;