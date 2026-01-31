import React, { useState } from "react";
import TermsModal from "../../components/TermsModal";

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

// ✅ 2. ENHANCED DIFF VIEWER COMPONENT (Always shows BACKEND data only)
const DiffViewer = ({ diffData }) => {
    // ✅ ALWAYS use backend diff data, ignore frontend data
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
    handleApprove, // ✅ Renamed from handleEditorApprove for generic use
    changeHistory,
    handleViewVisualDiff,
    handleDownloadDiffReport,
    handleDownloadFile,
    currentDiffData,
    isGeneratingDiff,
    isApproving,
}) => {
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [declarationAccepted, setDeclarationAccepted] = useState(false);

    if (!selectedArticle) return null;

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-full">
            {/* ---------------- PDF VIEWER SECTION ---------------- */}
            <div className="flex-1 bg-gray-100 rounded-xl border border-gray-300 p-4 flex flex-col h-[500px] lg:h-auto min-h-[500px]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-700 uppercase text-sm md:text-base">
                        {pdfViewMode === "original" ? " Editor PDF" : " Reviewer PDF"}
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

                    <div className="space-y-3">
                        {/* Corrected File Input */}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center bg-gray-50 relative hover:bg-gray-100 transition cursor-pointer">
                            <input
                                type="file"
                                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                onChange={(e) => setUploadedFile(e.target.files[0])}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            <p className="text-[10px] font-bold text-gray-500 uppercase">
                                CORRECTED FILE (DOCX ONLY)
                            </p>
                            <p className="text-xs truncate font-medium text-gray-700">
                                {uploadedFile ? `📄 ${uploadedFile.name}` : "Select Corrected DOCX"}
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

                        {/* T&C Checkbox */}
                        <div className="flex items-start gap-2 py-2">
                            <input
                                type="checkbox"
                                id="terms-acceptance"
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                checked={declarationAccepted}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setShowTermsModal(true);
                                    } else {
                                        setDeclarationAccepted(false);
                                    }
                                }}
                            />
                            <label
                                htmlFor="terms-acceptance"
                                className="text-xs text-gray-600 leading-tight cursor-pointer hover:text-gray-800"
                            >
                                I agree to the <span className="text-blue-600 font-semibold underline">Terms and Conditions</span>
                            </label>
                        </div>

                        {/* Upload Button */}
                        <button
                            onClick={handleUploadCorrection}
                            disabled={!uploadedFile || isUploading || !declarationAccepted}
                            className={`w-full py-2.5 text-sm font-bold rounded-lg shadow-sm transition text-white mt-1 ${!uploadedFile || isUploading || !declarationAccepted
                                ? "bg-gray-300 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700 active:scale-95"
                                }`}
                        >
                            {isUploading ? "Processing Diff..." : "Upload & Generate Diff"}
                        </button>
                    </div>
                </div>

                {/* T&C Modal */}
                <TermsModal
                    isOpen={showTermsModal}
                    onClose={() => setShowTermsModal(false)}
                    onAccept={() => setDeclarationAccepted(true)}
                />

                {/* 2. APPROVE BUTTON */}
                <button
                    onClick={handleApprove}
                    disabled={isApproving || selectedArticle.status === "REVIEWER_APPROVED" || selectedArticle.status === "PUBLISHED" || selectedArticle.status === "APPROVED"}
                    className={`w-full py-3 rounded-xl font-bold uppercase tracking-widest text-sm shadow-xl transition-all flex items-center justify-center gap-2 transform active:scale-95 ${isApproving || selectedArticle.status === "REVIEWER_APPROVED" || selectedArticle.status === "PUBLISHED" || selectedArticle.status === "APPROVED"
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

                {/* 4. PREVIOUS VERSION (EDITOR) */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-4">Previous Version (Editor)</h3>
                    <div className="flex flex-col gap-3">
                        {/* Prefer Editor's Corrected Word file */}
                        {(selectedArticle.editorCorrectedDocxUrl || selectedArticle.editorDocumentUrl || selectedArticle.originalWordUrl) ? (
                            <button
                                onClick={() =>
                                    handleDownloadFile(
                                        selectedArticle.editorCorrectedDocxUrl || selectedArticle.editorDocumentUrl || selectedArticle.originalWordUrl,
                                        selectedArticle.title + "_editor_version",
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
        </div>
    );
};

export default ReviewInterface;
