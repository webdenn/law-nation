"use client";
import React, { useState } from "react";
import Link from "next/link";
import AssignEditor from "./AssignEditor";
import AssignReviewer from "./AssignReviewer";
import Pagination from "../../../components/Pagination";
// We don't need toast here unless we add interactions that use it directly, 
// but most interactions are passed down props.

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

    const handlePublish = async (id) => {
        setPublishingId(id);
        try {
            await overrideAndPublish(id);
        } catch (error) {
            console.error("Publishing error:", error);
        } finally {
            setPublishingId(null);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 p-5 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="font-black text-gray-700 uppercase tracking-tighter text-base md:text-lg">
                    Monitor & Assign Articles
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
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead className="bg-gray-100 text-[10px] uppercase text-gray-400 font-bold">
                        <tr>
                            <th className="p-5">PDF Document & Abstract</th>
                            <th className="p-5">Author</th>
                            <th className="p-5">Status</th>
                            <th className="p-5 text-center">Stage 1 Review </th>
                            <th className="p-5 text-center">Stage 2 Review </th>
                            <th className="p-5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {isLoading ? (
                            <tr>
                                <td
                                    colSpan="6"
                                    className="p-10 text-center font-bold text-gray-500"
                                >
                                    Loading articles...
                                </td>
                            </tr>
                        ) : (
                            filteredArticles.map((art) => (
                                <tr
                                    key={art.id}
                                    className="hover:bg-red-50/30 transition-all"
                                >
                                    {/* 1. PDF & Abstract */}
                                    <td className="p-5">
                                        <p
                                            className="font-bold text-gray-800"
                                        >
                                            {art.title}
                                        </p>
                                        <button
                                            onClick={() => setShowAbstract(art)}
                                            className="text-[10px] text-red-600 font-bold uppercase mt-1 hover:underline"
                                        >
                                            View Abstract
                                        </button>
                                    </td>
                                    {/* 2. Author & Date */}
                                    <td className="p-5">
                                        <p className="text-sm text-gray-800 font-bold">
                                            {art.author}
                                        </p>
                                    </td>
                                    {/* 3. Status Badge */}
                                    <td className="p-5">
                                        <span
                                            className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${art.status === "Published"
                                                ? "bg-green-100 text-green-700"
                                                : art.status === "In Review"
                                                    ? "bg-blue-100 text-blue-700"
                                                    : "bg-yellow-100 text-yellow-700"
                                                }`}
                                        >
                                            {statusMap[art.status] || art.status}
                                        </span>
                                    </td>
                                    {/* 4. Assign Editor Dropdown */}
                                    <td className="p-5 text-center">
                                        <AssignEditor
                                            article={art}
                                            editors={editors}
                                            assignArticle={assignArticle}
                                        />
                                    </td>
                                    {/* 4.5 Assign Reviewer Dropdown */}
                                    <td className="p-5 text-center">
                                        <AssignReviewer
                                            article={art}
                                            reviewers={reviewers}
                                            assignReviewer={assignReviewer}
                                        />
                                    </td>
                                    {/* 5. Combined Actions (Publish + Delete) */}
                                    <td className="p-5 text-right flex justify-end gap-3 items-center">
                                        <button
                                            onClick={() => {
                                                setSelectedArticle(art);
                                                setPdfViewMode("original");
                                            }}
                                            className="w-[80px] bg-blue-600 text-white py-2 rounded text-[10px] font-black hover:bg-blue-800 transition-colors uppercase text-center"
                                        >
                                            Review
                                        </button>
                                        <button
                                            onClick={() => handlePublish(art.id)}
                                            disabled={art.status === "Published" || publishingId === art.id}
                                            className={`w-[90px] py-2 rounded text-[10px] font-black transition-colors uppercase text-center ${art.status === "Published"
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
                                        <button
                                            onClick={() => toggleVisibility(art.id, art.isVisible)}
                                            className={`p-2 rounded hover:bg-gray-100 transition-all shrink-0 ${art.isVisible === false ? "text-gray-400" : "text-green-600"
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
                                    <p
                                        className="font-bold text-gray-900 text-lg leading-snug mb-1"
                                    >
                                        {art.title}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                        <span className="font-bold text-gray-700">{art.author}</span>
                                    </div>
                                </div>
                                <span
                                    className={`shrink-0 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wide ${art.status === "Published"
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
                                    <AssignEditor
                                        article={art}
                                        editors={editors}
                                        assignArticle={assignArticle}
                                    />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">Stage 2 Reviewer</p>
                                    <AssignReviewer
                                        article={art}
                                        reviewers={reviewers}
                                        assignReviewer={assignReviewer}
                                    />
                                </div>
                            </div>

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
                                        className={`flex-1 sm:flex-none py-2 px-4 rounded text-xs font-bold transition shadow-sm uppercase ${art.status === "Published"
                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                            : publishingId === art.id
                                                ? "bg-gray-800 text-white cursor-wait"
                                                : "bg-black text-white hover:bg-gray-900"
                                            }`}
                                    >
                                        {art.status === "Published" ? "Published" : publishingId === art.id ? "Wait..." : "Publish"}
                                    </button>
                                </div>
                                <button
                                    onClick={() => toggleVisibility(art.id, art.isVisible)}
                                    className={`p-2 rounded-lg transition shrink-0 ${art.isVisible === false ? "text-gray-400 bg-gray-100" : "text-green-600 bg-green-50"
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
