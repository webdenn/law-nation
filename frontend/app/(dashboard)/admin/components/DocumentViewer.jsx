"use client";
import React, { useState } from "react";
import MultiDiffViewer from "../MultiDiffViewer";

// Internal DownloadIcon Component
const DownloadIcon = () => (
    <svg
        className="w-3 h-3 mr-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
    </svg>
);

// ✅ Citation Editor — always visible in review panel, no status restriction
function CitationEditor({ article, saveCiteNumber }) {
    const [year, setYear] = useState("");
    const [issueNo, setIssueNo] = useState("");
    const [serialNo, setSerialNo] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Show saved state
    if (article.citationNumber && !isEditing) {
        return (
            <div className="space-y-2">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start justify-between gap-2">
                    <div>
                        <p className="text-[10px] text-green-600 font-bold uppercase tracking-wide mb-1">Citation Assigned</p>
                        <p className="text-sm font-black text-green-800 tracking-tight">{article.citationNumber}</p>
                    </div>
                    <button
                        onClick={() => {
                            const match = article.citationNumber.match(/^(\d{4}) LN\((\d+)\)A(\d+)$/);
                            if (match) { setYear(match[1]); setIssueNo(match[2]); setSerialNo(match[3]); }
                            setIsEditing(true);
                        }}
                        className="text-[10px] bg-white border border-green-300 text-green-700 hover:bg-green-100 px-2 py-1 rounded font-bold uppercase transition shrink-0"
                    >
                        Edit
                    </button>
                </div>
            </div>
        );
    }

    const preview = year && issueNo && serialNo ? `${year} LN(${issueNo})A${serialNo}` : null;

    const handleSave = async () => {
        if (!year.trim() || !issueNo.trim() || !serialNo.trim()) return;
        setIsSaving(true);
        await saveCiteNumber(article.id, preview);
        setIsSaving(false);
        setIsEditing(false);
    };

    return (
        <div className="space-y-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Format: YYYY LN(XX)ANNNNN</p>
                <div className="flex items-center gap-1 text-xs font-bold text-gray-700 flex-wrap">
                    <input
                        type="text" inputMode="numeric" placeholder="2026"
                        value={year}
                        onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        className="w-14 border-2 border-gray-300 focus:border-red-500 rounded px-2 py-1 text-center text-xs outline-none font-bold transition"
                    />
                    <span className="text-gray-400">LN(</span>
                    <input
                        type="text" inputMode="numeric" placeholder="53"
                        value={issueNo}
                        onChange={(e) => setIssueNo(e.target.value.replace(/\D/g, ""))}
                        className="w-12 border-2 border-gray-300 focus:border-red-500 rounded px-2 py-1 text-center text-xs outline-none font-bold transition"
                    />
                    <span className="text-gray-400">)A</span>
                    <input
                        type="text" inputMode="numeric" placeholder="1234"
                        value={serialNo}
                        onChange={(e) => setSerialNo(e.target.value.replace(/\D/g, ""))}
                        className="w-16 border-2 border-gray-300 focus:border-red-500 rounded px-2 py-1 text-center text-xs outline-none font-bold transition"
                    />
                </div>
                {preview && (
                    <p className="text-[10px] text-gray-500 mt-2 italic">
                        Preview: <strong className="text-gray-800 not-italic">{preview}</strong>
                    </p>
                )}
            </div>
            <div className="flex gap-2">
                <button
                    onClick={handleSave}
                    disabled={!issueNo || !serialNo || isSaving}
                    className="flex-1 py-2 rounded text-xs font-black uppercase transition-all disabled:bg-gray-200 disabled:text-gray-400 bg-red-600 hover:bg-red-700 text-white"
                >
                    {isSaving ? "Saving..." : "Save Citation"}
                </button>
                {isEditing && (
                    <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-2 rounded text-xs font-bold text-gray-500 border border-gray-200 hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
}

export default function DocumentViewer({
    selectedArticle,
    setSelectedArticle,
    pdfViewMode,
    setPdfViewMode,
    handleDownloadFile,
    isGeneratingDiff,
    handleViewVisualDiff,
    showMultiDiff,
    setShowMultiDiff,
    changeHistory,
    NEXT_PUBLIC_BASE_URL,
    getPdfUrlToView,
    uploadedFile,
    setUploadedFile,
    uploadComment,
    setUploadComment,
    handleAdminUpload,
    isUploading,
    overrideAndPublish,
    isPublishing,
    saveCiteNumber,
}) {
    return (
        <>
            {/* MULTI-DIFF VIEWER OVERLAY */}
            {showMultiDiff && selectedArticle && (
                <MultiDiffViewer
                    selectedArticle={selectedArticle}
                    changeHistory={changeHistory}
                    onClose={() => setShowMultiDiff(false)}
                    adminToken={localStorage.getItem("adminToken")}
                    NEXT_PUBLIC_BASE_URL={NEXT_PUBLIC_BASE_URL}
                />
            )}

            {selectedArticle && (
                <div className="fixed inset-0 bg-white z-60 flex flex-col overflow-hidden animate-in fade-in duration-300 font-sans">
                    {/* HEADER */}
                    <header className="bg-red-700 text-white p-4 flex justify-between items-center shadow-md">
                        <div className="flex items-center gap-4">
                            <h3 className="font-black italic text-lg uppercase tracking-wider">
                                Admin Review Mode
                            </h3>
                            <span className="bg-white/20 px-3 py-1 rounded text-xs font-medium">
                                {selectedArticle.title}
                            </span>
                        </div>
                        <button
                            onClick={() => setSelectedArticle(null)}
                            className="bg-black hover:bg-gray-800 px-6 py-2 rounded text-xs font-bold uppercase transition-all"
                        >
                            Close Review
                        </button>
                    </header>

                    <div className="flex flex-col lg:flex-row flex-1 overflow-hidden bg-gray-100">

                        {/* 🔴 1. SIDEBAR (Simple Text Tabs) */}
                        <div className="w-full lg:w-64 bg-white border-r lg:border-r border-b lg:border-b-0 border-gray-200 flex flex-col shrink-0 h-auto lg:h-full max-h-[200px] lg:max-h-full">
                            {/* Document Options Menu */}
                            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                                <p className="text-[10px] font-bold text-red-800 uppercase tracking-widest mb-3 ml-2">
                                    Document Versions
                                </p>

                                {/* 1. Original Submission */}
                                <div className={`w-full flex items-center rounded-lg transition-all ${pdfViewMode === "original"
                                    ? "bg-red-50 ring-1 ring-red-200"
                                    : "hover:bg-red-50"
                                    }`}>
                                    <button
                                        onClick={() => setPdfViewMode("original")}
                                        className={`flex-1 text-left px-4 py-3 text-xs font-bold flex items-center gap-3 ${pdfViewMode === "original"
                                            ? "text-red-700"
                                            : "text-gray-500 hover:text-red-700"
                                            }`}
                                    >
                                        Original Submission
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const url = selectedArticle.originalWordUrl || selectedArticle.originalPdfUrl;
                                            const type = selectedArticle.originalWordUrl ? "Word" : "PDF";
                                            handleDownloadFile(url, `Original_${selectedArticle.title}`, type);
                                        }}
                                        className="p-3 text-gray-400 hover:text-red-700 transition"
                                        title="Download Original"
                                    >
                                        <DownloadIcon />
                                    </button>
                                </div>

                                {/* 2. Admin Version */}
                                <div className={`w-full flex items-center rounded-lg transition-all ${pdfViewMode === "admin"
                                    ? "bg-red-50 ring-1 ring-red-200"
                                    : !selectedArticle.latestAdminPdfUrl ? "" : "hover:bg-red-50"
                                    }`}>
                                    <button
                                        onClick={() => setPdfViewMode("admin")}
                                        disabled={!selectedArticle.latestAdminPdfUrl}
                                        className={`flex-1 text-left px-4 py-3 text-xs font-bold flex items-center gap-3 ${pdfViewMode === "admin"
                                            ? "text-red-700"
                                            : !selectedArticle.latestAdminPdfUrl ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:text-red-700"
                                            }`}
                                    >
                                        Admin Edited (Latest)
                                    </button>
                                    {selectedArticle.latestAdminPdfUrl && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // handleDownloadFile(selectedArticle.latestAdminPdfUrl, `Admin_Edited_${selectedArticle.title}`, "PDF");
                                                handleDownloadFile(selectedArticle.latestAdminPdfUrl.replace('.docx', '.pdf'), `Admin_Edited_${selectedArticle.title}`, "PDF");
                                            }}
                                            className="p-3 text-gray-400 hover:text-red-700 transition"
                                            title="Download Admin Version"
                                        >
                                            <DownloadIcon />
                                        </button>
                                    )}
                                </div>

                                {/* 3. Editor Version */}
                                <div className={`w-full flex items-center rounded-lg transition-all ${pdfViewMode === "editor"
                                    ? "bg-blue-50 ring-1 ring-blue-200"
                                    : !selectedArticle.latestEditorPdfUrl ? "" : "hover:bg-blue-50"
                                    }`}>
                                    <button
                                        onClick={() => setPdfViewMode("editor")}
                                        disabled={!selectedArticle.latestEditorPdfUrl}
                                        className={`flex-1 text-left px-4 py-3 text-xs font-bold flex items-center gap-3 ${pdfViewMode === "editor"
                                            ? "text-blue-700"
                                            : !selectedArticle.latestEditorPdfUrl ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:text-blue-700"
                                            }`}
                                    >
                                        Stage 1 Review
                                    </button>
                                    {selectedArticle.latestEditorPdfUrl && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownloadFile(selectedArticle.latestEditorPdfUrl, `Stage_1_Review_Version_${selectedArticle.title}`, "PDF");
                                            }}
                                            className="p-3 text-gray-400 hover:text-blue-700 transition"
                                            title="Download Editor Version"
                                        >
                                            <DownloadIcon />
                                        </button>
                                    )}
                                </div>

                                {/* 4. Reviewer Version */}
                                <div className={`w-full flex items-center rounded-lg transition-all ${pdfViewMode === "reviewer"
                                    ? "bg-purple-50 ring-1 ring-purple-200"
                                    : !selectedArticle.latestReviewerPdfUrl ? "" : "hover:bg-purple-50"
                                    }`}>
                                    <button
                                        onClick={() => setPdfViewMode("reviewer")}
                                        disabled={!selectedArticle.latestReviewerPdfUrl}
                                        className={`flex-1 text-left px-4 py-3 text-xs font-bold flex items-center gap-3 ${pdfViewMode === "reviewer"
                                            ? "text-purple-700"
                                            : !selectedArticle.latestReviewerPdfUrl
                                                ? "text-gray-300 cursor-not-allowed"
                                                : "text-gray-500 hover:text-purple-700"
                                            }`}
                                    >
                                        Stage 2 Review
                                    </button>
                                    {selectedArticle.latestReviewerPdfUrl && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownloadFile(selectedArticle.latestReviewerPdfUrl, `Stage_2_Review_Version_${selectedArticle.title}`, "PDF");
                                            }}
                                            className="p-3 text-gray-400 hover:text-purple-700 transition"
                                            title="Download Reviewer Version"
                                        >
                                            <DownloadIcon />
                                        </button>
                                    )}
                                </div>

                                <button
                                    disabled={isGeneratingDiff}
                                    onClick={() => handleViewVisualDiff()}
                                    className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold transition-all flex items-center gap-3 ${pdfViewMode === "visual-diff"
                                        ? "bg-red-50 text-red-700 shadow-sm ring-1 ring-red-200"
                                        : "text-gray-500 hover:bg-red-50 hover:text-red-700"
                                        }`}
                                >
                                    {isGeneratingDiff ? "Generating..." : "View Track File"}
                                </button>

                                <div className="border-t border-gray-200 my-2 pt-2"></div>

                                <button
                                    onClick={() => setShowMultiDiff(true)}
                                    className="w-full text-left px-4 py-3 rounded-lg text-xs font-bold transition-all flex items-center gap-3 text-white bg-black hover:bg-gray-800 shadow-md"
                                >
                                    Open Multi-Diff Viewer
                                </button>
                            </nav>
                        </div>

                        {/* ⚪ 2. MAIN VIEWER */}
                        <div className="flex-1 flex flex-col relative bg-gray-200 p-4 overflow-hidden">
                            <div className="flex-1 bg-white shadow-lg rounded-lg overflow-hidden relative">
                                {getPdfUrlToView() ? (
                                    <iframe
                                        key={getPdfUrlToView()}
                                        src={getPdfUrlToView()}
                                        className="w-full h-full border-none"
                                        title="Viewer"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center flex-col text-gray-400 gap-2">
                                        <p className="text-sm font-medium">
                                            {isGeneratingDiff ? "Processing Visual Diff..." : "Select a document version to view"}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 🔵 3. ACTION PANEL */}
                        <div className="w-full lg:w-[350px] bg-white border-l lg:border-l border-t lg:border-t-0 border-gray-200 flex flex-col shrink-0 overflow-y-auto h-auto lg:h-full">
                            <div className="p-6 space-y-8">

                                {/* Upload Section */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-800 uppercase mb-3">
                                        Upload Admin Edit
                                    </h3>
                                    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-400 hover:bg-red-50/50 transition-colors bg-gray-50 text-center cursor-pointer relative group">
                                        <input
                                            type="file"
                                            accept=".docx"
                                            onChange={(e) => setUploadedFile(e.target.files[0])}
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        />
                                        <p className="text-xs font-bold text-gray-500 uppercase group-hover:text-red-600">
                                            {uploadedFile ? uploadedFile.name : "Select Corrected DOCX"}
                                        </p>
                                    </div>
                                    <textarea
                                        className="w-full mt-3 p-3 border rounded-lg text-xs outline-none focus:border-red-600 resize-none bg-gray-50"
                                        rows="2"
                                        placeholder="Add comments (optional)..."
                                        value={uploadComment}
                                        onChange={(e) => setUploadComment(e.target.value)}
                                    />
                                    <button
                                        onClick={handleAdminUpload}
                                        disabled={isUploading || !uploadedFile}
                                        className={`w-full mt-3 py-3 rounded text-xs font-bold uppercase transition-all ${isUploading || !uploadedFile
                                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                            : "bg-blue-600 hover:bg-blue-700 text-white"
                                            }`}
                                    >
                                        {isUploading ? "Processing Diff..." : "Upload & Generate Diff"}
                                    </button>
                                </div>

                                {/* Citation Number Section */}
                                <div className="pt-0">
                                    <h3 className="text-sm font-bold text-gray-800 uppercase mb-3 flex items-center gap-2">
                                        <span>📌</span> Citation Number
                                    </h3>
                                    {selectedArticle.citationNumber ? (
                                        <CitationEditor article={selectedArticle} saveCiteNumber={saveCiteNumber} />
                                    ) : (
                                        <CitationEditor article={selectedArticle} saveCiteNumber={saveCiteNumber} />
                                    )}
                                </div>

                                {/* Publish Section */}
                                <div className="pt-6 border-t border-gray-100">
                                    <h3 className="text-sm font-bold text-gray-800 uppercase mb-3">
                                        Final Decision
                                    </h3>
                                    <button
                                        onClick={() => {
                                            if (!selectedArticle.citationNumber) {
                                                import("react-toastify").then(({ toast }) => toast.error("Please assign a citation number first."));
                                                return;
                                            }
                                            overrideAndPublish(selectedArticle.id, selectedArticle.citationNumber);
                                        }}
                                        disabled={isPublishing || selectedArticle.status === "Published"}
                                        className={`w-full py-4 text-white rounded font-black shadow-md transition-all uppercase tracking-tight ${isPublishing || selectedArticle.status === "Published"
                                            ? "bg-gray-400 cursor-not-allowed"
                                            : "bg-green-600 hover:bg-green-700"
                                            }`}
                                    >
                                        {isPublishing ? "Publishing..." : selectedArticle.status === "Published" ? "Already Published" : "Direct Publish"}
                                    </button>
                                </div>

                                {/* Downloads Section */}
                                <div className="pt-6 border-t border-gray-100 space-y-2">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">
                                        Downloads
                                    </h3>
                                    <button
                                        onClick={() =>
                                            handleDownloadFile(
                                                selectedArticle.originalWordUrl || selectedArticle.originalPdfUrl,
                                                `Original_${selectedArticle.title}`,
                                                "Word"
                                            )
                                        }
                                        className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-blue-700 border border-gray-200 rounded text-xs font-bold transition"
                                    >
                                        Original Submission (DOCX)
                                    </button>
                                    <button
                                        onClick={() =>
                                            handleDownloadFile(
                                                selectedArticle.currentWordUrl,
                                                `Final_${selectedArticle.title}`,
                                                "Word"
                                            )
                                        }
                                        disabled={!selectedArticle.currentWordUrl}
                                        className={`w-full py-2 border rounded text-xs font-bold transition ${selectedArticle.currentWordUrl
                                            ? "bg-gray-50 hover:bg-gray-100 text-green-700 border-gray-200"
                                            : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                            }`}
                                    >
                                        Final Version (DOCX)
                                    </button>

                                    {/* Removed Admin Edited DOCX Button as per request */}

                                    {/* Removed Admin Edited DOCX Button as per request */}
                                </div>

                            </div>
                        </div>

                    </div>
                </div >
            )}
        </>
    );
}
