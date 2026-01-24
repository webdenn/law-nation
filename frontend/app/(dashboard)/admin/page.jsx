
"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { diffWords } from 'diff';
// import { toast } from "react-toastify";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminSidebar from "../../components/AdminSidebar";

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
        if (data.article?.editorDocumentUrl && selectedArticle?.editorDocumentUrl !== data.article.editorDocumentUrl) {
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
    else if (pdfViewMode === "current") path = selectedArticle.currentPdfUrl;
    else if (pdfViewMode === "track") path = selectedArticle.editorDocumentUrl;

    if (!path) return null;

    const cleanPath = path.startsWith("http")
      ? path
      : `${NEXT_PUBLIC_BASE_URL}/${path.replace(/^\//, "")}`;

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
      if (!selectedArticle?.currentPdfUrl) throw new Error("Current PDF missing");

      // 1. Fetch Original PDF
      const originalRes = await fetch(
        selectedArticle.originalPdfUrl.startsWith("http") ? selectedArticle.originalPdfUrl : `${NEXT_PUBLIC_BASE_URL}${selectedArticle.originalPdfUrl}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const originalBlob = await originalRes.blob();
      const originalFile = new File([originalBlob], "original.pdf", { type: "application/pdf" });

      // 2. Fetch Current (Edited) PDF
      const editedRes = await fetch(
        selectedArticle.currentPdfUrl.startsWith("http") ? selectedArticle.currentPdfUrl : `${NEXT_PUBLIC_BASE_URL}${selectedArticle.currentPdfUrl}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const editedBlob = await editedRes.blob();
      const editedFile = new File([editedBlob], "edited.pdf", { type: "application/pdf" });

      // 3. Extract & Compare
      const originalText = await extractTextFromPDF(originalFile);
      const editedText = await extractTextFromPDF(editedFile);

      // Ye Array return karta hai
      const differences = compareTexts(originalText.fullText, editedText.fullText);

      // ❌ DELETE THIS LINE (Ye string bana raha tha jo error de raha hai)
      // const formattedDiff = formatDifferences(differences); 

      // 4. Generate Diff PDF
      // ✅ FIX: 'differences' (Array) pass karein, 'formattedDiff' (String) nahi
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

        const [summaryRes, metricsRes, statusRes, timelineRes, editorsRes] =
          await Promise.all([
            fetch(`${NEXT_PUBLIC_BASE_URL}/api/admin/dashboard/summary?cb=${cb}`, { headers }),
            fetch(`${NEXT_PUBLIC_BASE_URL}/api/admin/dashboard/time-metrics?cb=${cb}`, { headers }),
            fetch(`${NEXT_PUBLIC_BASE_URL}/api/admin/dashboard/status-distribution?cb=${cb}`, { headers }),
            fetch(`${NEXT_PUBLIC_BASE_URL}/api/admin/dashboard/articles-timeline?limit=50&cb=${cb}`, { headers }),
            fetch(`${NEXT_PUBLIC_BASE_URL}/api/users/editors?cb=${cb}`, { headers }),
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
  const [isPublishing, setIsPublishing] = useState(false); // ✅ NEW State

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
                className="bg-red-600 text-white px-8 py-2 rounded-lg font-black uppercase text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedArticle && (
        <div className="fixed inset-0 bg-white z-[60] flex flex-col overflow-hidden animate-in fade-in duration-300">
          {/* HEADER */}
          <header className="bg-red-700 text-white p-4 flex justify-between items-center shadow-xl">
            <div className="flex items-center gap-4">
              <h3 className="font-black italic text-lg uppercase">
                Admin Review Mode
              </h3>
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs">
                {selectedArticle.title}
              </span>
            </div>
            <button
              onClick={() => setSelectedArticle(null)}
              className="bg-black hover:bg-gray-800 px-6 py-2 rounded-lg text-xs font-black transition-all"
            >
              CLOSE REVIEW
            </button>
          </header>

          <div className="flex flex-1 overflow-hidden p-4 gap-6 bg-gray-100">
            {/* LEFT SIDE: PDF VIEWER */}
            <div className="flex-1 bg-white rounded-2xl shadow-2xl relative overflow-hidden flex flex-col border border-gray-200">
              <div className="p-4 border-b bg-gray-50 flex gap-4">
                <button
                  onClick={() => setPdfViewMode("original")}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${pdfViewMode === "original"
                    ? "bg-red-600 text-white shadow-lg"
                    : "bg-white text-gray-400 border"
                    }`}
                >
                  1. ORIGINAL SUBMISSION
                </button>
                <button
                  onClick={() => setPdfViewMode("current")}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${pdfViewMode === "current"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-white text-gray-400 border"
                    }`}
                >
                  2. FINAL EDITED VERSION
                </button>

                {/* ✅ VISUAL DIFF BUTTON (Track File Removed) */}
                <button
                  onClick={handleViewVisualDiff}
                  disabled={isGeneratingDiff}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${pdfViewMode === "visual-diff"
                    ? "bg-green-600 text-white shadow-lg"
                    : "bg-white text-gray-400 border"
                    }`}
                >
                  {isGeneratingDiff ? "GENERATING..." : "3. VIEW VISUAL DIFF"}
                </button>
              </div>

              {/* ✅ IFRAME LOGIC with Loading State */}
              {getPdfUrlToView() ? (
                <iframe
                  key={getPdfUrlToView()} // Key ensures refresh on URL change
                  src={getPdfUrlToView()}
                  className="flex-1 w-full"
                  title="Admin Viewer"
                />
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-100 text-gray-500">
                  <p>
                    {isGeneratingDiff
                      ? "Analyzing documents & generating diff..."
                      : "PDF URL not found or generation failed."}
                  </p>
                </div>
              )}
            </div>

            {/* RIGHT SIDE: EDITOR'S LOGS & ACTIONS */}
            <div className="w-[450px] overflow-y-auto space-y-4">
              {/* ✅ SOURCE FILES SECTION */}
              <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                <h4 className="font-black text-gray-800 border-b pb-3 mb-6 flex items-center gap-2 text-sm">
                  <span>📄</span> SOURCE FILES
                </h4>
                <div className="space-y-3">
                  {/* Original DOCX */}
                  <button
                    onClick={() =>
                      handleDownloadFile(
                        selectedArticle.originalWordUrl || selectedArticle.originalPdfUrl,
                        `Original_${selectedArticle.title}`,
                        "Word"
                      )
                    }
                    className="w-full py-3 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-100 border border-blue-200 transition flex items-center justify-center gap-2"
                  >
                    <DownloadIcon /> Download Original DOCX
                  </button>

                  {/* Final DOCX */}
                  <button
                    onClick={() =>
                      handleDownloadFile(
                        selectedArticle.currentWordUrl,
                        `Final_${selectedArticle.title}`,
                        "Word"
                      )
                    }
                    disabled={!selectedArticle.currentWordUrl}
                    className={`w-full py-3 font-bold rounded-xl transition flex items-center justify-center gap-2 ${selectedArticle.currentWordUrl
                      ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed text-xs"
                      }`}
                  >
                    <DownloadIcon /> {selectedArticle.currentWordUrl ? "Download Final DOCX" : "Final DOCX Not Ready"}
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                
                <button
                  onClick={() => overrideAndPublish(selectedArticle.id)}
                  disabled={isPublishing}
                  className={`w-full mt-10 text-white py-4 rounded-xl font-black shadow-lg transition-all uppercase tracking-tighter ${isPublishing
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 hover:shadow-green-200"
                    }`}
                >
                  {isPublishing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      PUBLISHING...
                    </span>
                  ) : (
                    "Final Approve & Publish"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </div>
  );
}
