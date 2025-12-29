"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
// import { toast } from "react-toastify";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
      router.push("/admin-login");
    } else {
      try {
        if (adminData) {
          setCurrentAdmin(JSON.parse(adminData));
        }
        setIsAuthorized(true);
      } catch (error) {
        localStorage.removeItem("adminToken");
        router.push("/admin-login");
      }
    }
  }, [router]);

  // ✅ 3. ADMIN LOGOUT
  const handleLogout = () => {
    // Saara data saaf karo
    localStorage.clear(); // Sabse safe tareeka (Saari keys delete ho jayengi)

    toast.info("Admin Logged Out");
    router.push("/admin-login");
    // Page refresh kar do taaki states poori tarah reset ho jayein
    window.location.reload();
  };

  // --- DASHBOARD DATA & LOGIC ---
  const [editors, setEditors] = useState([]);
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

  // ✅ FETCH DATA (Articles + Editors)
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchData = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        const headers = { Authorization: `Bearer ${token}` };

        // 1. Fetch Articles
        const articlesRes = await fetch(`${API_BASE_URL}/api/articles`, {
          headers,
        });
        const articlesData = await articlesRes.json();
        // Isko thoda aur robust banayein
        const articleList = Array.isArray(articlesData)
          ? articlesData
          : articlesData.articles || articlesData.data || [];

        const formattedArticles = articleList.map((item) => ({
          id: item._id || item.id,
          title: item.title,
          author: item.authorName || "Unknown",
          status: mapBackendStatus(item.status),
          assignedTo: item.assignedEditorId || "",
          date: new Date(item.createdAt).toLocaleDateString("en-GB"),
          abstract: item.abstract,
          pdfUrl: item.currentPdfUrl,
        }));
        setArticles(formattedArticles);

        // 2. Fetch Editors
        const editorsRes = await fetch(`${API_BASE_URL}/api/users/editors`, {
          headers,
        });
        if (editorsRes.ok) {
          const editorsData = await editorsRes.json();
          // Backend se array ya data object handle karna
          const editorList = Array.isArray(editorsData)
            ? editorsData
            : editorsData.editors || editorsData.data || [];
          setEditors(editorList);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
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
        `${API_BASE_URL}/api/articles/${id}/approve`,
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
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
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
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-white">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
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
        <div className="p-4 md:p-10 space-y-6 md:space-y-10 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard title="Total Submissions" count={articles.length} />
            <StatCard
              title="Awaiting"
              count={articles.filter((a) => a.status === "Pending").length}
            />
            <StatCard title="Editors" count={editors.length} />
            <StatCard
              title="Published"
              count={articles.filter((a) => a.status === "Published").length}
            />
          </div>


          {/* 📊 START: PRO ANALYTICS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 mb-8">
            
            {/* 1. MAIN CHART: Submissions vs Approvals (Double Bar) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-lg">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-tighter">
                    Submission Trends
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">
                    Comparison: Received vs Published
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                    <span className="text-[10px] font-bold text-gray-500">Received</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-600"></span>
                    <span className="text-[10px] font-bold text-gray-500">Published</span>
                  </div>
                </div>
              </div>
              
              {/* Chart Area with Grid Background */}
              <div className="relative h-64 w-full border-b border-gray-200">
                {/* Background Grid Lines (0%, 25%, 50%, 75%, 100%) */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {[100, 75, 50, 25, 0].map((val) => (
                    <div key={val} className="w-full border-t border-dashed border-gray-100 relative">
                      <span className="absolute -left-8 -top-2 text-[10px] text-gray-400 font-bold">{val}</span>
                    </div>
                  ))}
                </div>

                {/* Bars Container */}
                <div className="absolute inset-0 flex items-end justify-between px-2 pl-4">
                  {[
                    { day: "Mon", v1: 60, v2: 40 },
                    { day: "Tue", v1: 45, v2: 25 },
                    { day: "Wed", v1: 80, v2: 55 },
                    { day: "Thu", v1: 50, v2: 30 },
                    { day: "Fri", v1: 90, v2: 70 },
                    { day: "Sat", v1: 35, v2: 20 },
                    { day: "Sun", v1: 75, v2: 60 },
                  ].map((data, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 group w-full">
                      {/* Bar Group */}
                      <div className="flex gap-1 h-full items-end">
                        {/* Bar 1 (Gray) */}
                        <div 
                          className="w-2 md:w-4 bg-gray-300 rounded-t-sm hover:bg-gray-400 transition-all duration-300"
                          style={{ height: `${data.v1}%` }}
                        ></div>
                        {/* Bar 2 (Red) */}
                        <div 
                          className="w-2 md:w-4 bg-red-600 rounded-t-sm shadow-md hover:bg-red-700 transition-all duration-300"
                          style={{ height: `${data.v2}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 mt-2">{data.day}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. SIDE WIDGET: Editor Performance (Donut Style) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-tighter mb-1">
                  System Health
                </h3>
                <p className="text-xs text-gray-500 mb-6">Article Review Efficiency</p>
                
                {/* CSS Conic Gradient Donut Chart */}
                <div className="flex items-center justify-center py-4">
                  <div className="relative w-40 h-40 rounded-full bg-gray-100 flex items-center justify-center"
                       style={{ background: 'conic-gradient(#DC2626 75%, #F3F4F6 0)' }} // Red 75% filled
                  >
                    <div className="w-28 h-28 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                      <span className="text-3xl font-black text-gray-800">75%</span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Efficiency</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mini List */}
              <div className="space-y-3 mt-4">
                <div className="flex justify-between items-center text-xs font-bold border-b border-gray-50 pb-2">
                  <span className="text-gray-500">Active Editors</span>
                  <span className="text-gray-800">12 Online</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold border-b border-gray-50 pb-2">
                  <span className="text-gray-500">Pending Reviews</span>
                  <span className="text-red-600">08 Urgent</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-gray-500">Avg. Time</span>
                  <span className="text-green-600">2.5 Days</span>
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
                  <option value="In Review">In Review</option>
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
                            onClick={() => overrideAndPublish(art.id)}
                            className="bg-black text-white px-4 py-2 rounded text-[10px] font-black hover:bg-green-600 transition-colors uppercase"
                          >
                            Publish
                          </button>

                          <button
                            onClick={() => deleteArticle(art.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all group"
                            title="Delete Article"
                          >
                            <svg
                              className="w-5 h-5 group-hover:scale-110 transition-transform"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
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
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </div>
  );
}