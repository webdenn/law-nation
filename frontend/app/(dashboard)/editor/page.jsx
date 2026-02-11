"use client";
import React, { useState, useEffect, useCallback, Suspense } from "react"; // ✅ Combined Import
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import Image from "next/image";
import logoImg from "../../assets/logo.jpg";
import ReviewInterface from "./ReviewInterface";
import { compareTexts, getChangeStats, formatDifferences } from "../../utilis/diffutilis";

// ✅ LOOP FIX: NEXT_PUBLIC_BASE_URL ko component ke bahar nikala taki ye baar-baar recreate na ho
const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

// ✅ NEW: Diff Viewer Component
const DiffViewer = ({ diffData }) => {
  if (!diffData || !diffData.summary)
    return (
      <p className="text-xs text-gray-400 italic">No diff data available.</p>
    );

  return (
    <div className="mt-3 bg-gray-50 rounded border border-gray-200 text-xs font-mono overflow-hidden">
      {/* Summary Header */}
      <div className="bg-gray-100 p-2 border-b flex gap-2 font-bold uppercase tracking-wider text-[10px]">
        <span className="text-green-600">
          +{diffData.summary.totalAdded} Added
        </span>
        <span className="text-red-600">
          -{diffData.summary.totalRemoved} Removed
        </span>
        <span className="text-blue-600">
          ~{diffData.summary.totalModified} Modified
        </span>
      </div>

      {/* Scrollable Diff Body */}
      <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
        {diffData.removed?.map((line, i) => (
          <div key={`rem-${i}`} className="flex bg-red-50 text-red-700">
            <span className="w-6 text-gray-400 border-r border-red-200 mr-2 text-right pr-1 select-none">
              {line.oldLineNumber}
            </span>
            <span className="line-through decoration-red-300 opacity-75">
              - {line.content}
            </span>
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

// Helper Component for Stats
const EditorStatCard = ({ title, count, color }) => (
  <div className={`bg-white p-6 rounded-xl border-l-4 ${color} shadow-md`}>
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
      {title}
    </p>
    <h3 className="text-2xl md:text-3xl font-extrabold mt-2 text-gray-800">
      {count}
    </h3>
  </div>
);

function EditorDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const articleIdFromUrl = searchParams.get("articleId");

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
  const [isApproving, setIsApproving] = useState(false); // ✅ NEW Appoving State
  const [pdfTimestamp, setPdfTimestamp] = useState(Date.now()); // ✅ Fix Jitter State
  const [hasEditorUploaded, setHasEditorUploaded] = useState(false); // ✅ NEW: Track Editor activity

  const [profile, setProfile] = useState({
    id: "",
    name: "Editor Name",
    email: "",
    role: "Editor",
  });

  // ✅ FIX: handleViewVisualDiff with useCallback and clean dependencies
  const handleViewVisualDiff = useCallback(async (changeLogId) => {
    // Agar already generate ho raha hai to rok do
    if (isGeneratingDiff) return;

    try {
      setIsGeneratingDiff(true);
      toast.info("Generating Visual Diff from Frontend...");

      const { extractTextFromPDF, generateComparisonPDF } = await import("../../utilis/pdfutils");

      const token = localStorage.getItem("editorToken");
      const articleId = selectedArticle?.id || selectedArticle?._id;

      const changeLog = changeHistory.find(log => (log.id || log._id) === changeLogId);
      if (!changeLog) throw new Error("Change log not found");

      if (!selectedArticle?.originalPdfUrl) throw new Error("Original PDF URL not found");

      const editedPdfUrl = changeLog.pdfUrl || changeLog.documentUrl || changeLog.correctedPdfUrl || selectedArticle.currentPdfUrl;
      if (!editedPdfUrl) throw new Error("Edited PDF URL not found.");

      // Fetch Original PDF
      const originalPdfUrl = selectedArticle.originalPdfUrl.startsWith("http")
        ? selectedArticle.originalPdfUrl
        : `${NEXT_PUBLIC_BASE_URL}${selectedArticle.originalPdfUrl}`;

      const originalIsS3 = originalPdfUrl.includes(".s3.") || originalPdfUrl.includes("amazonaws.com");
      const originalHeaders = originalIsS3 ? {} : { Authorization: `Bearer ${token}` };

      const originalRes = await fetch(originalPdfUrl, {
        headers: originalHeaders
      });
      if (!originalRes.ok) throw new Error("Failed to fetch original PDF");
      const originalBlob = await originalRes.blob();
      const originalFile = new File([originalBlob], "original.pdf", { type: "application/pdf" });

      // Fetch Edited PDF
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

      // Extract & Compare
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

      // Generate PDF
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
  // 👆 NOTE: NEXT_PUBLIC_BASE_URL yahan se hata diya kyunki wo ab constant hai

  const fetchAssignedArticles = async (editorId, token) => {
    try {
      setIsLoading(true);
      const cb = Date.now();
      const res = await fetch(
        `${NEXT_PUBLIC_BASE_URL}/articles?assignedEditorId=${editorId}&cb=${cb}`,
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

  // ✅ FIX: Dependency array khali rakha taki ye sirf page load pr chale
  // baar baar router change hone pr nahi.
  useEffect(() => {
    const token = localStorage.getItem("editorToken");
    const adminToken = localStorage.getItem("adminToken");
    const userData = localStorage.getItem("editorUser");

    // 1. Agar Admin hai to Admin panel bhej do
    if (adminToken) {
      router.push("/admin");
      return;
    }

    // 2. Agar Editor token nahi hai to Login bhej do
    // 3. Agar Token + User data hai to Data Load kro
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setProfile((prev) => ({ ...prev, ...parsedUser }));
        // API Call
        fetchAssignedArticles(parsedUser.id || parsedUser._id, token);
        setIsAuthorized(true);
      } catch (e) {
        console.error("Error parsing user data", e);
        localStorage.removeItem("editorUser"); // Corrupt data hatao
        const currentPath = window.location.pathname + window.location.search;
        router.push(`/management-login/?returnUrl=${encodeURIComponent(currentPath)}`);
      }
    } else {
      const currentPath = window.location.pathname + window.location.search;
      router.push(`/management-login/?returnUrl=${encodeURIComponent(currentPath)}`);
    }
  }, []); // 👈 Yahan [router] hata kar [] kar do (Sirf ek baar chalega)

  // ✅ NEW: Auto-select article from URL
  useEffect(() => {
    if (articleIdFromUrl && articles.length > 0 && !selectedArticle) {
      const art = articles.find(a => (a.id || a._id) === articleIdFromUrl);
      if (art) {
        setSelectedArticle(art);
        setPdfViewMode("original");
      }
    }
  }, [articleIdFromUrl, articles, selectedArticle]);

  const fetchChangeHistory = async (articleId) => {
    try {
      const token = localStorage.getItem("editorToken");
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

        // ✅ Check if Editor has ever uploaded anything in logs
        const editorLogExists = logs.some(log => (log.role || log.changedBy?.role || "").toLowerCase() === "editor");
        setHasEditorUploaded(editorLogExists);

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

    // Strict DOCX Check
    const allowedExtensions = [".docx", ".doc"];
    const fileExtension = uploadedFile.name.substring(uploadedFile.name.lastIndexOf(".")).toLowerCase();

    if (!allowedExtensions.includes(fileExtension) &&
      uploadedFile.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      return toast.error("Only DOCX/DOC files are supported for editor uploads.");
    }

    const toastId = toast.loading("Uploading Correction & Generating Diff...");

    try {
      setIsUploading(true);
      const token = localStorage.getItem("editorToken");
      const formData = new FormData();

      formData.append("document", uploadedFile);
      if (trackFile) {
        formData.append("editorDocument", trackFile);
      }
      if (uploadComment) {
        formData.append("comments", uploadComment);
      }

      const res = await fetch(
        `${NEXT_PUBLIC_BASE_URL}/articles/${selectedArticle.id || selectedArticle._id
        }/upload-corrected`,
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
          setPdfTimestamp(Date.now()); // ✅ Refresh PDF
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

  const handleEditorApprove = async () => {
    // ✅ Safety Check
    if (!window.confirm("Are you sure you want to APPROVE this article? This action cannot be undone.")) {
      return;
    }

    try {
      setIsApproving(true); // ✅ Start Loading
      const token = localStorage.getItem("editorToken");
      const res = await fetch(
        `${NEXT_PUBLIC_BASE_URL}/articles/${selectedArticle.id || selectedArticle._id
        }/editor-approve`,
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
      setIsApproving(false); // ✅ Stop Loading
    }
  };

  const handleLogout = () => {
    // ✅ Fix: Logout karte hi purane toasts hata do
    toast.dismiss();

    localStorage.removeItem("editorToken");
    localStorage.removeItem("editorUser");
    router.push("/management-login/");
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleDownloadFile = async (fileUrl, fileName, type) => {
    if (!fileUrl) return toast.error("File not available");
    try {
      toast.info(`Downloading ${type}...`);
      const token = localStorage.getItem("editorToken");
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
      let safeName = fileName.replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
      // ✅ Remove "lawnation" (case insensitive) from filename
      safeName = safeName.replace(/lawnation/gi, "");
      if (!safeName) safeName = "document"; // Fallback
      a.download = `${safeName}.${ext}`;
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

      const token = localStorage.getItem("editorToken");
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
      path = selectedArticle.originalPdfUrl;
    } else if (pdfViewMode === "current") {
      path = selectedArticle.currentPdfUrl;
    } else if (pdfViewMode === "track") {
      path = selectedArticle.editorDocumentUrl;
    }

    if (!path) return "";

    const cleanUrl = path.startsWith("http")
      ? path
      : `${NEXT_PUBLIC_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

    return `${cleanUrl}?cb=${pdfTimestamp}`;
  };

  if (!isAuthorized)
    return (
      <div className="h-screen flex items-center justify-center">
        Verifying...
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
            {selectedArticle ? "Review Mode" : "Editor Panel"}
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
              {/* <button
                onClick={() => {
                  setActiveTab("profile");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left p-3 rounded-lg font-semibold transition-all ${activeTab === "profile" ? "bg-red-800" : "hover:bg-red-600"
                  }`}
              >
                Profile Settings
              </button> */}
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
                View Original PDF
                {pdfViewMode === "original" && (
                  <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 rounded-full">Active</span>
                )}
              </button>

              <button
                onClick={() => {
                  if (!hasEditorUploaded) {
                    return toast.error("Please upload a correction first to view the Edited PDF.");
                  }
                  setPdfViewMode("current");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left p-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${pdfViewMode === "current"
                  ? "bg-white text-red-700 shadow-lg"
                  : "hover:bg-red-600 text-white"
                  } ${!hasEditorUploaded ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                View Edited PDF
                {pdfViewMode === "current" && (
                  <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 rounded-full">Active</span>
                )}
              </button>

              <button
                type="button" // ✅ Explicitly defined type
                onClick={(e) => {
                  e.preventDefault(); // ✅ Prevent any default behavior
                  e.stopPropagation(); // ✅ Stop event bubbling

                  if (!hasEditorUploaded) {
                    return toast.error("Please upload a correction first to view the Track File.");
                  }

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
                  } ${isGeneratingDiff || !hasEditorUploaded ? "opacity-50 cursor-not-allowed" : ""}`}
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
                  ? "Editor Workspace"
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
                <EditorStatCard
                  title="Total Assigned"
                  count={articles.length}
                  color="border-red-600"
                />
                <EditorStatCard
                  title="Pending"
                  count={articles.filter((a) => a.status !== "Published").length}
                  color="border-yellow-500"
                />
                <EditorStatCard
                  title="Approved"
                  count={articles.filter((a) => a.status === "Published").length}
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
                handleEditorApprove={handleEditorApprove}
                changeHistory={changeHistory}
                handleViewVisualDiff={handleViewVisualDiff}
                handleDownloadDiffReport={handleDownloadDiffReport}
                handleDownloadFile={handleDownloadFile}
                currentDiffData={currentDiffData}
                isGeneratingDiff={isGeneratingDiff}
                isApproving={isApproving} // ✅ Pass Prop
              />
            )
          }
        </div >
      </main >
    </div >
  );
}

export default function EditorDashboard() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    }>
      <EditorDashboardContent />
    </Suspense>
  );
}
