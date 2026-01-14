"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function AddEditorPage() {
  const router = useRouter();
  
  // State for Form Data & Loading
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(false);
  
  // Backend URL
  const API_BASE_URL = "http://localhost:4000"; 

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);

    const token = localStorage.getItem("adminToken");
    
    if (!token) {
      toast.error("Session Expired. Please Login Again.");
      setLoading(false);
      setTimeout(() => {
        router.push("/admin-login");
      }, 1500);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/invite-editor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Invite sent to ${formData.email} successfully!`);
        setFormData({ name: '', email: '' });
      } else {
        toast.error(data.message || "Failed to invite editor.");
      }

    } catch (error) {
      console.error("Invite Error:", error);
      toast.error("Server connection failed. Is backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row font-sans">
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />

      {/* 🔴 MOBILE HEADER */}
      <div className="md:hidden bg-red-800 text-white p-4 flex justify-between items-center border-b border-red-900">
        <h1 className="text-lg font-black italic">LAW NATION</h1>
        <button 
          onClick={() => router.push('/admin')} 
          className="text-xs font-bold bg-black/20 px-3 py-1.5 rounded"
        >
          ← Back
        </button>
      </div>

      {/* 🔴 SIDEBAR */}
      <aside className="hidden md:flex w-72 bg-red-700 text-white flex-col h-screen sticky top-0 border-r border-red-800">
        <div className="p-8 border-b border-red-800">
          <h1 className="text-2xl font-black italic tracking-tighter text-white">LAW NATION</h1>
          <p className="text-red-200 text-xs mt-1">ADMIN PANEL</p>
        </div>
        <nav className="flex-1 px-4 mt-6">
          <button 
            onClick={() => router.push('/admin')} 
            className="w-full text-left p-4 font-bold bg-red-800 rounded text-sm hover:bg-red-900 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </nav>
      </aside>

      {/* ⚪ MAIN CONTENT (Ab ye khali nahi lagega) */}
      <main className="flex-1 p-6 md:p-12">
        
        {/* Page Title & Breadcrumb */}
        <div className="mb-8">
           <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-tight">Team Management</h2>
           <p className="text-gray-500 text-sm mt-1">Dashboard / Invite Editor</p>
        </div>

        {/* WIDER SECTION CONTAINER */}
        <div className="w-full max-w-5xl bg-white border border-gray-300 rounded-lg overflow-hidden">
          
          {/* Header Strip */}
          <div className="bg-red-700 p-5 border-b border-red-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
               <h3 className="text-lg font-bold text-white uppercase tracking-wide">Invite New Editor</h3>
               <p className="text-red-100 text-xs mt-0.5">Fill in the details to send an invitation link.</p>
             </div>
             {/* Optional Icon decoration */}
             <div className="hidden md:block text-4xl opacity-20 text-white">📩</div>
          </div>
          
          {/* Form - Side by Side Grid Layout */}
          <form className="p-8 space-y-8" onSubmit={handleInvite}>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Name Input */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase">
                    Full Name
                  </label>
                  <input 
                    type="text" 
                    required 
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded text-gray-800 text-sm focus:bg-white focus:border-red-600 outline-none transition-colors" 
                    placeholder="e.g. Rahul Sharma" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                {/* Email Input */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase">
                    Work Email Address
                  </label>
                  <input 
                    type="email" 
                    required 
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded text-gray-800 text-sm focus:bg-white focus:border-red-600 outline-none transition-colors" 
                    placeholder="e.g. editor@law-nation.com" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100"></div>

            {/* Buttons Row */}
            <div className="flex flex-col sm:flex-row justify-end gap-4">
              <button 
                type="button" 
                onClick={() => router.push('/admin')} 
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded text-xs uppercase hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              
              <button 
                type="submit" 
                disabled={loading}
                className={`px-8 py-3 text-white font-bold rounded text-xs uppercase transition-colors flex items-center justify-center gap-2 ${
                  loading ? "bg-red-400 cursor-wait" : "bg-black hover:bg-gray-800"
                }`}
              >
                {loading ? "Sending..." : "Send Invitation"}
              </button>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}