"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
// import { toast } from "react-toastify";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ✅ Ye poora block copy karke paste karo
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

export default function AdminDashboard() {
  const router = useRouter();
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // ✅ 0. UI STATE (Responsive Sidebar)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ✅ 1. SECURITY STATES
  const [currentAdmin, setCurrentAdmin] = useState({
    name: "Admin",
    email: "",
  });
  const [isAuthorized, setIsAuthorized] = useState(false);

  // ✅ 2. ROUTE PROTECTION
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

  // ✅ 3. ADMIN LOGOUT
  const handleLogout = () => {
    // Saara data saaf karo
    localStorage.clear(); // Sabse safe tareeka (Saari keys delete ho jayengi)

    toast.info("Admin Logged Out");
    router.push("/management-login");
    // Page refresh kar do taaki states poori tarah reset ho jayein
    window.location.reload();
  };

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
      const res = await fetch(
        `${API_BASE_URL}/api/articles/${articleId}/change-history`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setChangeHistory(data.changeLogs || []);

        // ✅ Backend se aane wali editorDocumentUrl ko state mein inject karein
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

  // ✅ NEW: Download Diff PDF for Admin
  // ✅ REPLACE: handleDownloadDiffPdf with this universal function
  const handleDownloadAdminReport = async (
    changeLogId,
    type,
    format = "pdf"
  ) => {
    try {
      const token = localStorage.getItem("adminToken");
      const articleId = selectedArticle.id || selectedArticle._id;

      // Backend dev ki di hui documentation ke hisaab se endpoints
      const endpoint =
        type === "diff"
          ? `${API_BASE_URL}/api/articles/${articleId}/change-log/${changeLogId}/download-diff?format=${format}`
          : `${API_BASE_URL}/api/articles/change-logs/${changeLogId}/editor-document?format=${format}`;

      toast.info(`Generating ${format.toUpperCase()}...`);

      const res = await fetch(endpoint, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-v${articleId}.${
        format === "word" ? "docx" : "pdf"
      }`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Download Successful!");
    } catch (err) {
      toast.error("Format conversion not supported for this file yet.");
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
  const getPdfUrlToView = () => {
    if (!selectedArticle) return null;
    let path = "";

    if (pdfViewMode === "original") path = selectedArticle.originalPdfUrl;
    else if (pdfViewMode === "current") path = selectedArticle.currentPdfUrl;
    else if (pdfViewMode === "track") path = selectedArticle.editorDocumentUrl; // ✅ Latest logic

    if (!path) return null;
    return path.startsWith("http")
      ? path
      : `${API_BASE_URL}/${path.replace(/^\//, "")}`;
  };

  // ✅ FETCH DATA (Articles + Editors)
  // --- REPLACE YOUR OLD useEffect WITH THIS ---

  useEffect(() => {
    if (!isAuthorized) return;

    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        console.log("Admin Token:", token);
        const headers = { Authorization: `Bearer ${token}` };

        // 🔥 Promise.all se 5 API ek saath call hongi (Super Fast)
        const [summaryRes, metricsRes, statusRes, timelineRes, editorsRes] =
          await Promise.all([
            fetch(`${API_BASE_URL}/api/admin/dashboard/summary`, { headers }),
            fetch(`${API_BASE_URL}/api/admin/dashboard/time-metrics`, {
              headers,
            }),
            fetch(`${API_BASE_URL}/api/admin/dashboard/status-distribution`, {
              headers,
            }),
            fetch(
              `${API_BASE_URL}/api/admin/dashboard/articles-timeline?limit=50`,
              { headers }
            ), // Last 50 articles
            fetch(`${API_BASE_URL}/api/users/editors`, { headers }),
          ]);

        // 1. Summary Data Set Karna
        if (summaryRes.ok) {
          const data = await summaryRes.json();
          setStats(data.summary);
        }

        // 2. Time Metrics Set Karna
        if (metricsRes.ok) {
          const data = await metricsRes.json();
          setTimeMetrics(data.metrics);
        }

        // 3. Charts Data Set Karna
        // ✅ Naya Logic: Sirf API se aane wale 2 fields dikhayega
        if (statusRes.ok) {
          const data = await statusRes.json();
          const counts = data.distribution?.statusCounts || {};
          const percs = data.distribution?.percentages || {};

          // Pie chart ke liye sirf real data mapping
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

        // 4. Table Data Set Karna (Helper function mapBackendStatus use karega)
        if (timelineRes.ok) {
          const data = await timelineRes.json();
          const rawArticles = data.articles || [];

          // ✅ Correct mapping for Admin
          // ✅ Correct Mapping according to Backend Service
          const formatted = rawArticles.map((item) => ({
            id: item._id || item.id,
            title: item.title,
            author: item.authorName || "Unknown",
            status: mapBackendStatus(item.status),
            assignedTo: item.assignedEditorId || "",
            date: new Date(item.createdAt).toLocaleDateString("en-GB"),
            abstract: item.abstract,

            // 🔥 Backend fields names are exactly these:
            originalPdfUrl: item.originalPdfUrl,
            currentPdfUrl: item.currentPdfUrl,
            pdfUrl: item.currentPdfUrl || item.originalPdfUrl, // Fallback
          }));
          setArticles(formatted);
          setArticles(formatted);
        }

        // 5. Editors List Set Karna
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

  const mapBackendStatus = (status) => {
    if (status === "PENDING_ADMIN_REVIEW") return "Pending";
    if (status === "APPROVED") return "Published";
    if (status === "PUBLISHED") return "Published";
    if (status === "ASSIGNED_TO_EDITOR") return "In Review";
    return status;
  };

  const handlePdfClick = (relativeUrl) => {
    if (!relativeUrl) {
      toast.warning("PDF not found");
      return;
    }

    // ✅ Fix: Check karo ki URL '/' se shuru ho raha hai ya nahi
    // Agar relativeUrl "uploads/pdfs/..." hai, toh ye use "/uploads/pdfs/..." bana dega
    const cleanPath = relativeUrl.startsWith("/")
      ? relativeUrl
      : `/${relativeUrl}`;

    // ✅ Ab URL hamesha sahi banega: http://localhost:4000/uploads/pdfs/...
    const fullUrl = `${API_BASE_URL}${cleanPath}`;

    console.log("Opening Corrected URL:", fullUrl); // Browser console me check karne ke liye
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
      // 1. Token yahan define karna zaroori hai
      const token = localStorage.getItem("adminToken");

      const response = await fetch(
        `${API_BASE_URL}/api/articles/${articleId}/assign-editor`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Ab ye error nahi dega
          },
          body: JSON.stringify({ editorId: editorId }),
        }
      );

      if (response.ok) {
        // UI Update: Status ko 'In Review' aur editor ID set karo
        setArticles((prev) =>
          prev.map((a) =>
            a.id === articleId
              ? { ...a, assignedTo: editorId, status: "In Review" }
              : a
          )
        );
        toast.success("Assigned to editor successfully!");
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to assign editor");
      }
    } catch (error) {
      console.error("Error assigning:", error);
      toast.error("Server error while assigning");
    }
  };

  const overrideAndPublish = async (id) => {
    try {
      const token = localStorage.getItem("adminToken");

      // Check agar token nahi hai
      if (!token) {
        toast.error("Admin token missing! Please login again.");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/articles/${id}/admin-publish`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json", // 👈 YE MISSING THA (Zaroori hai)
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        // UI Update (Optimistic Update)
        setArticles((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: "Published" } : a))
        );
        toast.success("Article Approved & Published!");
      } else {
        const errorData = await response.json();
        // Server jo error bhej raha hai wo dikhao
        console.error("Server Error:", errorData);
        toast.error(errorData.message || "Approval failed");
      }
    } catch (e) {
      console.error("Network Error:", e);
      toast.error("Something went wrong while publishing.");
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
      const response = await fetch(`${API_BASE_URL}/api/articles/${id}`, {
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
      <aside
        className={`fixed md:sticky top-0 h-screen w-72 bg-red-700 text-white flex flex-col shadow-2xl z-50 transition-transform duration-300 ease-in-out
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
            <span className="text-[10px] bg-white text-red-700 px-2 py-0.5 rounded-full font-bold uppercase mt-2 inline-block">
              Admin Panel
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

        <nav className="flex-1 px-4 mt-6 space-y-2">
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="w-full text-left p-3 bg-red-800 rounded-lg font-bold"
          >
            Dashboard
          </button>
          <Link
            href="/admin/add-editor"
            className="block w-full text-left p-3 hover:bg-red-600 rounded-lg text-red-100"
          >
            Add New Editor
          </Link>
          <Link
            href="/admin/live-database"
            className="block w-full text-left p-3 hover:bg-red-600 rounded-lg text-red-100 transition-all"
          >
            Live Database
          </Link>
        </nav>
        <div className="p-4 border-t border-red-800">
          <button
            onClick={handleLogout}
            className="w-full p-2 text-sm bg-red-900 rounded font-bold uppercase hover:bg-black transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

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
                      strokeDasharray={`${statusDist[0]?.percentage || 0} ${
                        100 - (statusDist[0]?.percentage || 0)
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
                      strokeDasharray={`${statusDist[1]?.percentage || 0} ${
                        100 - (statusDist[1]?.percentage || 0)
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
                            className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                              art.status === "Published"
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
                        <td className="p-5 text-center">
                          <select
                            className="p-2 border rounded text-xs font-bold outline-none bg-white cursor-pointer w-32"
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
                            className={`w-[90px] py-2 rounded text-[10px] font-black transition-colors uppercase text-center ${
                              art.status === "Published"
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
                              if (window.confirm("Permanent Delete?"))
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
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${
                    pdfViewMode === "original"
                      ? "bg-red-600 text-white shadow-lg"
                      : "bg-white text-gray-400 border"
                  }`}
                >
                  1. ORIGINAL SUBMISSION
                </button>
                <button
                  onClick={() => setPdfViewMode("current")}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${
                    pdfViewMode === "current"
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-white text-gray-400 border"
                  }`}
                >
                  2. FINAL EDITED VERSION
                </button>
                <button
                  onClick={() => setPdfViewMode("track")}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${
                    pdfViewMode === "track"
                      ? "bg-green-600 text-white shadow-lg"
                      : "bg-white text-gray-400 border"
                  }`}
                >
                  3. VIEW TRACK FILE
                </button>
              </div>
              {/* ✅ Sirf tabhi iframe dikhao jab URL available ho */}
              {getPdfUrlToView() ? (
                <iframe
                  src={getPdfUrlToView()}
                  className="flex-1 w-full"
                  title="Admin Viewer"
                />
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-100 text-gray-500">
                  <p>PDF URL not found for this article</p>
                </div>
              )}
            </div>

            {/* RIGHT SIDE: EDITOR'S LOGS & DIFF */}
            <div className="w-[450px] overflow-y-auto space-y-4">
              <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                <h4 className="font-black text-gray-800 border-b pb-3 mb-6 flex items-center gap-2 text-sm">
                  <span>📜</span> EDITOR'S CHANGE HISTORY
                </h4>

                <div className="space-y-8">
                  {changeHistory.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 italic text-sm">
                      No edits recorded for this article.
                    </div>
                  ) : (
                    changeHistory.map((log) => (
                      <div
                        key={log.id}
                        className="relative pl-6 border-l-2 border-red-200"
                      >
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-red-600 border-4 border-white shadow-sm"></div>
                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">
                          Version {log.versionNumber}
                        </p>
                        <p className="text-[10px] text-gray-400 mb-2">
                          {new Date(log.editedAt).toLocaleString()}
                        </p>
                        <div className="bg-red-50 p-3 rounded-lg text-xs italic text-gray-700 border border-red-100 mb-3">
                          "{log.comments}"
                        </div>

                        {/* ✅ Added: Admin Download Button */}
                        <div className="grid grid-cols-2 gap-2 mt-2 border-t pt-3">
                          {/* DIFF REPORTS */}
                          <button
                            onClick={() =>
                              handleDownloadAdminReport(log.id, "diff", "pdf")
                            }
                            className="flex items-center justify-center text-[9px] font-black text-red-700 bg-red-50 p-2 rounded hover:bg-red-600 hover:text-white transition-all border border-red-200 uppercase"
                          >
                            <DownloadIcon /> Diff (PDF)
                          </button>
                          <button
                            onClick={() =>
                              handleDownloadAdminReport(log.id, "diff", "word")
                            }
                            className="flex items-center justify-center text-[9px] font-black text-blue-700 bg-blue-50 p-2 rounded hover:bg-blue-600 hover:text-white transition-all border border-blue-200 uppercase"
                          >
                            <DownloadIcon /> Diff (Word)
                          </button>

                          {/* TRACK FILE REPORTS - Backend route sync */}
                          <button
                            onClick={() =>
                              handleDownloadAdminReport(log.id, "track", "pdf")
                            }
                            className="flex items-center justify-center text-[9px] font-black text-green-700 bg-green-50 p-2 rounded hover:bg-green-600 hover:text-white transition-all border border-green-200 uppercase"
                          >
                            <DownloadIcon /> Track (PDF)
                          </button>
                          <button
                            onClick={() =>
                              handleDownloadAdminReport(log.id, "track", "word")
                            }
                            className="flex items-center justify-center text-[9px] font-black text-purple-700 bg-purple-50 p-2 rounded hover:bg-purple-600 hover:text-white transition-all border border-purple-200 uppercase"
                          >
                            <DownloadIcon /> Track (Word)
                          </button>
                        </div>

                        {/* DIFF VIEWER */}
                        <DiffViewer diffData={log.diffData} />
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={() => {
                    overrideAndPublish(selectedArticle.id);
                    setSelectedArticle(null);
                  }}
                  className="w-full mt-10 bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-black shadow-lg hover:shadow-green-200 transition-all uppercase tracking-tighter"
                >
                  Final Approve & Publish
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
