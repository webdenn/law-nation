
"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { diffWords } from 'diff';
// import { toast } from "react-toastify";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminSidebar from "../../components/AdminSidebar";
import MultiDiffViewer from "./MultiDiffViewer"; // ✅ NEW IMPORT

const DiffViewer = ({ diffData }) => {
  if (!diffData || !diffData.summary)
    return (
      <p className="text-xs text-gray-400 italic">No diff data available.</p>
    );
  return (
    <div className="mt-3 bg-gray-50 rounded border border-gray-200 text-xs font-mono overflow-hidden">
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
      </div>
    </div>
  );
};
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
// Stat Card Component
const StatCard = ({ title, count }) => (
  <div className="bg-white p-6 rounded-xl border-l-4 border-red-600 shadow-md">
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
      {title}
    </p>
    <h3 className="text-3xl font-extrabold mt-2 text-gray-800">{count}</h3>
  </div>
);

const compareTexts = (oldText, newText) => {
  if (!oldText) oldText = "";
  if (!newText) newText = "";
  // diffWords words ke basis pe compare karega (aap diffChars bhi use kar sakte ho)
  return diffWords(oldText, newText);
};

// Function 2: Changes ko HTML mein convert karta hai (Green/Red colors ke sath)
const formatDifferences = (diffParts) => {
  return diffParts.map((part) => {
    // Agar added hai to Green, Removed hai to Red, nahi to normal
    if (part.added) {
      return `<span class="bg-green-200 text-green-800 px-1 rounded">${part.value}</span>`;
    }
    if (part.removed) {
      return `<span class="bg-red-200 text-red-800 px-1 rounded line-through">${part.value}</span>`;
    }
    return `<span>${part.value}</span>`;
  }).join('');
};

export default function AdminDashboard() {
  const router = useRouter();
  const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
  const [isLoading, setIsLoading] = useState(true);

  const [visualDiffBlobUrl, setVisualDiffBlobUrl] = useState(null);
  const [isGeneratingDiff, setIsGeneratingDiff] = useState(false);

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
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
        // Note: logs are likely ASC or DESC. Let's assume consistent with backend (which I fixed to be DESC or ASC? Backend sends `orderBy: { versionNumber: "asc" }`)
        // If ASC, we want the LAST occurrence.

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

          // 2. Fix Directory (/uploads/pdfs/ -> /uploads/words/)
          // ❌ REMOVED: Admin/Editor DOCX files are actually stored in /uploads/pdfs/ alongside the PDF.
          // The previous logic incorrectly forced them to look in /uploads/words/ which caused 404s.
          // if (docxUrl.includes('/uploads/pdfs/')) {
          //   docxUrl = docxUrl.replace('/uploads/pdfs/', '/uploads/words/');
          // }

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
  const handleDownloadAdminReport = async (changeLogId, type, format = "pdf") => {
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        toast.error("Authentication token missing");
        return;
      }

      const articleId = selectedArticle?.id || selectedArticle?._id;
      if (!articleId) {
        toast.error("No article selected");
        return;
      }

      if (!changeLogId) {
        toast.error("No change log selected");
        return;
      }

      // ────────────────────────────────────────────────────────────────
      //                 Choose correct endpoint pattern
      // ────────────────────────────────────────────────────────────────
      let endpoint;

      if (type === "diff") {
        endpoint = `${NEXT_PUBLIC_BASE_URL}/api/articles/${articleId}/change-log/${changeLogId}/download-diff?format=${format}`;
      } else {
        // track / editor-document
        endpoint = `${NEXT_PUBLIC_BASE_URL}/api/articles/change-logs/${changeLogId}/editor-document?format=${format}`;
      }

      toast.info(`Generating ${format.toUpperCase()}...`);

      const res = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        let errorMsg = "Download failed";
        try {
          const errData = await res.json();
          errorMsg = errData.message || errorMsg;
        } catch { }
        throw new Error(errorMsg);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download =
        `${type.toUpperCase()}-${changeLogId}-${new Date().toISOString().slice(0, 10)}.${format === "word" ? "docx" : "pdf"}`;

      document.body.appendChild(a);
      a.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);

      toast.success(`${format.toUpperCase()} downloaded!`);
    } catch (err) {
      console.error("Download error:", err);
      toast.error(err.message || "Download failed or format not supported.");
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
  // ✅ ASSIGN LOGIC (Fixed: Handles "Already Assigned" error correctly)
  // ✅ ASSIGN LOGIC (Updated)
  const assignArticle = async (articleId, editorId) => {
    if (!editorId) return;
    // 🛑 1. FRONTEND CHECK: Kya Editor pehle se assigned hai?
    const currentArticle = articles.find((a) => a.id === articleId);

    // Agar assignedTo exist karta hai aur empty nahi hai
    // if (currentArticle?.assignedTo && currentArticle.assignedTo !== "") {
    //   const isConfirmed = window.confirm(
    //     "⚠️ This article is ALREADY ASSIGNED to an editor.\n\nDo you want to re-assign it?"
    //   );

    //   if (!isConfirmed) {
    //     // Agar user cancel kar de, to UI ko refresh kar do taaki purana editor wapis select ho jaye
    //     setArticles([...articles]);
    //     return; // Process wahin rok do
    //   }
    // }
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
      {/* 🔴 SIDEBAR (Responsive) */}
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
          {/* --- REPLACE STAT CARDS & CHARTS SECTION WITH THIS --- */}
          {/* 1️⃣ STAT CARDS (Ab Backend Data Use Kar Rahe Hain) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard
              title="Total Submissions"
              count={stats.totalSubmissions || 0}
            />
            <StatCard
              title="Pending Review"
              count={stats.pendingReview || 0}
              color="border-yellow-500"
            />
            <StatCard
              title="In Review"
              count={stats.underReview || 0}
              color="border-blue-500"
            />
            <StatCard
              title="Published"
              count={stats.published || 0}
              color="border-green-600"
            />
          </div>
          {/* 2️⃣ CHARTS SECTION (Naye Visuals) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 mb-8">
            {/* Main Chart: Status Distribution */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-lg">
              <div className="mb-6">
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-tighter">
                  Article Status Trends
                </h3>
                <p className="text-xs text-gray-500">
                  Live distribution of all submissions
                </p>
              </div>
              {/* ✅ Naya Visuals: Count + Percentage dono ke liye */}
              <div className="flex flex-col md:flex-row items-center justify-around gap-10 py-4">
                {/* PIE CHART SVG */}
                <div className="relative w-48 h-48 group">
                  <svg
                    viewBox="0 0 36 36"
                    className="w-full h-full transform -rotate-90 drop-shadow-xl"
                  >
                    {/* Background Circle */}
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="transparent"
                      stroke="#f3f4f6"
                      strokeWidth="3.5"
                    ></circle>
                    {/* Pending Segment (Red) */}
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="transparent"
                      stroke="#dc2626"
                      strokeWidth="3.8"
                      strokeDasharray={`${statusDist[0]?.percentage || 0} ${100 - (statusDist[0]?.percentage || 0)
                        }`}
                      strokeDashoffset="0"
                      className="transition-all duration-1000 ease-out"
                    ></circle>
                    {/* Published Segment (Green) */}
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="transparent"
                      stroke="#16a34a"
                      strokeWidth="3.8"
                      strokeDasharray={`${statusDist[1]?.percentage || 0} ${100 - (statusDist[1]?.percentage || 0)
                        }`}
                      strokeDashoffset={`-${statusDist[0]?.percentage || 0}`}
                      className="transition-all duration-1000 ease-out"
                    ></circle>
                  </svg>
                  {/* Center Text (Total Count) */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-gray-800">
                      {(statusDist[0]?.count || 0) +
                        (statusDist[1]?.count || 0)}
                    </span>
                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                      Total
                    </span>
                  </div>
                </div>
                {/* LEGEND BOXES (Side Labels) */}
                <div className="flex flex-col gap-4 w-full md:w-auto">
                  {statusDist.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-sm hover:translate-x-2 transition-transform"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-gray-800 uppercase tracking-tighter">
                          {item.label}
                        </p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-black text-gray-700">
                            {item.count}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400">
                            ({item.percentage}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Side Widget: Time Metrics */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-800 uppercase">
                  System Efficiency
                </h3>
                <p className="text-xs text-gray-500 mb-6">
                  Average processing times
                </p>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-xs font-bold text-gray-500">
                      Submit → Published
                    </span>
                    <span className="text-lg font-black text-green-600">
                      {timeMetrics?.averageDays?.submissionToPublished?.toFixed(
                        1
                      ) || "0"}{" "}
                      <span className="text-[10px]">days</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-xs font-bold text-gray-500">
                      To Assign
                    </span>
                    <span className="text-sm font-bold text-gray-800">
                      {timeMetrics?.averageDays?.submissionToAssigned?.toFixed(
                        1
                      ) || "0"}{" "}
                      days
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-xs font-bold text-gray-500">
                      To Review
                    </span>
                    <span className="text-sm font-bold text-gray-800">
                      {timeMetrics?.averageDays?.assignedToReviewed?.toFixed(
                        1
                      ) || "0"}{" "}
                      days
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* 📊 END: PRO ANALYTICS SECTION */}
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
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                  className="p-2 border rounded-lg text-xs font-bold outline-none cursor-pointer w-full sm:w-auto"
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
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-gray-100 text-[10px] uppercase text-gray-400 font-bold">
                  <tr>
                    <th className="p-5">PDF Document & Abstract</th>
                    <th className="p-5">Author & Date</th>
                    <th className="p-5">Status</th>
                    <th className="p-5 text-center">Assign Editor</th>
                    <th className="p-5 text-center">Assign Reviewer</th>
                    <th className="p-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan="5"
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
                            onClick={() => handlePdfClick(art.pdfUrl)}
                            className="font-bold text-gray-800 underline cursor-pointer hover:text-red-600"
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
                          <p className="text-[10px] text-gray-400">
                            {art.date}
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
                            {art.status}
                          </span>
                        </td>
                        {/* 4. Assign Editor Dropdown */}
                        {/* 4. Assign Editor Dropdown (Updated UI) */}
                        <td className="p-5 text-center">
                          <div className="flex flex-col items-center">
                            {/* Agar Assigned hai to upar status dikhao */}
                            {art.assignedTo && (
                              <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full mb-1 border border-green-200 uppercase tracking-wide">
                                ✅ Already Assigned
                              </span>
                            )}

                            <select
                              className={`p-2 border rounded text-xs font-bold outline-none cursor-pointer w-32 transition-all ${art.assignedTo
                                ? "bg-green-50 border-green-300 text-green-800" // Assigned style
                                : "bg-white border-gray-200"
                                }`}
                              value={art.assignedTo || ""}
                              onChange={(e) =>
                                assignArticle(art.id, e.target.value)
                              }
                            >
                              <option value="">Assign To...</option>
                              {editors.map((e) => (
                                <option key={e._id || e.id} value={e._id || e.id}>
                                  {e.name || e.email}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        {/* 4.5 Assign Reviewer Dropdown */}
                        <td className="p-5 text-center">
                          <div className="flex flex-col items-center">
                            {art.assignedReviewer && (
                              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mb-1 border border-blue-200 uppercase tracking-wide">
                                Assigned to {reviewers.find(r => r.id === art.assignedReviewer || r._id === art.assignedReviewer)?.name || "User"}
                              </span>
                            )}
                            <select
                              className={`p-2 border rounded text-xs font-bold outline-none cursor-pointer w-32 transition-all ${art.assignedReviewer
                                ? "bg-blue-50 border-blue-300 text-blue-800"
                                : "bg-white border-gray-200"
                                }`}
                              value={art.assignedReviewer || ""}
                              onChange={(e) => assignReviewer(art.id, e.target.value)}
                            >
                              <option value="">Assign Reviewer...</option>
                              {reviewers.map((r) => (
                                <option key={r._id || r.id} value={r._id || r.id}>
                                  {r.name || r.email}
                                </option>
                              ))}
                            </select>
                          </div>
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
                            onClick={() => overrideAndPublish(art.id)}
                            disabled={art.status === "Published"}
                            className={`w-[90px] py-2 rounded text-[10px] font-black transition-colors uppercase text-center ${art.status === "Published"
                              ? "bg-gray-400 cursor-not-allowed text-gray-200"
                              : "bg-black text-white hover:bg-green-600"
                              }`}
                          >
                            {art.status === "Published"
                              ? "Published"
                              : "Publish"}
                          </button>
                          <button
                            onClick={() => {

                              deleteArticle(art.id);
                            }}
                            className="bg-red-100 text-red-600 p-2 rounded hover:bg-red-600 hover:text-white transition-all shrink-0"
                            title="Delete Article"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862A2 2 0 011.995 18.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
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
      {/* ✅ MULTI-DIFF VIEWER OVERLAY */}
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
        <div className="fixed inset-0 bg-white z-[60] flex flex-col overflow-hidden animate-in fade-in duration-300 font-sans">
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
                        handleDownloadFile(selectedArticle.latestAdminPdfUrl, `Admin_Edited_${selectedArticle.title}`, "PDF");
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
                    Editor Version
                  </button>
                  {selectedArticle.latestEditorPdfUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadFile(selectedArticle.latestEditorPdfUrl, `Editor_Version_${selectedArticle.title}`, "PDF");
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
                    Reviewer Version
                  </button>
                  {selectedArticle.latestReviewerPdfUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadFile(selectedArticle.latestReviewerPdfUrl, `Reviewer_Version_${selectedArticle.title}`, "PDF");
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

                {/* Publish Section */}
                <div className="pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-bold text-gray-800 uppercase mb-3">
                    Final Decision
                  </h3>
                  <button
                    onClick={() => overrideAndPublish(selectedArticle.id)}
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

                  <div className="border-t border-gray-100 my-2 pt-2"></div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">
                    Review Versions (DOCX)
                  </h3>

                  {/* Admin Edited - Always Visible, Disabled if missing */}
                  <button
                    onClick={() => handleDownloadFile(selectedArticle.latestAdminDocxUrl, `Admin_Edited_${selectedArticle.title}`, "Word")}
                    disabled={!selectedArticle.latestAdminDocxUrl}
                    className={`w-full py-2 border rounded text-xs font-bold transition ${selectedArticle.latestAdminDocxUrl
                      ? "bg-gray-50 hover:bg-gray-100 text-red-700 border-gray-200"
                      : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      }`}
                  >
                    Admin Edited (DOCX)
                  </button>

                  {selectedArticle.latestEditorDocxUrl && (
                    <button
                      onClick={() => handleDownloadFile(selectedArticle.latestEditorDocxUrl, `Editor_Version_${selectedArticle.title}`, "Word")}
                      className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-blue-700 border border-gray-200 rounded text-xs font-bold transition"
                    >
                      Editor Version (DOCX)
                    </button>
                  )}
                  {selectedArticle.latestReviewerDocxUrl && (
                    <button
                      onClick={() => handleDownloadFile(selectedArticle.latestReviewerDocxUrl, `Reviewer_Version_${selectedArticle.title}`, "Word")}
                      className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-purple-700 border border-gray-200 rounded text-xs font-bold transition"
                    >
                      Reviewer Version (DOCX)
                    </button>
                  )}
                </div>

              </div>
            </div>

          </div>
        </div >
      )
      }
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </div >
  );
}
