"use client";
import React, { useState } from 'react';
import Link from 'next/link';

const StatCard = ({ title, count }) => (
  <div className="bg-white p-6 rounded-xl border-l-4 border-red-600 shadow-md">
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</p>
    <h3 className="text-3xl font-extrabold mt-2 text-gray-800">{count}</h3>
  </div>
);

export default function AdminDashboard() {
  const [editors] = useState(["Rahul Jha", "Priya Singh", "Karan Roy"]);
  
  const [articles, setArticles] = useState([
    { id: 1, title: "Criminal Law Reform 2024", author: "Siddharth M.", status: "Pending", assignedTo: "", date: "2024-03-15", abstract: "Detailed analysis of criminal law amendments..." },
    { id: 2, title: "Property Rights Case Study", author: "Anjali Sharma", status: "In Review", assignedTo: "Priya Singh", date: "2024-03-12", abstract: "Review of urban property rights under constitution..." }
  ]);

  // States for New Features
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showAbstract, setShowAbstract] = useState(null);

  const assignArticle = (id, editor) => {
    setArticles(articles.map(a => a.id === id ? { ...a, assignedTo: editor, status: "In Review" } : a));
  };

  const overrideAndPublish = (id) => {
    setArticles(articles.map(a => a.id === id ? { ...a, status: "Published", assignedTo: "Admin Override" } : a));
  };

  // Logic for Search and Filter
  const filteredArticles = articles.filter(art => {
    const matchesSearch = art.title.toLowerCase().includes(searchTerm.toLowerCase()) || art.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || art.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row">
      {/* SIDEBAR - AS IT IS */}
      <aside className="hidden md:flex w-72 bg-red-700 text-white flex-col h-screen sticky top-0 shadow-2xl">
        <div className="p-8 border-b border-red-800">
          <h1 className="text-2xl font-black italic tracking-tighter">LAW NATION</h1>
          <span className="text-[10px] bg-white text-red-700 px-2 py-0.5 rounded-full font-bold uppercase mt-2 inline-block">Admin Panel</span>
        </div>
        <nav className="flex-1 px-4 mt-6 space-y-2">
          <button className="w-full text-left p-3 bg-red-800 rounded-lg font-bold">Dashboard</button>
          <Link href="/admin/add-editor" className="block w-full text-left p-3 hover:bg-red-600 rounded-lg text-red-100">Add New Editor</Link>
         {/* Sidebar ka button change karein */}
<Link href="/admin/live-database" className="block w-full">
  <button className="w-full text-left p-3 hover:bg-red-600 rounded-lg text-red-100 transition-all">
    Live Database
  </button>
</Link>
        </nav>
        <div className="p-4 border-t border-red-800"><button className="w-full p-2 text-sm bg-red-900 rounded font-bold uppercase">Logout</button></div>
      </aside>

      <main className="flex-1 overflow-y-auto pb-10">
        <header className="bg-white h-20 border-b flex items-center justify-between px-6 md:px-10 shadow-sm sticky top-0 z-10">
          <h2 className="text-xl font-black text-gray-700 uppercase">Management</h2>
          <Link href="/admin/add-editor">
            <button className="bg-red-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-black transition-all text-xs">+ CREATE EDITOR</button>
          </Link>
        </header>

        <div className="p-6 md:p-10 space-y-10">
          {/* STAT CARDS - DYNAMIC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Submissions" count={articles.length} />
            <StatCard title="Awaiting" count={articles.filter(a => a.status === 'Pending').length} />
            <StatCard title="Editors" count={editors.length} />
            <StatCard title="Published" count={articles.filter(a => a.status === 'Published').length} />
          </div>

          

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 p-5 border-b flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="font-black text-gray-700 uppercase tracking-tighter text-lg">Monitor & Assign Articles</div>
              
              {/* NEW: Search and Filter Bar */}
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
                  {filteredArticles.map(art => (
                    <tr key={art.id} className="hover:bg-red-50/30 transition-all">
                      <td className="p-5">
                        <p className="font-bold text-gray-800 underline cursor-pointer hover:text-red-600">{art.title}</p>
                        <button onClick={() => setShowAbstract(art)} className="text-[10px] text-red-600 font-bold uppercase mt-1 hover:underline">View Abstract</button>
                      </td>
                      <td className="p-5">
                        <p className="text-sm text-gray-800 font-bold">{art.author}</p>
                        <p className="text-[10px] text-gray-400">{art.date}</p>
                      </td>
                      <td className="p-5">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                          art.status === 'Published' ? 'bg-green-100 text-green-700' : 
                          art.status === 'In Review' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {art.status}
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <select 
                          className="p-2 border rounded text-xs font-bold outline-none bg-white cursor-pointer"
                          value={art.assignedTo}
                          onChange={(e) => assignArticle(art.id, e.target.value)}
                        >
                          <option value="">Assign To...</option>
                          {editors.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                      </td>
                      <td className="p-5 text-right flex justify-end gap-2 items-center">
                         {/* Publish Button */}
                        <button onClick={() => overrideAndPublish(art.id)} className="bg-black text-white px-4 py-2 rounded text-[10px] font-black hover:bg-red-600 uppercase transition-colors">Publish</button>
                        
                        {/* NEW: Action Dropdown (Simplified as a button for now) */}
                        <button className="text-gray-400 hover:text-black font-bold p-2 text-lg">⋮</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredArticles.length === 0 && (
                <div className="p-10 text-center text-gray-400 font-bold">No articles found matching your criteria.</div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Abstract View Modal - AS IT IS */}
      {showAbstract && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full rounded-2xl p-8 shadow-2xl">
            <h3 className="text-xl font-black text-gray-800 border-b pb-4 uppercase italic tracking-tighter">{showAbstract.title}</h3>
            <p className="text-sm text-gray-600 mt-6 leading-relaxed font-medium bg-gray-50 p-4 rounded-xl italic">"{showAbstract.abstract}"</p>
            <div className="mt-8 flex justify-end">
              <button onClick={() => setShowAbstract(null)} className="bg-red-600 text-white px-8 py-2 rounded-lg font-black uppercase text-xs">Close Preview</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}