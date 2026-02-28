"use client";
import React, { useState } from "react";
import Link from "next/link";
import AssignEditor from "./AssignEditor";
import AssignReviewer from "./AssignReviewer";
import Pagination from "../../../components/Pagination";

// ✅ Cite Number Input Component
function CiteNumberField({ art, saveCiteNumber }) {
    const [year, setYear] = useState("");
    const [issueNo, setIssueNo] = useState("");
    const [serialNo, setSerialNo] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // If already saved and not editing
    if (art.citationNumber && !isEditing) {
        return (
            <div className="flex flex-col items-start gap-1">
                <span className="text-xs font-black text-green-700 bg-green-100 border border-green-300 px-2 py-1 rounded-lg tracking-tight">
                    {art.citationNumber}
                </span>
                <button
                    onClick={() => {
                        const match = art.citationNumber.match(/^(\d{4}) LN\((\d+)\)A(\d+)$/);
                        if (match) {
                            setYear(match[1] || "");
                            setIssueNo(match[2] || "");
                            setSerialNo(match[3] || "");
                        }
                        setIsEditing(true);
                    }}
                    className="text-[9px] text-blue-600 hover:underline font-bold uppercase"
                >
                    Edit
                </button>
            </div>
        );
    }

    const previewNumber = year && issueNo && serialNo
        ? `${year} LN(${issueNo})A${serialNo}`
        : null;

    const handleSave = async () => {
        if (!year.trim() || !issueNo.trim() || !serialNo.trim()) return;
        setIsSaving(true);
        await saveCiteNumber(art.id, previewNumber);
        setIsSaving(false);
        setIsEditing(false);
    };

    return (
        <div className="flex flex-col gap-1 min-w-[200px]">
            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                <input
                    type="text"
                    inputMode="numeric"
                    placeholder="2026"
                    value={year}
                    onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="w-12 border border-gray-300 rounded px-1 py-0.5 text-center text-[10px] outline-none focus:border-red-500"
                />
                <span>LN(</span>
                <input
                    type="text"
                    inputMode="numeric"
                    placeholder="53"
                    value={issueNo}
                    onChange={(e) => setIssueNo(e.target.value.replace(/\D/g, ""))}
                    className="w-10 border border-gray-300 rounded px-1 py-0.5 text-center text-[10px] outline-none focus:border-red-500"
                />
                <span>)A</span>
                <input
                    type="text"
                    inputMode="numeric"
                    placeholder="1234"
                    value={serialNo}
                    onChange={(e) => setSerialNo(e.target.value.replace(/\D/g, ""))}
                    className="w-14 border border-gray-300 rounded px-1 py-0.5 text-center text-[10px] outline-none focus:border-red-500"
                />
            </div>
            {previewNumber && (
                <p className="text-[9px] text-gray-400 italic">Preview: <strong className="text-gray-700">{previewNumber}</strong></p>
            )}
            <div className="flex gap-1 mt-0.5">
                <button
                    onClick={handleSave}
                    disabled={!year || !issueNo || !serialNo || isSaving}
                    className="bg-red-600 disabled:bg-gray-300 text-white text-[9px] font-black px-2 py-1 rounded uppercase hover:bg-red-800 transition"
                >
                    {isSaving ? "Saving..." : "Save"}
                </button>
                {(isEditing || art.citationNumber) && (
                    <button
                        onClick={() => setIsEditing(false)}
                        className="text-[9px] text-gray-500 hover:underline font-bold uppercase"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
}

export default function ArticleTable({
    isLoading,
    articles,
    filteredArticles,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    showAbstract,
    setShowAbstract,
    handlePdfClick,
    assignArticle,
    assignReviewer,
    editors,
    reviewers,
    setSelectedArticle,
    setPdfViewMode,
    overrideAndPublish,
    toggleVisibility,
    saveCiteNumber,
    deleteArticle,
    // Pagination Props
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange
}) {
    const statusMap = {
        ASSIGNED_TO_EDITOR: "Stage 1 Review Assigned",
        EDITOR_EDITING: "Stage 1 Review Editing",
        EDITOR_IN_PROGRESS: "Stage 1 Review In Progress",
        EDITOR_APPROVED: "Stage 1 Review Approved",
        ASSIGNED_TO_REVIEWER: "Stage 2 Review Assigned",
        REVIEWER_EDITING: "Stage 2 Review Editing",
        REVIEWER_IN_PROGRESS: "Stage 2 Review In Progress",
        REVIEWER_APPROVED: "Stage 2 Review Approved",
    };
    const [publishingId, setPublishingId] = useState(null);

    const handlePublish = async (art) => {
        if (!art.citationNumber) {
            toast.error("Please assign a citation number first.");
            return;
        }
        setPublishingId(art.id);
        try {
            await overrideAndPublish(art.id, art.citationNumber);
        } catch (error) {
            console.error("Publishing error:", error);
        } finally {
            setPublishingId(null);
        }
    };

    // ✅ Show cite field only when stage 2 approved (or already has citation)
    const showCiteField = (art) => {
        return art.backendStatus === "REVIEWER_APPROVED" ||
            art.backendStatus === "PUBLISHED" ||
            art.backendStatus === "APPROVED" ||
            !!art.citationNumber;
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 p-5 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="font-black text-gray-700 uppercase tracking-tighter text-base md:text-lg">
                    Monitor &amp; Assign Articles
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <input
                        type="text"
                        placeholder="Search articles..."
                        className="p-2 border rounded-lg text-xs outline-none focus:border-red-600 w-full sm:w-auto"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                        className="p-2 border rounded-lg text-xs font-bold outline-none cursor-pointer w-full sm:w-auto"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="All">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="In Review">Under Review</option>
                        <option value="In Review">Reviewed </option>
                        <option value="Published">Published</option>
                    </select>
                </div>
            </div>

            {/* Desktop Table View — horizontally scrollable */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1300px]">
                    <thead className="bg-gray-100 text-[10px] uppercase text-gray-400 font-bold">
                        <tr>
                            <th className="p-4">PDF Document &amp; Abstract</th>
                            <th className="p-4">Author</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-center">Stage 1 Review</th>
                            <th className="p-4 text-center">Stage 2 Review</th>
                            <th className="p-4 text-center">Cite Number</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {isLoading ? (
                            <tr>
                                <td colSpan="7" className="p-10 text-center font-bold text-gray-500">
                                    Loading articles...
                                </td>
                            </tr>
                        ) : (
                            filteredArticles.map((art) => (
                                <tr key={art.id} className="hover:bg-red-50/30 transition-all">
                                    {/* 1. PDF & Abstract */}
                                    <td className="p-4">
                                        <p className="font-bold text-gray-800 text-sm">{art.title}</p>
                                        <button
                                            onClick={() => setShowAbstract(art)}
                                            className="text-[10px] text-red-600 font-bold uppercase mt-1 hover:underline"
                                        >
                                            View Abstract
                                        </button>
                                    </td>
                                    {/* 2. Author */}
                                    <td className="p-4">
                                        <p className="text-sm text-gray-800 font-bold">{art.author}</p>
                                    </td>
                                    {/* 3. Status Badge */}
                                    <td className="p-4">
                                        <span
                                            className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                                                art.status === "Published"
                                                    ? "bg-green-100 text-green-700"
                                                    : art.status === "In Review"
                                                    ? "bg-blue-100 text-blue-700"
                                                    : "bg-yellow-100 text-yellow-700"
                                            }`}
                                        >
                                            {statusMap[art.status] || art.status}
                                        </span>
                                    </td>
                                    {/* 4. Assign Stage 1 */}
                                    <td className="p-4 text-center">
                                        <AssignEditor
                                            article={art}
                                            editors={editors}
                                            assignArticle={assignArticle}
                                        />
                                    </td>
                                    {/* 5. Assign Stage 2 */}
                                    <td className="p-4 text-center">
                                        <AssignReviewer
                                            article={art}
                                            reviewers={reviewers}
                                            assignReviewer={assignReviewer}
                                        />
                                    </td>
                                    {/* 6. ✅ CITE NUMBER — only when REVIEWER_APPROVED */}
                                    <td className="p-4 text-center">
                                        {showCiteField(art) ? (
                                            <CiteNumberField art={art} saveCiteNumber={saveCiteNumber} />
                                        ) : (
                                            <span className="text-[10px] text-gray-300 italic">—</span>
                                        )}
                                    </td>
                                    {/* 7. Actions */}
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2 items-center">
                                            <button
                                                onClick={() => {
                                                    setSelectedArticle(art);
                                                    setPdfViewMode("original");
                                                }}
                                                className="w-[75px] bg-blue-600 text-white py-2 rounded text-[10px] font-black hover:bg-blue-800 transition-colors uppercase text-center"
                                            >
                                                Review
                                            </button>
                                            <button
                                                onClick={() => handlePublish(art)}
                                                disabled={art.status === "Published" || publishingId === art.id}
                                                className={`w-[80px] py-2 rounded text-[10px] font-black transition-colors uppercase text-center ${
                                                    art.status === "Published"
                                                        ? "bg-gray-400 cursor-not-allowed text-gray-200"
                                                        : publishingId === art.id
                                                        ? "bg-gray-800 text-white cursor-wait"
                                                        : "bg-black text-white hover:bg-green-600"
                                                }`}
                                            >
                                                {art.status === "Published"
                                                    ? "Published"
                                                    : publishingId === art.id
                                                    ? "Wait..."
                                                    : "Publish"}
                                            </button>
                                            {/* 👁 Visibility Toggle */}
                                            <button
                                                onClick={() => toggleVisibility(art.id, art.isVisible)}
                                                className={`p-1.5 rounded hover:bg-gray-100 transition-all shrink-0 ${
                                                    art.isVisible === false ? "text-gray-400" : "text-green-600"
                                                }`}
                                                title={art.isVisible === false ? "Show Article" : "Hide Article"}
                                            >
                                                {art.isVisible === false ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                )}
                                            </button>
                                            {/* 🗑 Delete Button */}
                                            <button
                                                onClick={() => deleteArticle(art.id, art.title)}
                                                className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-all shrink-0"
                                                title="Delete Article"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden flex flex-col divide-y divide-gray-100">
                {isLoading ? (
                    <div className="p-8 text-center text-gray-500 font-bold">Loading articles...</div>
                ) : (
                    filteredArticles.map((art) => (
                        <div key={art.id} className="p-4 bg-white flex flex-col gap-4">
                            {/* Header: Title & Status */}
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex-1">
                                    <p className="font-bold text-gray-900 text-lg leading-snug mb-1">
                                        {art.title}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                        <span className="font-bold text-gray-700">{art.author}</span>
                                    </div>
                                </div>
                                <span
                                    className={`shrink-0 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wide ${
                                        art.status === "Published"
                                            ? "bg-green-100 text-green-700"
                                            : art.status === "In Review"
                                            ? "bg-blue-100 text-blue-700"
                                            : "bg-yellow-100 text-yellow-700"
                                    }`}
                                >
                                    {statusMap[art.status] || art.status}
                                </span>
                            </div>

                            {/* Abstract Button */}
                            <button
                                onClick={() => setShowAbstract(art)}
                                className="text-xs text-red-600 font-bold uppercase hover:underline self-start"
                            >
                                View Abstract
                            </button>

                            {/* Assignments */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div>
                                    <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">Stage 1 Reviewer</p>
                                    <AssignEditor article={art} editors={editors} assignArticle={assignArticle} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">Stage 2 Reviewer</p>
                                    <AssignReviewer article={art} reviewers={reviewers} assignReviewer={assignReviewer} />
                                </div>
                            </div>

                            {/* ✅ Cite Number — Mobile */}
                            {showCiteField(art) && (
                                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                                    <p className="text-[10px] uppercase text-red-600 font-black mb-2">📌 Cite Number</p>
                                    <CiteNumberField art={art} saveCiteNumber={saveCiteNumber} />
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button
                                        onClick={() => {
                                            setSelectedArticle(art);
                                            setPdfViewMode("original");
                                        }}
                                        className="flex-1 sm:flex-none bg-blue-600 text-white py-2 px-4 rounded text-xs font-bold hover:bg-blue-700 transition shadow-sm uppercase"
                                    >
                                        Review
                                    </button>
                                    <button
                                        onClick={() => handlePublish(art.id)}
                                        disabled={art.status === "Published" || publishingId === art.id}
                                        className={`flex-1 sm:flex-none py-2 px-4 rounded text-xs font-bold transition shadow-sm uppercase ${
                                            art.status === "Published"
                                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                : publishingId === art.id
                                                ? "bg-gray-800 text-white cursor-wait"
                                                : "bg-black text-white hover:bg-gray-900"
                                        }`}
                                    >
                                        {art.status === "Published" ? "Published" : publishingId === art.id ? "Wait..." : "Publish"}
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* 👁 Visibility */}
                                    <button
                                        onClick={() => toggleVisibility(art.id, art.isVisible)}
                                        className={`p-2 rounded-lg transition shrink-0 ${
                                            art.isVisible === false ? "text-gray-400 bg-gray-100" : "text-green-600 bg-green-50"
                                        }`}
                                        title={art.isVisible === false ? "Show Article" : "Hide Article"}
                                    >
                                        {art.isVisible === false ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                    {/* 🗑 Delete */}
                                    <button
                                        onClick={() => deleteArticle(art.id, art.title)}
                                        className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all shrink-0"
                                        title="Delete Article"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Abstract Modal */}
            {showAbstract && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white max-w-2xl w-full rounded-2xl p-8 shadow-2xl">
                        <h3 className="text-xl font-black text-gray-800 border-b pb-4 uppercase italic tracking-tighter">
                            {showAbstract.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-6 leading-relaxed font-medium bg-gray-50 p-4 rounded-xl italic">
                            "{showAbstract.abstract}"
                        </p>
                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={() => setShowAbstract(null)}
                                className="bg-red-600 text-white px-3 py-2 md:px-5 md:py-2 rounded-lg font-bold hover:bg-black transition-all text-[10px] md:text-xs"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pagination Controls */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
                totalItems={totalItems}
                itemsPerPage={pageSize}
            />
        </div>
    );
}
