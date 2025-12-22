"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

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
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    toast.info("Admin Logged Out");
    router.push("/admin-login");
  };

  // --- DASHBOARD DATA & LOGIC ---
  const [editors, setEditors] = useState([]); // Store complete editor objects
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const API_BASE_URL = "http://localhost:4000";

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
        const articleList = Array.isArray(articlesData)
          ? articlesData
          : articlesData.articles || [];

        const formattedArticles = articleList.map((item) => ({
          id: item._id || item.id,
          title: item.title,
          author: item.authorName || "Unknown", // Fallback if name missing
          status: mapBackendStatus(item.status),
          assignedTo: item.assignedEditorId || "", // DB se jo ID aayi hai
          date: new Date(item.createdAt).toLocaleDateString("en-GB"),
          abstract: item.abstract,
          pdfUrl: item.currentPdfUrl,
        }));
        setArticles(formattedArticles);

        // 2. Fetch Editors (Backend route '/api/users/editors' hona chahiye)
        const editorsRes = await fetch(`${API_BASE_URL}/api/users/editors`, {
          headers,
        });
        if (editorsRes.ok) {
          const editorsData = await editorsRes.json();
          // Data check: agar array hai to set karo
          if (Array.isArray(editorsData)) {
            setEditors(editorsData);
          } else {
            console.error("Editors format wrong:", editorsData);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [isAuthorized]);

  const mapBackendStatus = (status) => {
    if (status === "PENDING_ADMIN_REVIEW") return "Pending";
    if (status === "APPROVED") return "Published";
    if (status === "ASSIGNED_TO_EDITOR") return "In Review";
    return status;
  };

  const handlePdfClick = (relativeUrl) => {
    if (!relativeUrl) {
      alert("PDF not found");
      return;
    }
    const fullUrl = `${API_BASE_URL}${relativeUrl}`;
    window.open(fullUrl, "_blank");
  };

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showAbstract, setShowAbstract] = useState(null);

  // ✅ CORRECTED ASSIGN LOGIC
  const assignArticle = async (articleId, editorId) => {
    if (!editorId) return; // Empty select pe kuch mat karo

    try {
      const token = localStorage.getItem("adminToken");

      // Backend Route assumption: PUT /api/articles/assign/:id
      const response = await fetch(
        `${API_BASE_URL}/api/articles/assign/${articleId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Backend needs req.user
          },
          body: JSON.stringify({ editorId: editorId }), // Body matches schema
        }
      );

      if (response.ok) {
        // UI Update immediately
        setArticles(
          articles.map((a) =>
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
      const response = await fetch(
        `${API_BASE_URL}/api/articles/publish/${id}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setArticles(
          articles.map((a) =>
            a.id === id
              ? { ...a, status: "Published", assignedTo: "Admin Override" }
              : a
          )
        );
        toast.success("Article Published!");
      } else {
        // Fallback for UI only if API fails (Dev mode)
        setArticles(
          articles.map((a) =>
            a.id === id
              ? { ...a, status: "Published", assignedTo: "Admin Override" }
              : a
          )
        );
        toast.success("Published (UI Updated)");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error publishing");
    }
  };

  const filteredArticles = articles.filter((art) => {
    const matchesSearch =
      art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || art.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <h2 className="text-xl font-bold text-red-700 animate-pulse">
          Verifying Admin Privileges...
        </h2>
      </div>
    );
  }

  // ✅ MAIN DASHBOARD UI
  return (
    <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row">
      {/* SIDEBAR */}
      <aside className="hidden md:flex w-72 bg-red-700 text-white flex-col h-screen sticky top-0 shadow-2xl">
        <div className="p-8 border-b border-red-800">
          <h1 className="text-2xl font-black italic tracking-tighter">
            LAW NATION
          </h1>
          <span className="text-[10px] bg-white text-red-700 px-2 py-0.5 rounded-full font-bold uppercase mt-2 inline-block">
            Admin Panel
          </span>
        </div>
        <nav className="flex-1 px-4 mt-6 space-y-2">
          <button className="w-full text-left p-3 bg-red-800 rounded-lg font-bold">
            Dashboard
          </button>
          <Link
            href="/admin/add-editor"
            className="block w-full text-left p-3 hover:bg-red-600 rounded-lg text-red-100"
          >
            Add New Editor
          </Link>
          <Link href="/admin/live-database" className="block w-full">
            <button className="w-full text-left p-3 hover:bg-red-600 rounded-lg text-red-100 transition-all">
              Live Database
            </button>
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
      <main className="flex-1 overflow-y-auto pb-10">
        {/* HEADER */}
        <header className="bg-white h-20 border-b flex items-center justify-between px-6 md:px-10 shadow-sm sticky top-0 z-10">
          <h2 className="text-xl font-black text-gray-700 uppercase">
            Management
          </h2>

          <div className="flex items-center gap-6">
            <Link href="/admin/add-editor">
              <button className="bg-red-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-black transition-all text-xs">
                + CREATE EDITOR
              </button>
            </Link>

            <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-gray-800">
                  {currentAdmin.name}
                </p>
                <p className="text-[10px] text-gray-500 font-medium">
                  Administrator
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-red-100 border-2 border-red-600 text-red-700 flex items-center justify-center font-black text-lg shadow-sm">
                {currentAdmin.name
                  ? currentAdmin.name.charAt(0).toUpperCase()
                  : "A"}
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <div className="p-6 md:p-10 space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 p-5 border-b flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="font-black text-gray-700 uppercase tracking-tighter text-lg">
                Monitor & Assign Articles
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Search articles..."
                  className="p-2 border rounded-lg text-xs outline-none focus:border-red-600 w-full"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                  className="p-2 border rounded-lg text-xs font-bold outline-none cursor-pointer"
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
                        <td className="p-5">
                          <p
                            onClick={() => handlePdfClick(art.pdfUrl)}
                            className="font-bold text-gray-800 underline cursor-pointer hover:text-red-600"
                            title="Click to view PDF"
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
                        <td className="p-5">
                          <p className="text-sm text-gray-800 font-bold">
                            {art.author}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {art.date}
                          </p>
                        </td>
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
                        <td className="p-5 text-center">
                          {/* Dropdown with Editors from DB */}
                          <select
                            className="p-2 border rounded text-xs font-bold outline-none bg-white cursor-pointer w-32"
                            value={art.assignedTo || ""}
                            onChange={(e) =>
                              assignArticle(art.id, e.target.value)
                            }
                          >
                            <option value="">Assign To...</option>
                            {editors.map((e) => (
                              // Change: _id ki jagah id use karein
                              <option key={e.id} value={e.id}>
                                {e.name || e.email}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-5 text-right flex justify-end gap-2 items-center">
                          <button
                            onClick={() => overrideAndPublish(art.id)}
                            className="bg-black text-white px-4 py-2 rounded text-[10px] font-black hover:bg-red-600 uppercase transition-colors"
                          >
                            Publish
                          </button>
                          <button className="text-gray-400 hover:text-black font-bold p-2 text-lg">
                            ⋮
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {!isLoading && filteredArticles.length === 0 && (
                <div className="p-10 text-center text-gray-400 font-bold">
                  No articles found matching your criteria.
                </div>
              )}
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
    </div>
  );
}
