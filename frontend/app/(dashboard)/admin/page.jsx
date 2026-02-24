
"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { diffWords } from 'diff';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminSidebar from "../../components/AdminSidebar";

// ✅ NEW COMPONENTS
import StatsOverview from "./components/StatsOverview";
import ArticleTable from "./components/ArticleTable";
import DocumentViewer from "./components/DocumentViewer";
const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

const compareTexts = (oldText, newText) => {
  if (!oldText) oldText = "";
  if (!newText) newText = "";
  return diffWords(oldText, newText);
};

const mapBackendStatus = (status) => {
  if (status === "PENDING_ADMIN_REVIEW") return "Pending";
  if (status === "APPROVED") return "Published";
  if (status === "PUBLISHED") return "Published";
  if (status === "ASSIGNED_TO_EDITOR") return "In Review";
  return status;
};

const cleanUrl = (url) => {
  if (!url) return null;
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

const deriveDocx = (pdfUrl) => {
  if (!pdfUrl) return null;
  let docxUrl = pdfUrl;
  if (docxUrl.endsWith('.pdf')) {
    docxUrl = docxUrl.replace('.pdf', '.docx');
  }
  if (docxUrl.includes('_clean_watermarked.docx')) {
    docxUrl = docxUrl.replace('_clean_watermarked.docx', '_watermarked.docx');
  }
  return docxUrl;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const [visualDiffBlobUrl, setVisualDiffBlobUrl] = useState(null);
  const [isGeneratingDiff, setIsGeneratingDiff] = useState(false);

  // ✅ 0. UI STATE (Responsive Sidebar)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ✅ 1. SECURITY STATES (Restored)
  const [currentAdmin, setCurrentAdmin] = useState({
    name: "Admin",
    email: "",
  });
  const [isAuthorized, setIsAuthorized] = useState(false);
  // ✅ STATE FOR MULTI-DIFF (Moved to top)
  const [showMultiDiff, setShowMultiDiff] = useState(false);

  // ✅ 2. ROUTE PROTECTION (Restored)
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    const adminData = localStorage.getItem("adminUser");
    if (!token) {
      router.push("/management-login/");
    } else {
      try {
        if (adminData) {
          setCurrentAdmin(JSON.parse(adminData));
        }
        setIsAuthorized(true);
      } catch (error) {
        localStorage.removeItem("adminToken");
        router.push("/management-login/");
      }
    }
  }, [router]);
  // --- DASHBOARD DATA & LOGIC ---
  // --- REPLACE YOUR OLD STATE VARIABLES WITH THIS ---
  // ✅ 1. Nayi Data States (Backend se aayengi)
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    published: 0,
    pendingReview: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
  });
  const [timeMetrics, setTimeMetrics] = useState(null); // Average time data
  const [statusDist, setStatusDist] = useState([]); // Chart data
  const [articles, setArticles] = useState([]); // Table data
  const [editors, setEditors] = useState([]); // Editors list
  const [reviewers, setReviewers] = useState([]); // ✅ Reviewers list
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [pdfViewMode, setPdfViewMode] = useState("original");
  const [changeHistory, setChangeHistory] = useState([]);

  // ✅ 3. PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // ✅ 4. SEARCH & FILTER STATE
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showAbstract, setShowAbstract] = useState(null);



  const handleDownloadFile = async (fileUrl, fileName, type) => {
    if (!fileUrl) return toast.error("File not available");
    try {
      toast.info(`Downloading ${type}...`);
      const token = localStorage.getItem("adminToken");
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

  // Fetch article history
  const fetchChangeHistory = useCallback(async (articleId) => {
    if (!articleId) return;
    try {
      const token = localStorage.getItem("adminToken");
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
        setChangeHistory(data.changeLogs || []);

        const logs = data.changeLogs || [];
        const originalPdf = data.article.originalPdfUrl;

        let editorPdf = null, editorDocx = null;
        let reviewerPdf = null, reviewerDocx = null;
        let adminPdf = null, adminDocx = null;

        logs.forEach(log => {
          const role = log.role?.toLowerCase() || (log.editedBy?.role || "").toLowerCase();
          const url = log.pdfUrl || log.newFileUrl;
          if (!url || url === originalPdf) return;
          const checkExt = (u, ext) => u.split('?')[0].toLowerCase().endsWith(ext);
          const isDoc = checkExt(url, '.docx') || checkExt(url, '.doc');
          const isPdf = checkExt(url, '.pdf');

          if (role === 'editor') {
            if (isDoc) editorDocx = url;
            if (isPdf) editorPdf = url;
          } else if (role === 'reviewer') {
            if (isDoc) reviewerDocx = url;
            if (isPdf) reviewerPdf = url;
          } else if (role === 'admin') {
            if (isDoc) adminDocx = url;
            if (isPdf) adminPdf = url;
          }
        });

        // If explicitly found DOCX is null, try to derive from PDF
        if (!editorDocx && editorPdf) editorDocx = deriveDocx(editorPdf);
        if (!reviewerDocx && reviewerPdf) reviewerDocx = deriveDocx(reviewerPdf);
        if (!adminDocx && adminPdf) adminDocx = deriveDocx(adminPdf);

        setSelectedArticle((prev) => ({
          ...prev,
          editorDocumentUrl: data.article.editorDocumentUrl,
          latestEditorPdfUrl: cleanUrl(editorPdf),
          latestEditorDocxUrl: editorDocx,
          latestReviewerPdfUrl: cleanUrl(reviewerPdf),
          latestReviewerDocxUrl: reviewerDocx,
          latestAdminPdfUrl: cleanUrl(adminPdf),
          latestAdminDocxUrl: adminDocx,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  }, [NEXT_PUBLIC_BASE_URL, cleanUrl, deriveDocx]);

  // Load history when article changes
  useEffect(() => {
    const articleId = selectedArticle?.id || selectedArticle?._id;
    if (articleId) {
      const currentLoadedId = changeHistory.length > 0
        ? changeHistory[0].articleId || changeHistory[0]._id
        : null;
      if (articleId !== currentLoadedId) {
        fetchChangeHistory(articleId);
      }
    }
  }, [selectedArticle?.id, selectedArticle?._id, fetchChangeHistory, changeHistory]);

  // PDF URL Fix Logic (Isse "PDF Not Found" khatam ho jayega)
  // ✅ Corrected Function
  const getPdfUrlToView = () => {
    if (!selectedArticle) return null;

    if (pdfViewMode === "visual-diff") return visualDiffBlobUrl;

    let path = "";
    if (pdfViewMode === "original") path = selectedArticle.originalPdfUrl;
    else if (pdfViewMode === "admin") path = selectedArticle.latestAdminPdfUrl;
    else if (pdfViewMode === "current") path = selectedArticle.currentPdfUrl;
    else if (pdfViewMode === "editor") path = selectedArticle.latestEditorPdfUrl || selectedArticle.editorDocumentUrl;
    else if (pdfViewMode === "reviewer") path = selectedArticle.latestReviewerPdfUrl;
    else if (pdfViewMode === "track") path = selectedArticle.editorDocumentUrl;

    if (!path) return null;

    const cleanPath = path.startsWith("http")
      ? path
      : `${NEXT_PUBLIC_BASE_URL}/${path.replace(/\\/g, "/").replace(/^\//, "")}`;

    if (cleanPath.includes('amazonaws.com') || cleanPath.includes('s3.')) return cleanPath;

    return `${cleanPath}?cb=${Date.now()}`;
  };

  // ✅ VISUAL DIFF FUNCTION
  const handleViewVisualDiff = useCallback(async () => {
    if (isGeneratingDiff) return;

    // Agar already generated hai to wahi dikhao
    if (visualDiffBlobUrl && pdfViewMode === "visual-diff") {
      setPdfViewMode("visual-diff");
      return;
    }

    try {
      setIsGeneratingDiff(true);
      toast.info("Generating Visual Diff...");

      const { extractTextFromPDF, generateComparisonPDF } = await import("../../utilis/pdfutils");

      const token = localStorage.getItem("adminToken");

      if (!selectedArticle?.originalPdfUrl) throw new Error("Original PDF missing");

      // Determine which PDF to compare against based on current view mode
      let targetPdfUrl = selectedArticle.currentPdfUrl; // Default to latest
      if (pdfViewMode === "editor") targetPdfUrl = selectedArticle.latestEditorPdfUrl || selectedArticle.editorDocumentUrl;
      if (pdfViewMode === "reviewer") targetPdfUrl = selectedArticle.latestReviewerPdfUrl;
      if (pdfViewMode === "admin") targetPdfUrl = selectedArticle.latestAdminPdfUrl;

      if (!targetPdfUrl) throw new Error("Target PDF for comparison missing");

      // 1. Fetch Original PDF
      const originalIsS3 = selectedArticle.originalPdfUrl.includes(".s3.") || selectedArticle.originalPdfUrl.includes("amazonaws.com");
      const originalHeaders = originalIsS3 ? {} : { Authorization: `Bearer ${token}` };

      const originalRes = await fetch(
        selectedArticle.originalPdfUrl.startsWith("http") ? selectedArticle.originalPdfUrl : `${NEXT_PUBLIC_BASE_URL}${selectedArticle.originalPdfUrl}`,
        { headers: originalHeaders }
      );
      const originalBlob = await originalRes.blob();
      const originalFile = new File([originalBlob], "original.pdf", { type: "application/pdf" });

      // 2. Fetch Current (Edited/Target) PDF
      const targetIsS3 = targetPdfUrl.includes(".s3.") || targetPdfUrl.includes("amazonaws.com");
      const targetHeaders = targetIsS3 ? {} : { Authorization: `Bearer ${token}` };

      const editedRes = await fetch(
        targetPdfUrl.startsWith("http") ? targetPdfUrl : `${NEXT_PUBLIC_BASE_URL}${targetPdfUrl}`,
        { headers: targetHeaders }
      );
      const editedBlob = await editedRes.blob();
      const editedFile = new File([editedBlob], "edited.pdf", { type: "application/pdf" });

      // 3. Extract & Compare
      const originalText = await extractTextFromPDF(originalFile);
      const editedText = await extractTextFromPDF(editedFile);

      // Ye Array return karta hai
      const differences = compareTexts(originalText.fullText, editedText.fullText);

      // ✅ FIX: Use 'differences' directly (Array) as generateComparisonPDF expects {added, removed, value} objects 
      // which are present in the raw diff. 'formatDifferences' might be returning something unexpected.
      const pdfBytes = await generateComparisonPDF(differences);

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      setVisualDiffBlobUrl(url);
      setPdfViewMode("visual-diff");

      toast.success("Visual Diff Generated!");

    } catch (err) {
      console.error("Visual Diff Error:", err);
      toast.error(err.message || "Could not generate visual diff.");
    } finally {
      setIsGeneratingDiff(false);
    }
  }, [selectedArticle, NEXT_PUBLIC_BASE_URL, isGeneratingDiff, visualDiffBlobUrl, pdfViewMode]);

  // ✅ 2. Phir useEffect lagao (Data Fetching)
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        // 🔥 Caching Fix: Timestamp add kiya
        const cb = Date.now();
        const headers = {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        };

        const [summaryRes, metricsRes, statusRes, timelineRes, editorsRes, reviewersRes] =
          await Promise.all([
            fetch(`${NEXT_PUBLIC_BASE_URL}/admin/dashboard/summary?cb=${cb}`, { headers }),
            fetch(`${NEXT_PUBLIC_BASE_URL}/admin/dashboard/time-metrics?cb=${cb}`, { headers }),
            fetch(`${NEXT_PUBLIC_BASE_URL}/admin/dashboard/status-distribution?cb=${cb}`, { headers }),
            fetch(`${NEXT_PUBLIC_BASE_URL}/admin/dashboard/articles-timeline?page=${currentPage}&limit=${pageSize}&status=${statusFilter}&search=${searchTerm}&cb=${cb}`, { headers }),
            fetch(`${NEXT_PUBLIC_BASE_URL}/users/editors?cb=${cb}`, { headers }),
            fetch(`${NEXT_PUBLIC_BASE_URL}/users/reviewers?cb=${cb}`, { headers }), // ✅ Fetch Reviewers
          ]);

        // 1. Summary Data
        if (summaryRes.ok) {
          const data = await summaryRes.json();
          setStats(data.summary);
        }

        // 2. Time Metrics
        if (metricsRes.ok) {
          const data = await metricsRes.json();
          setTimeMetrics(data.metrics);
        }

        // 3. Charts Data
        if (statusRes.ok) {
          const data = await statusRes.json();
          const counts = data.distribution?.statusCounts || {};
          const percs = data.distribution?.percentages || {};

          const chartData = [
            {
              label: "Pending",
              count: counts.PENDING_ADMIN_REVIEW || 0,
              percentage: percs.PENDING_ADMIN_REVIEW || 0,
              color: "#dc2626",
            },
            {
              label: "Published",
              count: counts.PUBLISHED || 0,
              percentage: percs.PUBLISHED || 0,
              color: "#16a34a",
            },
          ];
          setStatusDist(chartData);
        }

        // 4. Table Data
        if (timelineRes.ok) {
          const data = await timelineRes.json();
          const rawArticles = data.articles || [];

          const formatted = rawArticles.map((item) => ({
            id: item._id || item.id,
            title: item.title,
            author: item.authorName || "Unknown",
            status: mapBackendStatus(item.status), // ✅ Ab ye sahi chalega
            assignedTo: item.assignedEditor?.id || item.assignedEditorId || "",
            assignedReviewer: item.assignedReviewer?.id || item.assignedReviewerId || "", // ✅ Added Reviewer Mapping
            // ✅ Is line ko dhundo aur replace karo:
            date: item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB") : "",
            abstract: item.abstract,
            originalPdfUrl: item.originalPdfUrl,
            currentPdfUrl: item.currentPdfUrl,
            originalWordUrl: item.originalWordUrl, // ✅ Added for Download Original
            currentWordUrl: item.currentWordUrl,   // ✅ Added for Download Final
            pdfUrl: item.currentPdfUrl || item.originalPdfUrl,
            isVisible: item.isVisible !== undefined ? item.isVisible : true, // ✅ Map visibility status
          }));
          setArticles(formatted);

          // Update pagination state
          if (data.pagination) {
            setTotalPages(data.pagination.totalPages || 1);
            setTotalItems(data.pagination.total || 0);
          }
        }

        // 5. Editors List
        if (editorsRes.ok) {
          const data = await editorsRes.json();
          setEditors(Array.isArray(data) ? data : data.editors || []);
        }

        // 6. Reviewers List
        if (reviewersRes && reviewersRes.ok) {
          const data = await reviewersRes.json();
          setReviewers(Array.isArray(data) ? data : data.reviewers || []);
        }

      } catch (error) {
        console.error("Dashboard Load Error:", error);
        toast.error("Failed to load dashboard statistics.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAuthorized, currentPage, pageSize, statusFilter, searchTerm]);

  const handlePdfClick = (relativeUrl) => {
    if (!relativeUrl) {
      toast.warning("PDF not found");
      return;
    }

    const cleanPath = relativeUrl.startsWith("/")
      ? relativeUrl
      : `/${relativeUrl}`;

    // 🔥 CHANGE: ?t=${Date.now()} add kiya taaki browser naya version maange
    const fullUrl = `${NEXT_PUBLIC_BASE_URL}${cleanPath}?t=${Date.now()}`;

    console.log("Opening Fresh URL:", fullUrl);
    window.open(fullUrl, "_blank");
  };
  // Reset to page 1 on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm]);

  // ✅ ASSIGN LOGIC
  const assignArticle = async (articleId, editorId) => {
    if (!editorId) return;
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(
        `${NEXT_PUBLIC_BASE_URL}/articles/${articleId}/assign-editor`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ editorId: editorId }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        setArticles((prev) =>
          prev.map((a) =>
            a.id === articleId
              ? {
                ...a,
                assignedTo: editorId,
                status: "In Review",
              }
              : a
          )
        );
        toast.success(data.message || "Stage 1 Review assigned successfully!");
      } else {
        // 🛑 2. BACKEND CHECK: Agar backend bole "Already Assigned"
        if (response.status === 409 || data.message?.toLowerCase().includes("already")) {
          toast.warning("Article Already Assigned!");
        } else {
          toast.error(data.message || "Failed to assign Stage 1 Review");
        }
      }
    } catch (error) {
      console.error("Error assigning:", error);
      toast.error("Server error while assigning");
    }
  };

  // ✅ ASSIGN REVIEWER LOGIC
  const assignReviewer = async (articleId, reviewerId) => {
    if (!reviewerId) return;
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(
        `${NEXT_PUBLIC_BASE_URL}/articles/${articleId}/assign-reviewer`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reviewerId: reviewerId }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        setArticles((prev) =>
          prev.map((a) =>
            a.id === articleId
              ? {
                ...a,
                assignedReviewer: reviewerId,
              }
              : a
          )
        );
        toast.success(data.message || "Stage 2 Review assigned successfully!");
      } else {
        if (response.status === 409 || data.message?.toLowerCase().includes("already")) {
          toast.warning("Article Already Assigned!");
        } else {
          toast.error(data.message || "Failed to assign Stage 2 Review");
        }
      }
    } catch (error) {
      console.error("Error assigning reviewer:", error);
      toast.error("Server error while assigning reviewer");
    }
  };
  const [isPublishing, setIsPublishing] = useState(false); // ✅ NEW State

  // ✅ ADMIN UPLOAD LOGIC
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadComment, setUploadComment] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleAdminUpload = async () => {
    if (!uploadedFile) return toast.error("Please select a DOCX file.");

    const allowed = [".docx", ".doc"];
    const ext = uploadedFile.name.substring(uploadedFile.name.lastIndexOf(".")).toLowerCase();
    if (!allowed.includes(ext) && uploadedFile.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      return toast.error("Only DOCX files are allowed.");
    }

    try {
      setIsUploading(true);
      const token = localStorage.getItem("adminToken");
      const formData = new FormData();
      formData.append("document", uploadedFile);
      if (uploadComment) formData.append("comments", uploadComment);

      const res = await fetch(`${NEXT_PUBLIC_BASE_URL}/articles/${selectedArticle.id}/upload-corrected`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Admin upload successful!");
        setUploadedFile(null);
        setUploadComment("");
        setVisualDiffBlobUrl(null); // Clear old diff

        // Update local state to show new file
        // We need to fetch history or just update selectedArticle if backend returns updated article
        if (data.article) {
          // Re-fetch history to ensure we get the proper log entry
          await fetchChangeHistory(selectedArticle.id);

          setSelectedArticle(prev => ({
            ...prev,
            ...data.article,
            currentPdfUrl: data.article.currentPdfUrl,
            currentWordUrl: data.article.currentWordUrl
          }));
          setPdfViewMode("admin"); // Switch to view result
        }
      } else {
        toast.error(data.message || "Upload failed");
      }
    } catch (e) {
      console.error(e);
      toast.error("Upload error");
    } finally {
      setIsUploading(false);
    }
  };

  const overrideAndPublish = async (id) => {
    try {
      setIsPublishing(true); // Start Loading
      const token = localStorage.getItem("adminToken");

      if (!token) {
        toast.error("Admin token missing! Please login again.");
        setIsPublishing(false);
        return;
      }

      const response = await fetch(
        `${NEXT_PUBLIC_BASE_URL}/articles/${id}/admin-publish`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        toast.success("Article Approved & Published!");

        // Optimistic Update
        setArticles((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: "Published" } : a))
        );

        // ✅ Redirect/Close after success (Delay for user to see success)
        setTimeout(() => {
          setSelectedArticle(null);
          setIsPublishing(false);
        }, 1500);

      } else {
        const errorData = await response.json();
        console.error("Server Error:", errorData);
        toast.error(errorData.message || "Approval failed");
        setIsPublishing(false);
      }
    } catch (e) {
      console.error("Network Error:", e);
      toast.error("Something went wrong while publishing.");
      setIsPublishing(false);
    }
  };


  const toggleVisibility = async (id, currentVisibility) => {
    try {
      const token = localStorage.getItem("adminToken");
      const newVisibility = !currentVisibility;

      const response = await fetch(`${NEXT_PUBLIC_BASE_URL}/admin/articles/${id}/visibility`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isVisible: newVisibility }),
      });

      const data = await response.json();

      if (response.ok) {
        setArticles((prev) =>
          prev.map((art) => (art.id === id ? { ...art, isVisible: newVisibility } : art))
        );
        toast.success(newVisibility ? "Article is now visible" : "Article hidden from users");
      } else {
        toast.error(data.message || "Failed to update visibility");
      }
    } catch (error) {
      console.error("Error toggling visibility:", error);
      toast.error("Server error while updating visibility");
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <h2 className="text-xl font-bold text-red-700 animate-pulse">
          Verifying Admin Privileges...
        </h2>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row relative">
      {/* 🌑 MOBILE OVERLAY (Backdrop) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      {/* 🔴 SIDEBAR (Refactored) */}
      <AdminSidebar
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      {/* MAIN CONTENT */}
      <main className="flex-1 h-screen overflow-y-auto bg-gray-50 flex flex-col">
        {/* HEADER */}
        <header className="bg-white h-20 border-b flex items-center justify-between px-4 md:px-10 shadow-sm sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger Button (Mobile Only) */}
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
            <h2 className="text-lg md:text-xl font-black text-gray-700 uppercase">
              Management
            </h2>
          </div>
          <div className="flex items-center gap-2 md:gap-6">

            <div className="flex items-center gap-3 pl-3 md:pl-6 border-l border-gray-200">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-gray-800">
                  {currentAdmin.name}
                </p>
                <p className="text-[10px] text-gray-500 font-medium">
                  Administrator
                </p>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-100 border-2 border-red-600 text-red-700 flex items-center justify-center font-black text-sm md:text-lg">
                {currentAdmin.name
                  ? currentAdmin.name.charAt(0).toUpperCase()
                  : "A"}
              </div>
            </div>
          </div>
        </header>
        {/* CONTENT */}
        <div className="p-4 md:p-10 space-y-6 md:space-y-10 flex-0">

          {/* 1. STATS OVERVIEW */}
          <StatsOverview
            stats={stats}
            statusDist={statusDist}
            timeMetrics={timeMetrics}
          />

          {/* 2. ARTICLE TABLE */}
          <ArticleTable
            isLoading={isLoading}
            articles={articles}
            filteredArticles={articles} // Pagination backend se handle ho rahi hai
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            showAbstract={showAbstract}
            setShowAbstract={setShowAbstract}
            handlePdfClick={handlePdfClick}
            assignArticle={assignArticle}
            assignReviewer={assignReviewer}
            editors={editors}
            reviewers={reviewers}
            setSelectedArticle={setSelectedArticle}
            setPdfViewMode={setPdfViewMode}
            overrideAndPublish={overrideAndPublish}
            toggleVisibility={toggleVisibility}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      </main>

      {/* 3. DOCUMENT VIEWER */}
      <DocumentViewer
        selectedArticle={selectedArticle}
        setSelectedArticle={setSelectedArticle}
        pdfViewMode={pdfViewMode}
        setPdfViewMode={setPdfViewMode}
        handleDownloadFile={handleDownloadFile}
        isGeneratingDiff={isGeneratingDiff}
        handleViewVisualDiff={handleViewVisualDiff}
        showMultiDiff={showMultiDiff}
        setShowMultiDiff={setShowMultiDiff}
        changeHistory={changeHistory}
        NEXT_PUBLIC_BASE_URL={NEXT_PUBLIC_BASE_URL}
        getPdfUrlToView={getPdfUrlToView}
        uploadedFile={uploadedFile}
        setUploadedFile={setUploadedFile}
        uploadComment={uploadComment}
        setUploadComment={setUploadComment}
        handleAdminUpload={handleAdminUpload}
        isUploading={isUploading}
        overrideAndPublish={overrideAndPublish}
        isPublishing={isPublishing}
      />

      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </div >
  );
}

