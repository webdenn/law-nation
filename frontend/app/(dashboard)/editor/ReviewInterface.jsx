import React, { useState } from "react";
import mammoth from "mammoth";
import EditorTermsModal from "../../components/EditorTermsModal";

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
  handleViewVisualDiff,
  handleDownloadDiffReport,
  handleDownloadFile,
  currentDiffData,
  isGeneratingDiff,
  isApproving, // ✅ NEW: Loading state for approval
}) => {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(""); // ✅ Preview State

  // ✅ PREVIEW MODAL COMPONENT
  const PreviewModal = () => {
    if (!showPreviewModal || !uploadedFile) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="bg-blue-600 p-4 flex justify-between items-center text-white shrink-0">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <WordIcon /> Confirm Upload & Preview
            </h3>
            <button
              onClick={() => {
                setShowPreviewModal(false);
                setUploadedFile(null);
                setDeclarationAccepted(false);
                setPreviewHtml("");
              }}
              className="text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            {/* File Info */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6 flex items-center gap-3 shrink-0">
              <div className="bg-white p-2 rounded-lg shadow-sm text-blue-600">
                <WordIcon />
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-gray-800 truncate text-sm">{uploadedFile.name}</p>
                <p className="text-xs text-gray-500">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>

            {/* DOCX CONTENT PREVIEW */}
            <div className="mb-6">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Document Preview:</p>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 min-h-[200px] max-h-[400px] overflow-y-auto prose prose-sm max-w-none">
                {previewHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="animate-pulse">Loading preview...</div>
                  </div>
                )}
              </div>
            </div>

            {/* Checkbox */}
            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition shrink-0">
              <input
                type="checkbox"
                className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                checked={declarationAccepted}
                onChange={(e) => setDeclarationAccepted(e.target.checked)}
              />
              <span className="text-sm text-gray-600">
                I have previewed this document and confirm it is the correct final version for upload.
              </span>
            </label>

            {/* Actions */}
            <div className="flex gap-3 mt-6 shrink-0">
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setUploadedFile(null);
                  setDeclarationAccepted(false);
                  setPreviewHtml("");
                }}
                className="flex-1 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowPreviewModal(false)}
                disabled={!declarationAccepted}
                className={`flex-1 py-2.5 text-white font-bold rounded-xl shadow-lg transition transform active:scale-95 ${declarationAccepted ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'
                  }`}
              >
                Confirm Selection
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!selectedArticle) return null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-full">
      <PreviewModal />

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
          {isGeneratingDiff && pdfViewMode === "visual-diff" ? (
            <div className="text-center text-gray-600">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
              <p className="text-sm font-medium">Generating Visual Diff...</p>
              <p className="text-xs text-gray-400 mt-2">Extracting and comparing PDFs</p>
            </div>
          ) : getPdfUrlToView() ? (
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

          {/* CHECK IF ALREADY UPLOADED - STRICT LOCK ENABLED */}
          {/* We show the form ALWAYS, but disable it if uploaded */}
          <div className="space-y-3">

            {/* Success Message if Uploaded */}
            {((selectedArticle.currentPdfUrl && selectedArticle.currentPdfUrl !== selectedArticle.originalPdfUrl) || selectedArticle.status === "EDITOR_APPROVED") && (
              <div className="bg-green-50 p-3 rounded-lg border border-green-200 flex items-center gap-3 mb-2">
                <div className="bg-green-100 p-1.5 rounded-full shrink-0">
                  <CheckCircleIcon />
                </div>
                <div>
                  <h4 className="text-green-800 font-bold text-xs">Correction Uploaded</h4>
                  <p className="text-[10px] text-green-600">Re-uploads are disabled.</p>
                </div>
              </div>
            )}

            {/* Corrected File Input */}
            <div className={`border-2 border-dashed rounded-lg p-3 text-center relative transition 
              ${((selectedArticle.currentPdfUrl && selectedArticle.currentPdfUrl !== selectedArticle.originalPdfUrl) || selectedArticle.status === "EDITOR_APPROVED")
                ? "border-gray-200 bg-gray-100 cursor-not-allowed opacity-60"
                : "border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer"}`}
            >
              <input
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                disabled={!!(selectedArticle.currentPdfUrl && selectedArticle.currentPdfUrl !== selectedArticle.originalPdfUrl) || selectedArticle.status === "EDITOR_APPROVED"}
                onChange={(e) => {
                  // ... existing logic ...
                  const file = e.target.files[0];
                  if (file) {
                    setUploadedFile(file);
                    setDeclarationAccepted(false);
                    setPreviewHtml(""); // Reset preview
                    setShowPreviewModal(true); // OPEN MODAL

                    const reader = new FileReader();
                    reader.onload = async (event) => {
                      try {
                        const arrayBuffer = event.target.result;
                        const result = await mammoth.convertToHtml({ arrayBuffer });
                        setPreviewHtml(result.value);
                      } catch (err) {
                        console.error("Preview Generation Failed", err);
                        setPreviewHtml("<p class='text-red-500'>Failed to generate preview.</p>");
                      }
                    };
                    reader.readAsArrayBuffer(file);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
              />
              <p className="text-[10px] font-bold text-gray-500 uppercase">
                CORRECTED FILE (DOCX ONLY)
              </p>
              <p className="text-xs truncate font-medium text-gray-700">
                {((selectedArticle.currentPdfUrl && selectedArticle.currentPdfUrl !== selectedArticle.originalPdfUrl) || selectedArticle.status === "EDITOR_APPROVED")
                  ? "🔒 Upload Locked"
                  : uploadedFile ? `📄 ${uploadedFile.name}` : "Click to Select File"
                }
              </p>
            </div>

            {/* SELECTED FILE DISPLAY (Post-Modal) - Hide if locked to avoid clutter */}
            {!((selectedArticle.currentPdfUrl && selectedArticle.currentPdfUrl !== selectedArticle.originalPdfUrl)) && uploadedFile && declarationAccepted && (
              <div className="bg-blue-50 p-2 rounded border border-blue-100 flex items-center gap-2 text-xs text-blue-800">
                <CheckCircleIcon />
                <span className="font-bold">Ready to Upload:</span>
                <span className="truncate">{uploadedFile.name}</span>
              </div>
            )}

            {/* Comment Input */}
            <textarea
              className="w-full p-2 text-sm border rounded bg-gray-50 focus:ring-2 ring-red-200 outline-none resize-none mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              rows="2"
              placeholder="Describe changes (e.g. Fixed typos on pg 2)..."
              value={uploadComment}
              onChange={(e) => setUploadComment(e.target.value)}
              disabled={!!(selectedArticle.currentPdfUrl && selectedArticle.currentPdfUrl !== selectedArticle.originalPdfUrl) || selectedArticle.status === "EDITOR_APPROVED"}
            />

            {/* T&C Section (Modified to use Checkbox) */}
            {!((selectedArticle.currentPdfUrl && selectedArticle.currentPdfUrl !== selectedArticle.originalPdfUrl) || selectedArticle.status === "EDITOR_APPROVED") && (
              <div className="mt-4">
                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition group">
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                    checked={declarationAccepted}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setShowTermsModal(true);
                      } else {
                        setDeclarationAccepted(false);
                      }
                    }}
                  />
                  <span className={`text-xs font-medium transition-colors ${declarationAccepted ? "text-green-700" : "text-gray-600 group-hover:text-blue-600"}`}>
                    I agree to the <span className="underline decoration-dotted underline-offset-2">Terms and Conditions</span>
                  </span>
                </label>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUploadCorrection}
              disabled={!uploadedFile || isUploading || !declarationAccepted || !!(selectedArticle.currentPdfUrl && selectedArticle.currentPdfUrl !== selectedArticle.originalPdfUrl) || selectedArticle.status === "EDITOR_APPROVED"}
              className={`w-full py-2.5 text-sm font-bold rounded-lg shadow-sm transition text-white mt-1 ${(!uploadedFile || isUploading || !declarationAccepted || !!(selectedArticle.currentPdfUrl && selectedArticle.currentPdfUrl !== selectedArticle.originalPdfUrl) || selectedArticle.status === "EDITOR_APPROVED")
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 active:scale-95"
                }`}
            >
              {isUploading ? "Uploading..." : "Upload Correction"}
            </button>
          </div>
        </div>

        {/* Editor Specific T&C Modal */}
        <EditorTermsModal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
          onAccept={() => setDeclarationAccepted(true)}
        />

        {/* 2. APPROVE BUTTON */}
        <button
          onClick={handleEditorApprove}
          disabled={isApproving || selectedArticle.status === "EDITOR_APPROVED" || selectedArticle.status === "ASSIGNED_TO_REVIEWER" || selectedArticle.status === "REVIEWER_EDITING" || selectedArticle.status === "REVIEWER_IN_PROGRESS" || selectedArticle.status === "REVIEWER_APPROVED" || selectedArticle.status === "PUBLISHED"}
          className={`w-full py-3 rounded-xl font-bold uppercase tracking-widest text-sm shadow-xl transition-all flex items-center justify-center gap-2 transform active:scale-95 ${isApproving || selectedArticle.status === "EDITOR_APPROVED" || selectedArticle.status === "ASSIGNED_TO_REVIEWER" || selectedArticle.status === "REVIEWER_EDITING" || selectedArticle.status === "REVIEWER_IN_PROGRESS" || selectedArticle.status === "REVIEWER_APPROVED" || selectedArticle.status === "PUBLISHED"
            ? "bg-gray-400 text-white cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700 text-white hover:shadow-green-200"
            }`}
        >
          {isApproving ? (
            <>
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Processing...
            </>
          ) : (
            <>
              <CheckCircleIcon /> Approve & Notify Admin
            </>
          )}
        </button>



        {/* 4. USER ORIGINAL DOCUMENT */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4">User Original Document</h3>
          <div className="flex flex-col gap-3">
            {/* Prefer current edited Word file, fallback to original */}
            {(selectedArticle.currentWordUrl || selectedArticle.originalWordUrl) ? (
              <button
                onClick={() =>
                  handleDownloadFile(
                    selectedArticle.currentWordUrl || selectedArticle.originalWordUrl,
                    selectedArticle.title + "_edited",
                    "Word"
                  )
                }
                className="flex items-center justify-center w-full py-2 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg hover:bg-blue-100 transition"
              >
                <WordIcon /> Download DOCX
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
    </div >
  );
};

export default ReviewInterface;