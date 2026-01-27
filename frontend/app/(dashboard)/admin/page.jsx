
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

const compareTexts = (oldText, newText) => {
  if (!oldText) oldText = "";
  if (!newText) newText = "";
  // diffWords words ke basis pe compare karega (aap diffChars bhi use kar sakte ho)
  return diffWords(oldText, newText);
};

export default function AdminDashboard() {
  const router = useRouter();
  const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
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
      router.push("/management-login");
    } else {
      try {
        if (adminData) {
          setCurrentAdmin(JSON.parse(adminData));
        }
        setIsAuthorized(true);
      } catch (error) {
        localStorage.removeItem("adminToken");
        router.push("/management-login");
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

  // History fetch karne ka function
  const fetchChangeHistory = async (articleId) => {
    try {
      const token = localStorage.getItem("adminToken");
      const cb = Date.now(); // Unique timestamp
      const res = await fetch(
        `${NEXT_PUBLIC_BASE_URL}/api/articles/${articleId}/change-history?cb=${cb}`,
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

        // ✅ Extract Latest Editor & Reviewer PDFs from logs
        const logs = data.changeLogs || [];

        let editorPdf = null;
        let reviewerPdf = null;
        let adminPdf = null;
        let editorDocx = null;
        let reviewerDocx = null;
        let adminDocx = null;

        // Iterate through all logs to find the latest for each role
        logs.forEach(log => {
          const role = log.role?.toLowerCase() || (log.editedBy?.role || "").toLowerCase();
          const isNotOriginal = (url) => url && !url.includes(data.article.originalPdfUrl) && url !== data.article.originalPdfUrl;

          if (role === 'editor' && (log.pdfUrl || log.newFileUrl)) {
            const url = log.pdfUrl || log.newFileUrl;
            if (isNotOriginal(url)) {
              if (url.endsWith('.docx') || url.endsWith('.doc')) editorDocx = url;
              editorPdf = url;
            }
          }
          if (role === 'reviewer' && (log.pdfUrl || log.newFileUrl)) {
            const url = log.pdfUrl || log.newFileUrl;
            if (isNotOriginal(url)) {
              if (url.endsWith('.docx') || url.endsWith('.doc')) reviewerDocx = url;
              reviewerPdf = url;
            }
          }
          if (role === 'admin' && (log.pdfUrl || log.newFileUrl)) {
            const url = log.pdfUrl || log.newFileUrl;
            if (isNotOriginal(url)) {
              if (url.endsWith('.docx') || url.endsWith('.doc')) adminDocx = url;
              adminPdf = url;
            }
          }
        });

        // Backend fixes for PDF URL (clean watermarked)
        // ✅ FIXED: Match exact backend file generation patterns
        const cleanUrl = (url) => {
          if (!url) return null;
          let clean = url;

          // 🔧 FIX: Handle reviewer PDFs correctly (no extra "clean" in filename)
          if (clean.includes('_reviewer_watermarked.docx')) {
            // Backend creates: filename_reviewer_watermarked.pdf (no "clean")
            clean = clean.replace(/\.docx$/i, '.pdf');
            // Keep in /uploads/words/ directory - don't change directory
            return clean;
          }
          // 🔧 ADDITIONAL FIX: Handle reviewer PDFs that are already .pdf
          else if (clean.includes('_reviewer_watermarked.pdf')) {
            // Already correct format, just return as-is
            return clean;
          }
          // Handle editor PDFs (they have "clean" in the name)
          else if (clean.endsWith('_watermarked.docx')) {
            // Editor files have "clean" in the name
            clean = clean.replace(/_watermarked\.docx$/i, '_clean_watermarked.pdf');
            // Move editor PDFs to /pdfs/ directory
            if (clean.includes('/uploads/words/')) {
              clean = clean.replace('/uploads/words/', '/uploads/pdfs/');
            }
          }
          // Handle other DOCX files
          else if (clean.endsWith('.docx')) {
            clean = clean.replace(/\.docx$/i, '.pdf');
            // Move other PDFs to /pdfs/ directory
            if (clean.includes('/uploads/words/')) {
              clean = clean.replace('/uploads/words/', '/uploads/pdfs/');
            }
          }

          return clean;
        };

        // 🔍 Debug logging for URL transformation
        if (reviewerPdf) {
          console.log('🔍 [URL Debug] Original reviewer PDF:', reviewerPdf);
        }

        // Other DOCX fallback logic
        const deriveDocx = (pdfUrl) => {
          if (!pdfUrl) return null;

          let docxUrl = pdfUrl;

          // 1. Convert extension
          if (docxUrl.endsWith('.pdf')) {
            docxUrl = docxUrl.replace('.pdf', '.docx');
          }

          // 3. Fix Filename discrepancy (Editor version)
          // Pattern: filename_clean_watermarked.pdf -> filename_watermarked.docx
          if (docxUrl.includes('_clean_watermarked.docx')) {
            docxUrl = docxUrl.replace('_clean_watermarked.docx', '_watermarked.docx');
          }

          return docxUrl;
        };

        // If explicitly found DOCX is null, try to derive from PDF
        if (!editorDocx && editorPdf) editorDocx = deriveDocx(editorPdf);
        if (!reviewerDocx && reviewerPdf) reviewerDocx = deriveDocx(reviewerPdf);
        if (!adminDocx && adminPdf) adminDocx = deriveDocx(adminPdf);

        // Clean PDFs for viewing
        if (editorPdf) editorPdf = cleanUrl(editorPdf);
        if (reviewerPdf) {
          reviewerPdf = cleanUrl(reviewerPdf);
          console.log('🔍 [URL Debug] Cleaned reviewer PDF:', reviewerPdf);
        }
        if (adminPdf) adminPdf = cleanUrl(adminPdf);

        setSelectedArticle((prev) => ({
          ...prev,
          editorDocumentUrl: data.article.editorDocumentUrl,
          latestEditorPdfUrl: editorPdf,
          latestEditorDocxUrl: editorDocx,
          latestReviewerPdfUrl: reviewerPdf,
          latestReviewerDocxUrl: reviewerDocx,
          latestAdminPdfUrl: adminPdf,
          latestAdminDocxUrl: adminDocx,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  const handleDownloadFile = async (fileUrl, fileName, type) => {
    if (!fileUrl) return toast.error("File not available");
    try {
      toast.info(`Downloading ${type}...`);
      const token = localStorage.getItem("adminToken");
      const fullUrl = fileUrl.startsWith("http")
        ? fileUrl
        : `${NEXT_PUBLIC_BASE_URL}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;

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

  // Jab bhi admin koi article khole, uski history load ho jaye
  // Isse purane wale ki jagah paste karein
  useEffect(() => {
    const articleId = selectedArticle?.id || selectedArticle?._id;
    if (articleId) {
      // Sirf fetch tab karein jab article change ho, loop rokne ke liye
      const currentLoadedId =
        changeHistory.length > 0
          ? changeHistory[0].articleId || changeHistory[0]._id
          : null;
      if (articleId !== currentLoadedId) {
        fetchChangeHistory(articleId);
      }
    }
  }, [selectedArticle?.id, selectedArticle?._id]);

  // PDF URL Fix Logic (Isse "PDF Not Found" khatam ho jayega)
  console.log("Admin Dashboard Data Row:", selectedArticle);
  // ✅ Corrected Function
  const getPdfUrlToView = () => {
    if (!selectedArticle) return null;

    // 1. Agar Visual Diff mode hai, to Blob URL return karo
    if (pdfViewMode === "visual-diff") {
      return visualDiffBlobUrl;
    }

    // 2. Baki modes ke liye path set karo
    let path = "";
    if (pdfViewMode === "original") path = selectedArticle.originalPdfUrl;
    else if (pdfViewMode === "admin") path = selectedArticle.latestAdminPdfUrl; // ✅ UPDATED: Admin specific
    else if (pdfViewMode === "current") path = selectedArticle.currentPdfUrl; // Fallback for general latest
    else if (pdfViewMode === "editor") path = selectedArticle.latestEditorPdfUrl || selectedArticle.editorDocumentUrl;
    else if (pdfViewMode === "reviewer") path = selectedArticle.latestReviewerPdfUrl;
    else if (pdfViewMode === "track") path = selectedArticle.editorDocumentUrl;

    if (!path) return null;

    const cleanPath = path.startsWith("http")
      ? path
      : `${NEXT_PUBLIC_BASE_URL}/${path.replace(/\\/g, "/").replace(/^\//, "")}`;

    // Add timestamp to prevent PDF caching
    return `${cleanPath}?cb=${Date.now()}`;
  };
  // ✅ FETCH DATA (Articles + Editors)
  // --- REPLACE YOUR OLD useEffect WITH THIS ---
  // ✅ 1. Pehle Function Define karo (Order Fix)
  const mapBackendStatus = (status) => {
    if (status === "PENDING_ADMIN_REVIEW") return "Pending";
    if (status === "APPROVED") return "Published";
    if (status === "PUBLISHED") return "Published";
    if (status === "ASSIGNED_TO_EDITOR") return "In Review";
    return status;
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
      const originalRes = await fetch(
        selectedArticle.originalPdfUrl.startsWith("http") ? selectedArticle.originalPdfUrl : `${NEXT_PUBLIC_BASE_URL}${selectedArticle.originalPdfUrl}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const originalBlob = await originalRes.blob();
      const originalFile = new File([originalBlob], "original.pdf", { type: "application/pdf" });

      // 2. Fetch Current (Edited/Target) PDF
      const editedRes = await fetch(
        targetPdfUrl.startsWith("http") ? targetPdfUrl : `${NEXT_PUBLIC_BASE_URL}${targetPdfUrl}`,
        { headers: { Authorization: `Bearer ${token}` } }
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
            fetch(`${NEXT_PUBLIC_BASE_URL}/api/admin/dashboard/summary?cb=${cb}`, { headers }),
            fetch(`${NEXT_PUBLIC_BASE_URL}/api/admin/dashboard/time-metrics?cb=${cb}`, { headers }),
            fetch(`${NEXT_PUBLIC_BASE_URL}/api/admin/dashboard/status-distribution?cb=${cb}`, { headers }),
            fetch(`${NEXT_PUBLIC_BASE_URL}/api/admin/dashboard/articles-timeline?limit=50&cb=${cb}`, { headers }),
            fetch(`${NEXT_PUBLIC_BASE_URL}/api/users/editors?cb=${cb}`, { headers }),
            fetch(`${NEXT_PUBLIC_BASE_URL}/api/users/reviewers?cb=${cb}`, { headers }), // ✅ Fetch Reviewers
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
            date: item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB") : "Just Now",
            abstract: item.abstract,
            originalPdfUrl: item.originalPdfUrl,
            currentPdfUrl: item.currentPdfUrl,
            originalWordUrl: item.originalWordUrl, // ✅ Added for Download Original
            currentWordUrl: item.currentWordUrl,   // ✅ Added for Download Final
            pdfUrl: item.currentPdfUrl || item.originalPdfUrl,
          }));
          setArticles(formatted);
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
  }, [isAuthorized]);

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
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showAbstract, setShowAbstract] = useState(null);

  // ✅ ASSIGN LOGIC
  const assignArticle = async (articleId, editorId) => {
    if (!editorId) return;
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(
        `${NEXT_PUBLIC_BASE_URL}/api/articles/${articleId}/assign-editor`,
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
        toast.success(data.message || "Editor assigned successfully!");
      } else {
        // 🛑 2. BACKEND CHECK: Agar backend bole "Already Assigned"
        if (response.status === 409 || data.message?.toLowerCase().includes("already")) {
          toast.warning("msg: Article Already Assigned!");
        } else {
          toast.error(data.message || "Failed to assign editor");
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
        `${NEXT_PUBLIC_BASE_URL}/api/articles/${articleId}/assign-reviewer`,
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
        toast.success(data.message || "Reviewer assigned successfully!");
      } else {
        if (response.status === 409 || data.message?.toLowerCase().includes("already")) {
          toast.warning("msg: Article Already Assigned!");
        } else {
          toast.error(data.message || "Failed to assign reviewer");
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

      const res = await fetch(`${NEXT_PUBLIC_BASE_URL}/api/articles/${selectedArticle.id}/upload-corrected`, {
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
        `${NEXT_PUBLIC_BASE_URL}/api/articles/${id}/admin-publish`,
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

  const filteredArticles = articles.filter((art) => {
    const matchesSearch =
      art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || art.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const deleteArticle = async (id) => {
    try {
      const token = localStorage.getItem("adminToken");
      // Backend API calling
      const response = await fetch(`${NEXT_PUBLIC_BASE_URL}/api/articles/${id}`, {
        method: "DELETE", // Backend route.ts mein delete method hai
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        // Frontend state se article hatayein
        setArticles((prev) => prev.filter((art) => art.id !== id));
        toast.success("Article deleted successfully!"); //
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to delete article");
      }
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Server error while deleting");
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
            <Link href="/admin/add-editor">
              <button className="bg-red-600 text-white px-3 py-2 md:px-5 md:py-2 rounded-lg font-bold hover:bg-black transition-all text-[10px] md:text-xs">
                + CREATE EDITOR
              </button>
            </Link>
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
            filteredArticles={filteredArticles}
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
            deleteArticle={deleteArticle}
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

