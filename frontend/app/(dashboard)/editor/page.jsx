"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import ReviewInterface from "./ReviewInterface";
// ✅ Removed static imports - will use dynamic imports instead
import { compareTexts, getChangeStats, formatDifferences } from "../../utilis/diffutilis";

// ✅ NEW: Diff Viewer Component (Isse existing icons ke neeche paste kar do)
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

// ... existing helper components ...

// --- YAHAN PASTE KARO (ICONS) ---
const DownloadIcon = () => (
  <svg
    className="w-4 h-4 mr-2"
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
const WordIcon = () => (
  <svg
    className="w-4 h-4 mr-2"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

// ✅ Icons wale section mein ise add karo
const CheckCircleIcon = () => (
  <svg
    className="w-5 h-5 mr-2"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
// --------------------------------

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

export default function EditorDashboard() {
  const router = useRouter();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [activeTab, setActiveTab] = useState("tasks");
  const [pdfViewMode, setPdfViewMode] = useState("original");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadedFile, setUploadedFile] = useState(null); // SIRF EK BAAR
  const [trackFile, setTrackFile] = useState(null);
  const [changeHistory, setChangeHistory] = useState([]);
  const [uploadComment, setUploadComment] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const [visualDiffBlobUrl, setVisualDiffBlobUrl] = useState(null);
  const [isGeneratingDiff, setIsGeneratingDiff] = useState(false);
  const [currentDiffData, setCurrentDiffData] = useState(null);

  // ✅ NEW: Generate Visual Diff from Frontend (with dynamic import)
  const handleViewVisualDiff = async (changeLogId) => {
    try {
      setIsGeneratingDiff(true);
      toast.info("Generating Visual Diff from Frontend...");
      
      // ✅ Dynamic import - only loads on client-side when needed
      const { extractTextFromPDF, generateComparisonPDF } = await import("../../utilis/pdfutils");
      
      const token = localStorage.getItem("editorToken");
      const articleId = selectedArticle.id || selectedArticle._id;
      
      // Find the specific change log
      const changeLog = changeHistory.find(log => (log.id || log._id) === changeLogId);
      if (!changeLog) {
        throw new Error("Change log not found");
      }

      // ✅ Debug: Log the change log structure
      console.log("Change Log:", changeLog);
      console.log("Selected Article:", selectedArticle);

      // ✅ Check if URLs exist
      if (!selectedArticle.originalPdfUrl) {
        throw new Error("Original PDF URL not found");
      }
      
      // ✅ Try different possible field names for edited PDF
      const editedPdfUrl = changeLog.pdfUrl || changeLog.documentUrl || changeLog.correctedPdfUrl || selectedArticle.currentPdfUrl;
      
      if (!editedPdfUrl) {
        throw new Error("Edited PDF URL not found. Available fields: " + Object.keys(changeLog).join(", "));
      }

      // Fetch the original PDF
      const originalPdfUrl = selectedArticle.originalPdfUrl.startsWith("http")
        ? selectedArticle.originalPdfUrl
        : `${API_BASE_URL}${selectedArticle.originalPdfUrl}`;
      
      const originalRes = await fetch(originalPdfUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!originalRes.ok) {
        throw new Error("Failed to fetch original PDF");
      }
      
      const originalBlob = await originalRes.blob();
      const originalFile = new File([originalBlob], "original.pdf", { type: "application/pdf" });

      // Fetch the edited PDF (from the change log)
      const editedPdfFullUrl = editedPdfUrl.startsWith("http")
        ? editedPdfUrl
        : `${API_BASE_URL}${editedPdfUrl}`;
      
      const editedRes = await fetch(editedPdfFullUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!editedRes.ok) {
        throw new Error("Failed to fetch edited PDF");
      }
      
      const editedBlob = await editedRes.blob();
      const editedFile = new File([editedBlob], "edited.pdf", { type: "application/pdf" });

      // Extract text from both PDFs
      toast.info("Extracting text from PDFs...");
      const originalText = await extractTextFromPDF(originalFile);
      const editedText = await extractTextFromPDF(editedFile);

      // ✅ Debug: Log extracted text to see spacing
      console.log("Original text sample:", originalText.fullText.substring(0, 200));
      console.log("Edited text sample:", editedText.fullText.substring(0, 200));

      // Compare texts using diff utility
      toast.info("Comparing documents...");
      const differences = compareTexts(originalText.fullText, editedText.fullText);
      const stats = getChangeStats(differences);
      const formattedDiff = formatDifferences(differences);

      // Store diff data for display
      setCurrentDiffData({
        differences: formattedDiff,
        stats,
        changeLog
      });

      // Generate comparison PDF
      toast.info("Generating comparison PDF...");
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
  };

  // 📊 Chart Data Calculations
  const totalTasks = articles.length || 0;
  const completedTasks =
    articles.filter((a) => a.status === "Published").length || 0;
  const pendingTasks =
    articles.filter((a) => a.status !== "Published").length || 0;
  const efficiency =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const API_BASE_URL = "http://localhost:4000";

  const [profile, setProfile] = useState({
    id: "",
    name: "Editor Name",
    email: "",
    role: "Editor",
  });

  useEffect(() => {
    const token = localStorage.getItem("editorToken");
    const adminToken = localStorage.getItem("adminToken");
    const userData = localStorage.getItem("editorUser");

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setProfile((prev) => ({ ...prev, ...parsedUser }));
        fetchAssignedArticles(parsedUser.id || parsedUser._id, token);
        setIsAuthorized(true);
        return;
      } catch (e) {
        console.error("Error", e);
      }
    }

    if (adminToken) {
      router.push("/admin");
      return;
    }

    if (!token) {
      router.push("/management-login");
    }
  }, [router]);

  const fetchAssignedArticles = async (editorId, token) => {
    try {
      setIsLoading(true);
      const cb = Date.now(); // Cache breaker
      const res = await fetch(
        `${API_BASE_URL}/api/articles?assignedEditorId=${editorId}&cb=${cb}`,
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

  // ... existing fetchAssignedArticles function ...

  const fetchChangeHistory = async (articleId) => {
    try {
      const token = localStorage.getItem("editorToken");
      const cb = Date.now(); // Cache breaker
      const res = await fetch(
        `${API_BASE_URL}/api/articles/${articleId}/change-history?cb=${cb}`,
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
        setChangeHistory(data.changeLogs || []);

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

  // ✅ USE EFFECT: Jab selectedArticle change ho, tab history lao
  useEffect(() => {
    const articleId = selectedArticle?.id || selectedArticle?._id;
    if (articleId) {
      fetchChangeHistory(articleId);
    }
  }, [selectedArticle?.id, selectedArticle?._id]); // ✅ Sirf ID track hogi, loop ruk jayega

  // ❌ DELETE OLD: handleArticleAction function hata do.

  // ✅ NEW 1: Handle Upload Corrected Version (Comment ke saath)
  const handleUploadCorrection = async () => {
    // Check if main file is selected
    if (!uploadedFile)
      return toast.error("Please select a corrected file first");

    try {
      setIsUploading(true);
      const token = localStorage.getItem("editorToken");
      const formData = new FormData();

      // 1. Corrected Article: Iska field name backend 'document' expect kar raha hai
      formData.append("document", uploadedFile);

      // 2. Track Changes/Editor Doc: Iska field name backend 'editorDocument' expect kar raha hai
      if (trackFile) {
        formData.append("editorDocument", trackFile);
      }

      // 3. Comments: Backend req.body.comments se uthayega
      if (uploadComment) {
        formData.append("comments", uploadComment);
      }

      const res = await fetch(
        `${API_BASE_URL}/api/articles/${
          selectedArticle.id || selectedArticle._id
        }/upload-corrected`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            // Note: Yahan Content-Type set nahi karna hai, FormData khud kar lega
          },
          body: formData,
        }
      );

      const data = await res.json();

      if (res.ok) {
        toast.success("New version uploaded & Diff generated!");

        // Reset form states
        setUploadedFile(null);
        setTrackFile(null);
        setUploadComment("");
        setVisualDiffBlobUrl(null);

        // Refresh Change History to show the new version
        fetchChangeHistory(selectedArticle.id || selectedArticle._id);

        // Latest PDF view update karein
        if (data.article && data.article.currentPdfUrl) {
          setSelectedArticle((prev) => ({ ...prev, ...data.article }));
          setPdfViewMode("current");
        }
      } else {
        // Backend se error message dikhao
        toast.error(data.error || data.message || "Upload failed");
      }
    } catch (err) {
      console.error("Upload Error:", err);
      toast.error("Server Error: Could not connect to backend");
    } finally {
      setIsUploading(false);
    }
  };

  // ✅ NEW 2: Handle Editor Approval
  const handleEditorApprove = async () => {
    try {
      const token = localStorage.getItem("editorToken");
      const res = await fetch(
        `${API_BASE_URL}/api/articles/${
          selectedArticle.id || selectedArticle._id
        }/editor-approve`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      if (res.ok) {
        toast.success("Approved! Sent to Admin.");
        setSelectedArticle(null); // Close view
        fetchAssignedArticles(profile.id, token); // Refresh list
      } else {
        toast.error(data.message || "Approval failed");
      }
    } catch (err) {
      toast.error("Something went wrong");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("editorToken");
    localStorage.removeItem("editorUser");
    router.push("/management-login");
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  // --- YAHAN PASTE KARO (FUNCTION) ---
  const handleDownloadFile = async (fileUrl, fileName, type) => {
    if (!fileUrl) return toast.error("File not available");
    try {
      toast.info(`Downloading ${type}...`);
      const token = localStorage.getItem("editorToken");
      const fullUrl = fileUrl.startsWith("http")
        ? fileUrl
        : `${API_BASE_URL}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;

      const res = await fetch(fullUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
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
  // ----------------------------------

  // ✅ Download Diff Reports from Backend (Fast & Reliable)
  const handleDownloadDiffReport = async (changeLogId, format = "pdf") => {
    try {
      const typeLabel = format === "word" ? "Word" : "PDF";
      toast.info(`Downloading ${typeLabel} Report...`);

      const token = localStorage.getItem("editorToken");
      const articleId = selectedArticle.id || selectedArticle._id;

      // ✅ Always use backend API for downloads
      const res = await fetch(
        `${API_BASE_URL}/api/articles/${articleId}/change-log/${changeLogId}/download-diff?format=${format}`,
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

  // --- Update getPdfUrlToView Function ---
  // ✅ STEP 2: REPLACE THIS FUNCTION (Pura function replace karo)
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
      : `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
    
    // Append timestamp to ensure fresh PDF download/view
    return `${cleanUrl}?cb=${Date.now()}`;
  };

  if (!isAuthorized)
    return (
      <div className="h-screen flex items-center justify-center">
        Verifying...
      </div>
    );

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row relative">
      {/* 🌑 MOBILE OVERLAY (Backdrop) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 🔴 SIDEBAR (Responsive) */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-72 bg-red-700 text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out 
        ${
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-8 border-b border-red-800 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter">
              LAW NATION
            </h1>
            <span className="text-[10px] bg-white text-red-700 px-2 py-0.5 rounded-full font-bold uppercase">
              {selectedArticle ? "Review Mode" : "Editor Panel"}
            </span>
          </div>
          {/* Close Button Mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
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
                className={`w-full text-left p-3 rounded-lg font-semibold transition-all ${
                  activeTab === "tasks" ? "bg-red-800" : "hover:bg-red-600"
                }`}
              >
                Assigned Tasks
              </button>
              <button
                onClick={() => {
                  setActiveTab("profile");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left p-3 rounded-lg font-semibold transition-all ${
                  activeTab === "profile" ? "bg-red-800" : "hover:bg-red-600"
                }`}
              >
                Profile Settings
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
                className={`w-full text-left p-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  pdfViewMode === "original"
                    ? "bg-white text-red-700 shadow-lg"
                    : "hover:bg-red-800 text-white"
                }`}
              >
                View Original PDF
                {pdfViewMode === "original" && (
                  <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 rounded-full">
                    Active
                  </span>
                )}
              </button>
              {pdfViewMode === "track" && (
                <div className="px-3 mt-1">
                  <p className="text-[10px] text-red-200 mb-1">
                    Source: ArticleChangeLog.editorDocumentUrl
                  </p>
                </div>
              )}
              <button
                onClick={() => {
                  setPdfViewMode("current");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left p-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  pdfViewMode === "current"
                    ? "bg-white text-red-700 shadow-lg"
                    : "hover:bg-red-800 text-white"
                }`}
              >
                View Edited PDF
                {pdfViewMode === "current" && (
                  <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 rounded-full">
                    Active
                  </span>
                )}
              </button>
              {/* <button
                onClick={() => {
                  setPdfViewMode("track"); // ✅ Naya mode
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left p-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  pdfViewMode === "track"
                    ? "bg-white text-red-700 shadow-lg"
                    : "hover:bg-red-800 text-white"
                }`}
              >
                View Track File
                {pdfViewMode === "track" && (
                  <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 rounded-full">
                    Active
                  </span>
                )}
              </button> */}

              <button
                onClick={() => {
                  if (changeHistory && changeHistory.length > 0) {
                    // ✅ Always regenerate diff when clicked (don't reuse old blob)
                    const latestLog = changeHistory[0];
                    handleViewVisualDiff(latestLog.id || latestLog._id);
                    setIsMobileMenuOpen(false);
                  } else {
                    toast.info("No change history available to generate diff.");
                  }
                }}
                disabled={isGeneratingDiff}
                className={`w-full text-left p-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  pdfViewMode === "visual-diff"
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
                    View Visual Diff
                    {pdfViewMode === "visual-diff" && (
                      <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 rounded-full">
                        Active
                      </span>
                    )}
                  </>
                )}
              </button>
              {/* {pdfViewMode === "track" && getPdfUrlToView() && (
                <button
                  onClick={() =>
                    handleDownloadFile(
                      getPdfUrlToView(),
                      "Track_Changes",
                      "PDF"
                    )
                  }
                  className="w-full mt-2 p-2 text-[10px] bg-green-700 hover:bg-green-800 rounded font-bold uppercase flex items-center justify-center"
                >
                  <DownloadIcon /> Download Track File
                </button>
              )} */}
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

        {!selectedArticle && (
          <div className="p-4 border-t border-red-800">
            <button
              onClick={handleLogout}
              className="w-full p-2 text-sm bg-red-900 rounded font-medium uppercase"
            >
              Logout
            </button>
          </div>
        )}
      </aside>

      {/* 🟢 MAIN CONTENT AREA */}
      <main className="flex-1 h-screen overflow-y-auto bg-white flex flex-col">
        {/* HEADER */}
        <header className="bg-white h-20 border-b flex items-center justify-between px-4 md:px-10 sticky top-0 z-20 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger Button (Visible only on Mobile) */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden text-gray-600 hover:text-red-700 p-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-7 h-7"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
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
        </header>

        {/* CONTENT SWITCHER */}
        <div className="p-4 md:p-10 pb-20 flex-1">
          {/* VIEW 1: TASK LIST (Default) */}
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
                  count={
                    articles.filter((a) => a.status !== "Published").length
                  }
                  color="border-yellow-500"
                />
                <EditorStatCard
                  title="Approved"
                  count={
                    articles.filter((a) => a.status === "Published").length
                  }
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
                          <td colSpan="4" className="p-10 text-center">
                            Loading...
                          </td>
                        </tr>
                      ) : (
                        articles.map((art) => (
                          <tr
                            key={art._id || art.id}
                            className="hover:bg-gray-50"
                          >
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
                                  setPdfViewMode("original"); // Reset view
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
          )}

          {selectedArticle && (
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
  />
)}
        </div>
      </main>
    </div>
  );
}
