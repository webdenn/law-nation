"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import Image from "next/image";
import logoImg from "../../assets/logo.jpg";
import ReviewInterface from "./ReviewInterface";
import { compareTexts, getChangeStats, formatDifferences } from "../../utilis/diffutilis";

const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

// Helper Component for Stats
const StatCard = ({ title, count, color }) => (
    <div className={`bg-white p-6 rounded-xl border-l-4 ${color} shadow-md`}>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {title}
        </p>
        <h3 className="text-2xl md:text-3xl font-extrabold mt-2 text-gray-800">
            {count}
        </h3>
    </div>
);

export default function ReviewerDashboard() {
    const router = useRouter();

    const [isAuthorized, setIsAuthorized] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [activeTab, setActiveTab] = useState("tasks");
    const [pdfViewMode, setPdfViewMode] = useState("original");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [articles, setArticles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [trackFile, setTrackFile] = useState(null);
    const [changeHistory, setChangeHistory] = useState([]);
    const [uploadComment, setUploadComment] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    const [visualDiffBlobUrl, setVisualDiffBlobUrl] = useState(null);
    const [isGeneratingDiff, setIsGeneratingDiff] = useState(false);
    const [currentDiffData, setCurrentDiffData] = useState(null);
    const [isApproving, setIsApproving] = useState(false);
    const [pdfTimestamp, setPdfTimestamp] = useState(Date.now());

    const [profile, setProfile] = useState({
        id: "",
        name: "Reviewer Name",
        email: "",
        role: "Reviewer",
    });

    const handleViewVisualDiff = useCallback(async (changeLogId) => {
        if (isGeneratingDiff) return;

        try {
            setIsGeneratingDiff(true);
            toast.info("Generating Visual Diff from Frontend...");

            const { extractTextFromPDF, generateComparisonPDF } = await import("../../utilis/pdfutils");

            const token = localStorage.getItem("reviewerToken");
            const articleId = selectedArticle?.id || selectedArticle?._id;

            const changeLog = changeHistory.find(log => (log.id || log._id) === changeLogId);
            if (!changeLog) throw new Error("Change log not found");

            if (!selectedArticle?.originalPdfUrl) throw new Error("Original PDF URL not found");

            // ✅ LOGIC: Compare Editor's Corrected Version (Old) vs Reviewer's Version (New)

            // 1. "Old" Document = Editor's PDF (Previously approved by editor)
            // Use lastEditorPdf found in fetchChangeHistory or from article field
            const originalPdfUrl = lastEditorPdf || selectedArticle.editorDocumentUrl || selectedArticle.originalPdfUrl;

            // 2. "New" Document = Reviewer's Upload (Current PDF) or the specific log's PDF
            const editedPdfUrl = changeLog.pdfUrl || changeLog.documentUrl || changeLog.correctedPdfUrl || selectedArticle.currentPdfUrl;

            if (!originalPdfUrl) throw new Error("Base PDF (Editor/Original) not found");
            if (!editedPdfUrl) throw new Error("Comparison PDF (Reviewer) not found.");

            // ✅ FIX: Process URL properly
            originalPdfUrl = originalPdfUrl.startsWith("http")
                ? originalPdfUrl
                : `${NEXT_PUBLIC_BASE_URL}${originalPdfUrl}`;

            const originalIsS3 = originalPdfUrl.includes(".s3.") || originalPdfUrl.includes("amazonaws.com");
            const originalHeaders = originalIsS3 ? {} : { Authorization: `Bearer ${token}` };

            const originalRes = await fetch(originalPdfUrl, {
                headers: originalHeaders
            });
            if (!originalRes.ok) throw new Error("Failed to fetch original PDF");
            const originalBlob = await originalRes.blob();
            const originalFile = new File([originalBlob], "original.pdf", { type: "application/pdf" });

            const editedPdfFullUrl = editedPdfUrl.startsWith("http")
                ? editedPdfUrl
                : `${NEXT_PUBLIC_BASE_URL}${editedPdfUrl}`;

            const editedIsS3 = editedPdfFullUrl.includes(".s3.") || editedPdfFullUrl.includes("amazonaws.com");
            const editedHeaders = editedIsS3 ? {} : { Authorization: `Bearer ${token}` };

            const editedRes = await fetch(editedPdfFullUrl, {
                headers: editedHeaders
            });
            if (!editedRes.ok) throw new Error("Failed to fetch edited PDF");
            const editedBlob = await editedRes.blob();
            const editedFile = new File([editedBlob], "edited.pdf", { type: "application/pdf" });

            const originalText = await extractTextFromPDF(originalFile);
            const editedText = await extractTextFromPDF(editedFile);

            const differences = compareTexts(originalText.fullText, editedText.fullText);
            const stats = getChangeStats(differences);
            const formattedDiff = formatDifferences(differences);

            setCurrentDiffData({
                differences: formattedDiff,
                stats,
                changeLog
            });

            const pdfBytes = await generateComparisonPDF(formattedDiff);
            const blob = new Blob([pdfBytes], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);

            setVisualDiffBlobUrl(url);
            setPdfViewMode("visual-diff");

            if (isMobileMenuOpen) setIsMobileMenuOpen(false);

            toast.success("Diff generated!");

        } catch (err) {
            console.error("Visual Diff Error:", err);
            toast.error(err.message || "Could not generate visual diff.");
        } finally {
            setIsGeneratingDiff(false);
        }
    }, [changeHistory, selectedArticle, isGeneratingDiff, isMobileMenuOpen]);

    const fetchAssignedArticles = async (reviewerId, token) => {
        try {
            setIsLoading(true);
            const cb = Date.now();
            // ✅ CHANGED: assignedReviewerId instead of assignedEditorId
            const res = await fetch(
                `${NEXT_PUBLIC_BASE_URL}/articles?assignedReviewerId=${reviewerId}&cb=${cb}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        "Pragma": "no-cache"
                    },
                }
            );

            if (res.ok) {
                const data = await res.json();
                const list = data.articles || (Array.isArray(data) ? data : []);
                setArticles(list);
            } else {
                toast.error("Unauthorized or session expired");
            }
        } catch (err) {
            console.error("Fetch Error:", err);
            toast.error("Failed to load tasks");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // ✅ CHANGED: Checking reviewerToken and reviewerUser
        const token = localStorage.getItem("reviewerToken");
        const adminToken = localStorage.getItem("adminToken");
        const userData = localStorage.getItem("reviewerUser");

        if (adminToken) {
            router.push("/admin");
            return;
        }

        if (!token) {
            router.push("/management-login/");
            return;
        }

        if (token && userData) {
            try {
                const parsedUser = JSON.parse(userData);
                setProfile((prev) => ({ ...prev, ...parsedUser }));
                fetchAssignedArticles(parsedUser.id || parsedUser._id, token);
                setIsAuthorized(true);
            } catch (e) {
                console.error("Error parsing user data", e);
                localStorage.removeItem("reviewerUser");
                router.push("/management-login/");
            }
        }
    }, []);

    const [lastEditorPdf, setLastEditorPdf] = useState(null); // ✅ NEW: Track Editor's PDF
    const [hasReviewerUploaded, setHasReviewerUploaded] = useState(false); // ✅ NEW: Track Reviewer activity

    const fetchChangeHistory = async (articleId) => {
        try {
            // ✅ CHANGED: reviewerToken
            const token = localStorage.getItem("reviewerToken");
            const cb = Date.now();
            const res = await fetch(
                `${NEXT_PUBLIC_BASE_URL}/articles/${articleId}/change-history?cb=${cb}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        "Pragma": "no-cache"
                    },
                }
            );
            if (res.ok) {
                const data = await res.json();
                const logs = data.changeLogs || [];
                setChangeHistory(logs);

                // ✅ LOGIC: Find Editor's Last PDF & Check Reviewer Upload
                let editorPdf = null;
                let reviewerUploaded = false;

                console.log("Reviewer History Logs:", logs);

                // Loop logs (assuming sorted new -> old, or find based on timestamp if needed)
                // We want the LATEST Editor PDF. 
                // Since logs are likely ASC (oldest first), we need to reverse to find the latest
                const reversedLogs = [...logs].reverse();

                const editorLog = reversedLogs.find(log =>
                    (log.role?.toLowerCase() === "editor") && (log.pdfUrl || log.documentUrl || log.newFileUrl)
                );

                if (editorLog) {
                    editorPdf = editorLog.pdfUrl || editorLog.documentUrl || (editorLog.fileType === 'PDF' ? editorLog.newFileUrl : null);
                    // Try to find the word file. In some logs it might be separate, or we infer it.
                    // Based on workflow service: newFileUrl IS the docx if fileType is DOCX.
                    // Or check old logs structure.
                    // Let's look for a log with DOCX file type or extension.
                }

                // Robust search for Editor's DOCX
                const editorDocxLog = reversedLogs.find(log =>
                    (log.role?.toLowerCase() === "editor") &&
                    (log.newFileUrl?.endsWith('.docx') || log.editorDocumentUrl)
                );

                let editorDocx = null;
                if (editorDocxLog) {
                    editorDocx = editorDocxLog.editorDocumentUrl || editorDocxLog.newFileUrl;
                }

                // Check if Reviewer has uploaded anything
                const reviewerLog = logs.find(log => log.role?.toLowerCase() === "reviewer");
                if (reviewerLog) reviewerUploaded = true;

                setLastEditorPdf(editorPdf);
                setHasReviewerUploaded(reviewerUploaded);
                // Also save editorDocx in state to pass down (we can piggyback on selectedArticle or new state)
                if (editorDocx) {
                    setSelectedArticle(prev => ({ ...prev, editorCorrectedDocxUrl: editorDocx }));
                }

                if (
                    data.article?.editorDocumentUrl &&
                    selectedArticle?.editorDocumentUrl !== data.article.editorDocumentUrl
                ) {
                    setSelectedArticle((prev) => ({
                        ...prev,
                        editorDocumentUrl: data.article.editorDocumentUrl,
                    }));
                }
            }
        } catch (err) {
            console.error("Failed to fetch history", err);
        }
    };

    useEffect(() => {
        const articleId = selectedArticle?.id || selectedArticle?._id;
        if (articleId) {
            fetchChangeHistory(articleId);
        }
    }, [selectedArticle?.id, selectedArticle?._id]);

    const handleUploadCorrection = async () => {
        if (!uploadedFile)
            return toast.error("Please select a corrected DOCX file first");

        const allowedExtensions = [".docx", ".doc"];
        const fileExtension = uploadedFile.name.substring(uploadedFile.name.lastIndexOf(".")).toLowerCase();

        if (!allowedExtensions.includes(fileExtension) &&
            uploadedFile.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            return toast.error("Only DOCX/DOC files are supported for reviewer uploads.");
        }

        const toastId = toast.loading("Uploading Correction & Generating Diff...");

        try {
            setIsUploading(true);
            // ✅ CHANGED: reviewerToken
            const token = localStorage.getItem("reviewerToken");
            const formData = new FormData();

            formData.append("docx", uploadedFile);
            if (trackFile) {
                formData.append("editorDocument", trackFile);
            }
            if (uploadComment) {
                formData.append("comments", uploadComment);
            }

            // ✅ CHANGED: Using correct reviewer endpoint
            const res = await fetch(
                `${NEXT_PUBLIC_BASE_URL}/articles/${selectedArticle.id || selectedArticle._id
                }/reviewer-upload`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            const data = await res.json();

            if (res.ok) {
                toast.update(toastId, {
                    render: "New version uploaded & Diff generated successfully!",
                    type: "success",
                    isLoading: false,
                    autoClose: 3000
                });

                setUploadedFile(null);
                setTrackFile(null);
                setUploadComment("");
                setVisualDiffBlobUrl(null);

                fetchChangeHistory(selectedArticle.id || selectedArticle._id);

                if (data.article && data.article.currentPdfUrl) {
                    setSelectedArticle((prev) => ({ ...prev, ...data.article }));
                    setPdfViewMode("current");
                    setPdfTimestamp(Date.now());
                }
            } else {
                toast.update(toastId, {
                    render: data.error || data.message || "Upload failed",
                    type: "error",
                    isLoading: false,
                    autoClose: 5000
                });
            }
        } catch (err) {
            console.error("Upload Error:", err);
            toast.update(toastId, {
                render: "Server Error: Could not connect to backend",
                type: "error",
                isLoading: false,
                autoClose: 5000
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleReviewerApprove = async () => {
        // ✅ Safety Check
        if (!window.confirm("Are you sure you want to APPROVE this article? This action cannot be undone.")) {
            return;
        }

        try {
            setIsApproving(true);
            // ✅ CHANGED: reviewerToken
            const token = localStorage.getItem("reviewerToken");
            // ✅ CHANGED: Endpoint -> reviewer-approve
            const res = await fetch(
                `${NEXT_PUBLIC_BASE_URL}/articles/${selectedArticle.id || selectedArticle._id
                }/reviewer-approve`,
                {
                    method: "PATCH",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            const data = await res.json();
            if (res.ok) {
                toast.success("Approved! Sent to Admin.");
                setSelectedArticle(null);
                fetchAssignedArticles(profile.id, token);
            } else {
                toast.error(data.message || "Approval failed");
            }
        } catch (err) {
            toast.error("Something went wrong");
        } finally {
            setIsApproving(false);
        }
    };

    const handleLogout = () => {
        toast.dismiss();
        // ✅ CHANGED: removing reviewer tokens
        localStorage.removeItem("reviewerToken");
        localStorage.removeItem("reviewerUser");
        router.push("/management-login/");
    };

    const handleDownloadFile = async (fileUrl, fileName, type) => {
        if (!fileUrl) return toast.error("File not available");
        try {
            toast.info(`Downloading ${type}...`);
            // ✅ CHANGED: reviewerToken
            const token = localStorage.getItem("reviewerToken");
            const fullUrl = fileUrl.startsWith("http")
                ? fileUrl
                : `${NEXT_PUBLIC_BASE_URL}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;

            // ✅ FIX: Only send Authorization header to backend APIs, not S3 URLs
            const isS3Url = fullUrl.includes('.s3.') || fullUrl.includes('amazonaws.com');
            const headers = {};
            if (!isS3Url) {
                headers.Authorization = `Bearer ${token}`;
            }

            const res = await fetch(fullUrl, {
                method: "GET",
                headers: headers,
            });

            if (!res.ok) throw new Error("Download failed");

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const ext = type === "Word" ? "docx" : "pdf";
            a.download = `${fileName}.${ext}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success("Download complete!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to download file");
        }
    };

    const handleDownloadDiffReport = async (changeLogId, format = "pdf") => {
        try {
            const typeLabel = format === "word" ? "Word" : "PDF";
            toast.info(`Downloading ${typeLabel} Report...`);

            // ✅ CHANGED: reviewerToken
            const token = localStorage.getItem("reviewerToken");
            const articleId = selectedArticle.id || selectedArticle._id;

            const res = await fetch(
                `${NEXT_PUBLIC_BASE_URL}/articles/${articleId}/change-log/${changeLogId}/download-diff?format=${format}`,
                {
                    method: "GET",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to generate ${typeLabel}`);
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;

            const extension = format === "word" ? "docx" : "pdf";
            a.download = `diff-report-v${changeLogId}.${extension}`;

            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success(`${typeLabel} Downloaded!`);
        } catch (err) {
            console.error(err);
            toast.error(err.message || `Could not download ${format.toUpperCase()} report`);
        }
    };

    const getPdfUrlToView = () => {
        if (!selectedArticle) return "";

        if (pdfViewMode === "visual-diff") {
            return visualDiffBlobUrl;
        }

        let path = "";
        if (pdfViewMode === "original") {
            // ✅ Editor PDF: Prefer the one found in logs, else fallback
            path = lastEditorPdf || selectedArticle.editorDocumentUrl || selectedArticle.originalPdfUrl;
        } else if (pdfViewMode === "current") {
            // ✅ Reviewer PDF = The document Reviewer uploaded
            path = selectedArticle.currentPdfUrl;
        } else if (pdfViewMode === "track") {
            // Redundant if visual-diff is used, but keeping for safety
            path = selectedArticle.editorDocumentUrl;
        }

        if (!path) return "";

        const cleanUrl = path.startsWith("http")
            ? path
            : `${NEXT_PUBLIC_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

        // 🛑 STOP: Do NOT cache-bust S3 Presigned URLs (it breaks the signature)
        if (cleanUrl.includes('amazonaws.com') || cleanUrl.includes('s3.')) {
            return cleanUrl;
        }

        return `${cleanUrl}?cb=${pdfTimestamp}`;
    };

    if (!isAuthorized)
        return (
            <div className="h-screen flex items-center justify-center">
                Verifying Reviewer Access...
            </div>
        );

    return (
        <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row relative">
            {/* MOBILE OVERLAY */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* SIDEBAR */}
            <aside
                className={`fixed md:sticky top-0 z-40 h-screen w-72 bg-red-700 text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out 
        ${isMobileMenuOpen
                        ? "translate-x-0"
                        : "-translate-x-full md:translate-x-0"
                    }`}
            >
                <div className="p-8 border-b border-red-800 flex flex-col items-center relative">
                    <div className="mb-4 flex justify-center w-full">
                        <div className="bg-white p-1.5 rounded-lg shadow-md inline-block">
                            <Image
                                src={logoImg}
                                alt="Law Nation"
                                width={140}
                                height={40}
                                className="h-auto w-auto max-w-[140px] object-contain rounded-sm"
                                priority
                            />
                        </div>
                    </div>
                    <span className="text-[9px] bg-red-900/50 text-white/90 px-4 py-0.5 rounded-full font-black uppercase tracking-[0.2em] border border-red-800/50 shadow-sm">
                        {selectedArticle ? "Review Mode" : "Reviewer Panel"}
                    </span>

                    {/* Close Button Mobile - Absolute Positioning */}
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="md:hidden text-white absolute top-6 right-6"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <nav className="flex-1 px-4 mt-6 space-y-2 overflow-y-auto">
                    {!selectedArticle ? (
                        <>
                            <button
                                onClick={() => {
                                    setActiveTab("tasks");
                                    setIsMobileMenuOpen(false);
                                }}
                                className={`w-full text-left p-3 rounded-lg font-semibold transition-all ${activeTab === "tasks" ? "bg-red-800" : "hover:bg-red-600"
                                    }`}
                            >
                                Assigned Tasks
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="px-3 py-2 text-xs font-bold text-red-200 uppercase tracking-widest border-b border-red-600 mb-2">
                                Document Options
                            </div>
                            <button
                                onClick={() => {
                                    setPdfViewMode("original");
                                    setIsMobileMenuOpen(false);
                                }}
                                className={`w-full text-left p-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${pdfViewMode === "original"
                                    ? "bg-white text-red-700 shadow-lg"
                                    : "hover:bg-red-800 text-white"
                                    }`}
                            >
                                View Editor PDF
                                {pdfViewMode === "original" && (
                                    <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 rounded-full">Active</span>
                                )}
                            </button>

                            <button
                                onClick={() => {
                                    // ✅ Validation: Only show if Reviewer has uploaded
                                    // Using the same strict check as the upload lock
                                    if (!(selectedArticle.currentPdfUrl && selectedArticle.currentPdfUrl !== selectedArticle.originalPdfUrl)) {
                                        toast.error("Please upload a correction first to view Reviewer PDF");
                                        return;
                                    }

                                    setPdfViewMode("current");
                                    setIsMobileMenuOpen(false);
                                }}
                                className={`w-full text-left p-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${pdfViewMode === "current"
                                    ? "bg-white text-red-700 shadow-lg"
                                    : "hover:bg-red-800 text-white"
                                    }`}
                            >
                                View Reviewer PDF
                                {pdfViewMode === "current" && (
                                    <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 rounded-full">Active</span>
                                )}
                            </button>

                            <button
                                type="button" // ✅ Explicitly defined type
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (changeHistory && changeHistory.length > 0) {
                                        const latestLog = changeHistory[0];
                                        handleViewVisualDiff(latestLog.id || latestLog._id);
                                        setIsMobileMenuOpen(false);
                                    } else {
                                        toast.info("No change history available to generate diff.");
                                    }
                                }}
                                disabled={isGeneratingDiff}
                                className={`w-full text-left p-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${pdfViewMode === "visual-diff"
                                    ? "bg-white text-red-700 shadow-lg"
                                    : "hover:bg-red-800 text-white"
                                    } ${isGeneratingDiff ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                {isGeneratingDiff ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        View Track File
                                        {pdfViewMode === "visual-diff" && (
                                            <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 rounded-full">Active</span>
                                        )}
                                    </>
                                )}
                            </button>

                            <div className="my-6 border-t border-red-800"></div>
                            <button
                                onClick={() => {
                                    setSelectedArticle(null);
                                    setUploadedFile(null);
                                    setIsMobileMenuOpen(false);
                                }}
                                className="w-full text-left p-3 rounded-lg font-semibold bg-red-900 text-red-100 hover:bg-black hover:text-white transition-all flex items-center gap-2"
                            >
                                ⬅ Back to Task List
                            </button>
                        </>
                    )}
                </nav>

                {
                    !selectedArticle && (
                        <div className="p-4 border-t border-red-800">
                            <button
                                onClick={handleLogout}
                                className="w-full p-2 text-sm bg-red-900 rounded font-medium uppercase"
                            >
                                Logout
                            </button>
                        </div>
                    )
                }
            </aside >

            {/* MAIN CONTENT AREA */}
            < main className="flex-1 h-screen overflow-y-auto bg-white flex flex-col" >
                {/* HEADER */}
                < header className="bg-white h-20 border-b flex items-center justify-between px-4 md:px-10 sticky top-0 z-20 shadow-sm shrink-0" >
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="md:hidden text-gray-600 hover:text-red-700 p-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            </svg>
                        </button>

                        <h2 className="text-lg md:text-xl font-bold text-gray-700 truncate max-w-[200px] md:max-w-none">
                            {selectedArticle
                                ? `Reviewing: ${selectedArticle.title.substring(0, 30)}...`
                                : activeTab === "tasks"
                                    ? "Reviewer Workspace" // ✅ CHANGED TITLE
                                    : "Profile"}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 border-2 border-red-600 rounded-full flex items-center justify-center text-red-700 font-black">
                            {profile.name.charAt(0)}
                        </div>
                    </div>
                </header >

                {/* CONTENT SWITCHER */}
                < div className="p-4 md:p-10 pb-20 flex-1" >
                    {!selectedArticle && activeTab === "tasks" && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8">
                                <StatCard
                                    title="Total Assigned"
                                    count={articles.length}
                                    color="border-red-600"
                                />
                                <StatCard
                                    title="Pending"
                                    count={articles.filter((a) => a.status !== "Published" && a.status !== "Approved").length} // ✅ Adjusted Status Check
                                    color="border-yellow-500"
                                />
                                <StatCard
                                    title="Completed"
                                    count={articles.filter((a) => a.status === "Published" || a.status === "Approved").length} // ✅ Adjusted Status Check
                                    color="border-green-600"
                                />
                            </div>

                            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                                <div className="bg-red-50 p-5 border-b border-red-100">
                                    <h3 className="font-bold text-red-800 text-lg">My Tasks</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left whitespace-nowrap">
                                        <thead>
                                            <tr className="text-xs uppercase bg-gray-50 text-gray-400">
                                                <th className="p-5">Article</th>
                                                <th className="p-5">Author</th>
                                                <th className="p-5">Status</th>
                                                <th className="p-5 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {isLoading ? (
                                                <tr>
                                                    <td colSpan="4" className="p-10 text-center">Loading...</td>
                                                </tr>
                                            ) : (
                                                articles.map((art) => (
                                                    <tr key={art._id || art.id} className="hover:bg-gray-50">
                                                        <td className="p-5 font-medium">{art.title}</td>
                                                        <td className="p-5 text-sm">{art.authorName}</td>
                                                        <td className="p-5">
                                                            <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                                                                {art.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-5 text-right">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedArticle(art);
                                                                    setPdfViewMode("original");
                                                                }}
                                                                className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-800 transition"
                                                            >
                                                                Open Review
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )
                    }

                    {
                        selectedArticle && (
                            <ReviewInterface
                                selectedArticle={selectedArticle}
                                pdfViewMode={pdfViewMode}
                                getPdfUrlToView={getPdfUrlToView}
                                uploadedFile={uploadedFile}
                                setUploadedFile={setUploadedFile}
                                uploadComment={uploadComment}
                                setUploadComment={setUploadComment}
                                isUploading={isUploading}
                                handleUploadCorrection={handleUploadCorrection}
                                handleApprove={handleReviewerApprove} // ✅ Passed Handler
                                changeHistory={changeHistory}
                                handleViewVisualDiff={handleViewVisualDiff}
                                handleDownloadDiffReport={handleDownloadDiffReport}
                                handleDownloadFile={handleDownloadFile}
                                currentDiffData={currentDiffData}
                                isGeneratingDiff={isGeneratingDiff}
                                isApproving={isApproving}
                            />
                        )
                    }
                </div >
            </main >
        </div >
    );
}
