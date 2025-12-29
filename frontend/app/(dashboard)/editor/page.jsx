"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // New State for Mobile Menu

  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadedFile, setUploadedFile] = useState(null);
  // 📊 Chart Data Calculations
  const totalTasks = articles.length || 0;
  const completedTasks = articles.filter(a => a.status === "Published").length || 0;
  const pendingTasks = articles.filter(a => a.status !== "Published").length || 0;
  const efficiency = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

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
      router.push("/admin-login");
    }
  }, [router]);

  const fetchAssignedArticles = async (editorId, token) => {
    try {
      setIsLoading(true);
      const res = await fetch(
        `${API_BASE_URL}/api/articles?assignedEditorId=${editorId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
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

  const handleArticleAction = async (articleId, actionType) => {
    try {
      const token = localStorage.getItem("editorToken");
      const endpoint = actionType === "approve" ? "approve" : "reject";

      let requestOptions = {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      };

      if (actionType === "approve" && uploadedFile) {
        const formData = new FormData();
        formData.append("pdf", uploadedFile);
        requestOptions.body = formData;
      } else {
        requestOptions.headers["Content-Type"] = "application/json";
        requestOptions.body = JSON.stringify({});
      }

      const res = await fetch(
        `${API_BASE_URL}/api/articles/${articleId}/${endpoint}`,
        requestOptions
      );

      if (res.ok) {
        toast.success(actionType === "approve" ? "Article Published!" : "Article Rejected");
        setSelectedArticle(null);
        setUploadedFile(null);
        fetchAssignedArticles(profile.id || profile._id, token);
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || "Action failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("editorToken");
    localStorage.removeItem("editorUser");
    router.push("/admin-login");
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const getPdfUrlToView = () => {
    if (!selectedArticle) return "";
    const path = pdfViewMode === "original" ? selectedArticle.originalPdfUrl : selectedArticle.currentPdfUrl;
    if (!path) return "";
    return path.startsWith("http") ? path : `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  if (!isAuthorized) return <div className="h-screen flex items-center justify-center">Verifying...</div>;

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
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="p-8 border-b border-red-800 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter">LAW NATION</h1>
            <span className="text-[10px] bg-white text-red-700 px-2 py-0.5 rounded-full font-bold uppercase">
              {selectedArticle ? "Review Mode" : "Editor Panel"}
            </span>
          </div>
          {/* Close Button Mobile */}
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-white">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-4 mt-6 space-y-2 overflow-y-auto">
          {!selectedArticle ? (
            <>
              <button
                onClick={() => { setActiveTab("tasks"); setIsMobileMenuOpen(false); }}
                className={`w-full text-left p-3 rounded-lg font-semibold transition-all ${activeTab === "tasks" ? "bg-red-800" : "hover:bg-red-600"}`}
              >
                 Assigned Tasks
              </button>
              <button
                onClick={() => { setActiveTab("profile"); setIsMobileMenuOpen(false); }}
                className={`w-full text-left p-3 rounded-lg font-semibold transition-all ${activeTab === "profile" ? "bg-red-800" : "hover:bg-red-600"}`}
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
                onClick={() => { setPdfViewMode("original"); setIsMobileMenuOpen(false); }}
                className={`w-full text-left p-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${pdfViewMode === 'original' ? 'bg-white text-red-700 shadow-lg' : 'hover:bg-red-800 text-white'}`}
              >
                 View Original PDF
                {pdfViewMode === 'original' && <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 rounded-full">Active</span>}
              </button>

              <button
                onClick={() => { setPdfViewMode("current"); setIsMobileMenuOpen(false); }}
                className={`w-full text-left p-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${pdfViewMode === 'current' ? 'bg-white text-red-700 shadow-lg' : 'hover:bg-red-800 text-white'}`}
              >
                 View Edited PDF
                {pdfViewMode === 'current' && <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 rounded-full">Active</span>}
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

        {!selectedArticle && (
          <div className="p-4 border-t border-red-800">
            <button onClick={handleLogout} className="w-full p-2 text-sm bg-red-900 rounded font-medium uppercase">Logout</button>
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
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            <h2 className="text-lg md:text-xl font-bold text-gray-700 truncate max-w-[200px] md:max-w-none">
              {selectedArticle ? `Reviewing: ${selectedArticle.title.substring(0, 30)}...` : (activeTab === "tasks" ? "Editor Workspace" : "Profile")}
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
                <EditorStatCard title="Total Assigned" count={articles.length} color="border-red-600" />
                <EditorStatCard title="Pending" count={articles.filter((a) => a.status !== "Published").length} color="border-yellow-500" />
                <EditorStatCard title="Approved" count={articles.filter((a) => a.status === "Published").length} color="border-green-600" />
              </div>

              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-red-50 p-5 border-b border-red-100"><h3 className="font-bold text-red-800 text-lg">My Tasks</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead>
                      <tr className="text-xs uppercase bg-gray-50 text-gray-400">
                        <th className="p-5">Article</th><th className="p-5">Author</th><th className="p-5">Status</th><th className="p-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {isLoading ? <tr><td colSpan="4" className="p-10 text-center">Loading...</td></tr> : 
                        articles.map((art) => (
                          <tr key={art._id || art.id} className="hover:bg-gray-50">
                            <td className="p-5 font-medium">{art.title}</td>
                            <td className="p-5 text-sm">{art.authorName}</td>
                            <td className="p-5"><span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">{art.status}</span></td>
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
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

  
          

          {/* VIEW 2: ARTICLE REVIEW INTERFACE */}
          {selectedArticle && (
            <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-full">
              
              {/* PDF VIEWER SECTION */}
              <div className="flex-1 bg-gray-100 rounded-xl border border-gray-300 p-4 flex flex-col h-[500px] lg:h-auto min-h-[500px]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-700 uppercase text-sm md:text-base">
                    {pdfViewMode === 'original' ? '📂 Original Submission' : '📝 Latest Edited Version'}
                  </h3>
                  {getPdfUrlToView() && (
                    <a href={getPdfUrlToView()} target="_blank" className="text-xs text-blue-600 hover:underline">Open in New Tab ↗</a>
                  )}
                </div>
                
                <div className="flex-1 bg-white rounded-lg shadow-inner flex items-center justify-center border-2 border-dashed border-gray-300 relative overflow-hidden">
                   {getPdfUrlToView() ? (
                     <iframe 
                       src={getPdfUrlToView()} 
                       className="w-full h-full absolute inset-0"
                       title="PDF Viewer"
                     />
                   ) : (
                     <div className="text-center text-gray-400">
                       <p className="text-4xl mb-2">📄</p>
                       <p>PDF not available for this version</p>
                     </div>
                   )}
                </div>
              </div>

              {/* ACTION PANEL (Right Side on Desktop, Bottom on Mobile) */}
              <div className="w-full lg:w-[350px] space-y-6 shrink-0">
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                  <h3 className="font-bold text-gray-800 mb-4">Action Panel</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Upload Reviewed Version</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition cursor-pointer relative">
                        <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                        {uploadedFile ? (
                           <p className="text-sm font-bold text-green-600 truncate">{uploadedFile.name}</p>
                        ) : (
                           <p className="text-xs text-gray-400">Click to upload PDF</p>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={() => handleArticleAction(selectedArticle._id || selectedArticle.id, "approve")}
                      className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-md transition"
                    >
                      ✅ Approve & Publish
                    </button>
                    
                  </div>
                </div>

                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                  <h4 className="text-sm font-bold text-blue-800 mb-2">Article Details</h4>
                  <p className="text-sm text-gray-600 mb-1"><strong>Author:</strong> {selectedArticle.authorName}</p>
                  <p className="text-sm text-gray-600 mb-1"><strong>Status:</strong> {selectedArticle.status}</p>
                  <p className="text-xs text-gray-500 mt-2 bg-white p-2 rounded border border-blue-100 italic break-words">"{selectedArticle.abstract}"</p>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}