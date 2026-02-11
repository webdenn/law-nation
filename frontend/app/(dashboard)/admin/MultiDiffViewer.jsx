import React, { useState, useEffect } from "react";
import { compareTexts, getChangeStats } from "../../utilis/diffutilis";

// ✅ INLINE VISUAL DIFF RENDERER (Like "Detailed Changes" in PDF)
const InlineDiffRenderer = ({ diffArray, emptyMessage }) => {
    if (!diffArray || diffArray.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-gray-300 italic text-xs p-4">
                {emptyMessage || "No changes detected"}
            </div>
        );
    }

    return (
        <div className="bg-white p-4 text-[11px] leading-relaxed font-mono whitespace-pre-wrap h-full overflow-y-auto w-full wrap-break-word">
            {diffArray.map((part, i) => {
                if (part.added) {
                    return (
                        <span key={i} className="bg-green-100 text-green-800 font-bold border-b-2 border-green-300 px-0.5 mx-0.5 rounded-sm">
                            {part.value}
                        </span>
                    );
                }
                if (part.removed) {
                    return (
                        <span key={i} className="bg-red-100 text-red-800 line-through decoration-red-500 decoration-2 px-0.5 mx-0.5 rounded-sm opacity-70">
                            {part.value}
                        </span>
                    );
                }
                return <span key={i} className="text-gray-600">{part.value}</span>;
            })}
        </div>
    );
};

const MultiDiffViewer = ({
    selectedArticle,
    changeHistory,
    onClose,
    adminToken,
    NEXT_PUBLIC_BASE_URL
}) => {
    const [diffs, setDiffs] = useState({
        editor: null,
        reviewer: null,
        admin: null
    });
    const [stats, setStats] = useState({
        editor: null,
        reviewer: null,
        admin: null
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const generateDiffs = async () => {
            if (!selectedArticle) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // ✅ CLEAN URL UTILITY (Matching admin/page.jsx safety patterns)
                const cleanUrl = (url) => {
                    if (!url) return null;
                    if (url.startsWith('http')) return url; // 🛑 S3 Safety: Don't clean absolute URLs (Presigned)

                    let clean = url;
                    if (clean.includes('_reviewer_watermarked.docx')) {
                        return clean.replace(/\.docx$/i, '.pdf');
                    } else if (clean.includes('_reviewer_watermarked.pdf')) {
                        return clean;
                    } else if (clean.endsWith('_watermarked.docx')) {
                        clean = clean.replace(/_watermarked\.docx$/i, '_clean_watermarked.pdf');
                        return clean.includes('/uploads/words/') ? clean.replace('/uploads/words/', '/uploads/pdfs/') : clean;
                    } else if (clean.endsWith('.docx')) {
                        clean = clean.replace(/\.docx$/i, '.pdf');
                        return clean.includes('/uploads/words/') ? clean.replace('/uploads/words/', '/uploads/pdfs/') : clean;
                    }
                    return clean;
                };

                // ✅ Helper to fetch text from URL (Client-side)
                const fetchText = async (url) => {
                    if (!url) return "";
                    try {
                        const cleaned = cleanUrl(url);
                        // ✅ Safer Join: Prevent double/missing slashes
                        const fullUrl = cleaned.startsWith("http")
                            ? cleaned
                            : `${NEXT_PUBLIC_BASE_URL}/${cleaned.replace(/\\/g, "/").replace(/^\//, "")}`;

                        const isS3Url = fullUrl.includes('.s3.') || fullUrl.includes('amazonaws.com');

                        // 🛑 S3 Safety: No Authorization header and no cache-busting for S3 Presigned URLs
                        const headers = {};
                        if (!isS3Url) {
                            headers.Authorization = `Bearer ${adminToken}`;
                        }

                        let finalUrl = fullUrl;
                        if (!isS3Url) {
                            // Only add cache-busting for local backend files
                            finalUrl += `${finalUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
                        }

                        const res = await fetch(finalUrl, { headers });
                        if (!res.ok) {
                            console.warn(`Fetch Failed [${res.status}]:`, finalUrl);
                            return ""; // Fallback to empty text instead of crashing
                        }

                        const blob = await res.blob();
                        const file = new File([blob], "doc.pdf", { type: "application/pdf" });

                        // ✅ Import Path
                        const { extractTextFromPDF } = await import("../../utilis/pdfutils");
                        const textData = await extractTextFromPDF(file);
                        return textData.fullText || "";
                    } catch (e) {
                        console.error("Text extraction failed for:", url, e);
                        return "";
                    }
                };

                // 1. Get Original Text
                const originalText = await fetchText(selectedArticle.originalPdfUrl);

                // 2. FIND VERSIONS from History
                const sortedLogs = [...(changeHistory || [])].sort((a, b) => {
                    const dateA = new Date(a.changedAt || a.createdAt || a.editedAt || 0);
                    const dateB = new Date(b.changedAt || b.createdAt || b.editedAt || 0);
                    return dateB - dateA;
                });

                const getDocUrl = (log) => log ? (log.pdfUrl || log.newFileUrl || log.documentUrl) : null;

                const findLogByRole = (roleName) => sortedLogs.find(l => {
                    // ✅ Support string roles and nested object roles
                    const roleField = l.role || l.editedBy?.role || l.changedBy?.role || "";
                    const role = (typeof roleField === 'string' ? roleField : roleField.name || "").toLowerCase();
                    return role === roleName && getDocUrl(l);
                });

                const editorLog = findLogByRole('editor');
                const reviewerLog = findLogByRole('reviewer');
                const adminLog = findLogByRole('admin');

                // Fallbacks from selectedArticle
                const currentEditorUrl = editorLog ? getDocUrl(editorLog) : (selectedArticle.editorDocumentUrl || selectedArticle.latestEditorPdfUrl);
                const currentReviewerUrl = reviewerLog ? getDocUrl(reviewerLog) : selectedArticle.latestReviewerPdfUrl;
                const currentAdminUrl = adminLog ? getDocUrl(adminLog) : selectedArticle.latestAdminPdfUrl;

                // 3. FETCH TEXTS
                const editorText = currentEditorUrl ? await fetchText(currentEditorUrl) : "";
                const reviewerText = currentReviewerUrl ? await fetchText(currentReviewerUrl) : "";
                const adminText = currentAdminUrl ? await fetchText(currentAdminUrl) : "";

                // 4. GENERATE WORD-LEVEL DIFFS (Inline)
                // Editor vs Original
                const diff1 = (originalText && editorText) ? compareTexts(originalText, editorText) : null;
                const stats1 = diff1 ? getChangeStats(diff1) : null;

                // Reviewer vs Editor (or Original)
                const baseReviewer = editorText || originalText;
                const diff2 = (baseReviewer && reviewerText) ? compareTexts(baseReviewer, reviewerText) : null;
                const stats2 = diff2 ? getChangeStats(diff2) : null;

                // Admin vs Reviewer (or Editor or Original)
                const baseAdmin = reviewerText || editorText || originalText;
                const diff3 = (baseAdmin && adminText) ? compareTexts(baseAdmin, adminText) : null;
                const stats3 = diff3 ? getChangeStats(diff3) : null;

                setDiffs({
                    editor: diff1,
                    reviewer: diff2,
                    admin: diff3
                });
                setStats({
                    editor: stats1,
                    reviewer: stats2,
                    admin: stats3
                });

            } catch (err) {
                console.error("MultiDiff Error:", err);
            } finally {
                setLoading(false);
            }
        };

        generateDiffs();
    }, [selectedArticle, changeHistory, adminToken, NEXT_PUBLIC_BASE_URL]);

    // Helper for stats badge
    const StatsBadge = ({ s }) => {
        if (!s) return null;
        return (
            <div className="flex gap-2 text-[9px] font-black uppercase tracking-wider ml-auto">
                <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">+{s.added} Words</span>
                <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">-{s.removed} Words</span>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-gray-100 z-70 flex flex-col animate-in fade-in duration-200">
            {/* Header */}
            <div className="bg-white h-16 border-b flex items-center justify-between px-6 shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter">
                        Multi-Stage Visual Diff
                    </h2>
                    <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded">
                        Inline Comparison Mode
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="bg-black text-white px-5 py-2 rounded text-xs font-bold uppercase hover:bg-gray-800 shadow-md transition-all active:scale-95"
                >
                    Close Viewer
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-hidden">
                {loading ? (
                    <div className="h-full flex items-center justify-center flex-col gap-4">
                        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-bold text-gray-500 animate-pulse">Extracting text & generating visual diffs...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-6 h-full">
                        {/* COL 1: EDITOR */}
                        <div className="flex flex-col h-full min-h-0">
                            <div className="flex items-center mb-3">
                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-tight">Original ➝ Editor</h3>
                                <StatsBadge s={stats.editor} />
                            </div>
                            <div className="flex-1 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden relative">
                                <InlineDiffRenderer diffArray={diffs.editor} emptyMessage="No changes by Editor or text not found" />
                            </div>
                        </div>

                        {/* COL 2: REVIEWER */}
                        <div className="flex flex-col h-full min-h-0">
                            <div className="flex items-center mb-3">
                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-tight">Editor ➝ Reviewer</h3>
                                <StatsBadge s={stats.reviewer} />
                            </div>
                            <div className="flex-1 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden relative">
                                <InlineDiffRenderer diffArray={diffs.reviewer} emptyMessage="No changes by Reviewer or document missing" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MultiDiffViewer;
