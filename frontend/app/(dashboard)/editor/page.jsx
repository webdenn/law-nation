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
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // ✅ CHANGED: Feedback hata kar File state add kiya
  const [uploadedFile, setUploadedFile] = useState(null);
  
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
      
      // ✅ Agar approve hai to backend ka same /approve endpoint hit hoga jo Admin use karta hai
      const endpoint = actionType === "approve" ? "approve" : "reject";

      const res = await fetch(
        `${API_BASE_URL}/api/articles/${articleId}/${endpoint}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
           
        }
      );

      if (res.ok) {
        // ✅ UI Update: Message exactly Admin jaisa kar diya
        const successMsg = actionType === "approve" 
            ? "Article Approved & Published Successfully!" 
            : "Article Rejected";
            
        toast.success(successMsg);
        
        setSelectedArticle(null);
        setUploadedFile(null); 
        // List refresh karein taaki status update dikhe
        fetchAssignedArticles(profile.id || profile._id, token);
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || "Failed to process action");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error while publishing");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("editorToken");
    localStorage.removeItem("editorUser");
    router.push("/admin-login");
  };

  // Helper to handle file selection
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  if (!isAuthorized)
    return (
      <div className="h-screen flex items-center justify-center">
        Verifying...
      </div>
    );

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row">
      {/* SIDEBAR */}
      <aside className="hidden md:flex w-72 bg-red-700 text-white flex-col shadow-2xl sticky top-0 h-screen">
        <div className="p-8 border-b border-red-800">
          <h1 className="text-2xl font-black italic tracking-tighter">
            LAW NATION
          </h1>
          <span className="text-[10px] bg-white text-red-700 px-2 py-0.5 rounded-full font-bold uppercase">
            Editor Panel
          </span>
        </div>
        <nav className="flex-1 px-4 mt-6 space-y-2">
          <button
            onClick={() => setActiveTab("tasks")}
            className={`w-full text-left p-3 rounded-lg font-semibold transition-all ${
              activeTab === "tasks" ? "bg-red-800" : "hover:bg-red-600"
            }`}
          >
            Assigned Tasks
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full text-left p-3 rounded-lg font-semibold transition-all ${
              activeTab === "profile" ? "bg-red-800" : "hover:bg-red-600"
            }`}
          >
            Profile Settings
          </button>
        </nav>
        <div className="p-4 border-t border-red-800">
          <button
            onClick={handleLogout}
            className="w-full p-2 text-sm bg-red-900 rounded font-medium uppercase"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto h-screen">
        <header className="bg-white h-20 border-b flex items-center justify-between px-6 md:px-10 sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-700">
            {activeTab === "tasks" ? "Editor Workspace" : "Profile"}
          </h2>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-800">{profile.name}</p>
              <p className="text-[10px] text-red-600 font-bold uppercase">
                {profile.role}
              </p>
            </div>
            <div className="w-10 h-10 bg-red-100 border-2 border-red-600 rounded-full flex items-center justify-center text-red-700 font-black">
              {profile.name.charAt(0)}
            </div>
          </div>
        </header>

        <div className="p-6 md:p-10 pb-20">
          {activeTab === "tasks" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
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
                  <table className="w-full text-left">
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
                            <td className="p-5 text-sm">
                              {art.authorName || "Author"}
                            </td>
                            <td className="p-5">
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                                {art.status}
                              </span>
                            </td>
                            <td className="p-5 text-right">
                              <button
                                onClick={() => setSelectedArticle(art)}
                                className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg"
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
        </div>
      </main>

      {/* FULL REVIEW MODAL */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-6xl h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
            {/* LEFT: PREVIEW */}
            <div className="flex-1 bg-gray-50 flex flex-col border-r border-gray-300">
              <div className="p-4 bg-white border-b flex justify-between">
                <span className="text-xs font-black text-red-600">
                  DOCUMENT VIEWER
                </span>
                <button onClick={() => {
                    setSelectedArticle(null);
                    setUploadedFile(null);
                }}>
                  CLOSE ✕
                </button>
              </div>
              <div className="flex-1 p-8 overflow-y-auto bg-white m-4 rounded shadow-sm">
                <h1 className="text-2xl font-bold mb-4">
                  {selectedArticle.title}
                </h1>
                <p className="mb-6 text-gray-600 italic">
                  "{selectedArticle.abstract}"
                </p>
                {selectedArticle.currentPdfUrl && (
                  <button
                    onClick={() => {
                      const path = selectedArticle.currentPdfUrl;
                      const cleanPath = path.startsWith("/") ? path : `/${path}`;
                      const fullUrl = `${API_BASE_URL}${cleanPath}`;
                      window.open(fullUrl, "_blank");
                    }}
                    className="bg-black text-white px-6 py-2 rounded text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-all"
                  >
                    VIEW FULL PDF
                  </button>
                )}
              </div>
            </div>

            {/* RIGHT: ACTIONS (MODIFIED SECTION) */}
            <div className="w-full md:w-[400px] flex flex-col bg-white">
              <div className="p-6 bg-red-600 text-white">
                <h2 className="font-bold uppercase truncate">
                  {selectedArticle.title}
                </h2>
              </div>
              
              {/* ✅ NEW: File Upload Section (Replaced Feedback) */}
              <div className="p-6 flex-1 flex flex-col gap-4">
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Upload Reviewed Document
                </label>
                
                <div className="flex-1 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-red-50 hover:border-red-300 transition-colors relative flex flex-col items-center justify-center text-center p-4">
                  <input 
                    type="file" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                  />
                  
                  {uploadedFile ? (
                    <div className="flex flex-col items-center animate-pulse">
                        <span className="text-3xl mb-2">📄</span>
                        <p className="text-sm font-bold text-gray-800 break-all px-2">
                           {uploadedFile.name}
                        </p>
                        <p className="text-xs text-green-600 font-bold mt-1">Ready to upload</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                        <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                        <p className="text-sm font-medium">Click to upload file</p>
                        <p className="text-xs mt-1">PDF, DOCX supported</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ✅ MODIFIED: Buttons (Removed Correction) */}
             {/* ✅ MODIFIED: Buttons (Fixed ID Issue) */}
<div className="p-6 border-t bg-gray-50 space-y-3">
  <button
    onClick={() =>
      // 👇 FIX: Yahan check lagaya hai ki '_id' use kare ya 'id' taaki undefined na ho
      handleArticleAction(selectedArticle._id || selectedArticle.id, "approve")
    }
    className="w-full py-3 bg-red-600 text-white font-bold rounded-lg text-sm hover:bg-black transition-all shadow-lg hover:shadow-xl"
  >
    Approve & Publish
  </button>
  
  <button
    onClick={() =>
      // 👇 FIX: Same fix yahan bhi
      handleArticleAction(selectedArticle._id || selectedArticle.id, "reject")
    }
    className="w-full py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-100 transition-all"
  >
    Reject Article
  </button>
</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}