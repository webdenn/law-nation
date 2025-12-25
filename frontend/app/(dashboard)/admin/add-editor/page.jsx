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

    // ✅ FIXED: Strictly looking for 'adminToken' (jo login page ne save kiya hai)
    const token = localStorage.getItem("adminToken");
    
    // Debugging: Console check karna agar error aaye
    console.log("Token from localStorage:", token); 

    if (!token) {
      toast.error("Session Expired. Please Login Again.");
      setLoading(false);
      // Thoda delay taaki toast dikh jaye
      setTimeout(() => {
        router.push("/admin-login");
      }, 1500);
      return;
    }

    try {
      // API Call
      const response = await fetch(`${API_BASE_URL}/api/users/invite-editor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` // ✅ Token sahi se bheja ja raha hai
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Invite sent to ${formData.email} successfully!`);
        setFormData({ name: '', email: '' }); // Form clear
      } else {
        // Backend se jo error aaye wo dikhao
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
    <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* SIDEBAR */}
      <aside className="hidden md:flex w-72 bg-red-700 text-white flex-col h-screen sticky top-0 shadow-2xl">
        <div className="p-8 border-b border-red-800">
          <h1 className="text-2xl font-black italic tracking-tighter text-white">LAW NATION</h1>
        </div>
        <nav className="flex-1 px-4 mt-6">
          <button onClick={() => router.push('/admin')} className="w-full text-left p-3 font-bold bg-red-800 rounded-lg shadow-inner hover:bg-red-900 transition">
            ← Back to Dashboard
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 md:p-20 flex items-center justify-center">
        <div className="max-w-2xl w-full mx-auto bg-gray-200 rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          
          <div className="bg-red-600 p-8 text-center text-white">
            <h2 className="text-2xl font-black uppercase tracking-widest">Invite New Editor</h2>
            <p className="text-red-100 text-xs mt-1">Send an email invitation to join the Law Nation team</p>
          </div>
          
          <form className="p-10 space-y-6" onSubmit={handleInvite}>
            {/* Name Input */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Full Name</label>
              <input 
                type="text" 
                required 
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-red-600 outline-none text-sm font-bold text-gray-800 transition-colors" 
                placeholder="Ex: Rahul Sharma" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Work Email</label>
              <input 
                type="email" 
                required 
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-red-600 outline-none text-sm font-bold text-gray-800 transition-colors" 
                placeholder="editor@law-nation.com" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            {/* Buttons */}
            <div className="pt-6 flex gap-4">
              <button 
                type="button" 
                onClick={() => router.push('/admin')} 
                className="flex-1 p-4 bg-gray-100 text-gray-500 font-black rounded-xl hover:bg-gray-200 transition-all text-xs"
              >
                CANCEL
              </button>
              
              <button 
                type="submit" 
                disabled={loading}
                className={`flex-1 p-4 text-white font-black rounded-xl transition-all shadow-lg text-xs tracking-widest ${
                  loading ? "bg-red-400 cursor-wait" : "bg-red-600 hover:bg-black"
                }`}
              >
                {loading ? "SENDING INVITE..." : "SEND INVITATION 📩"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}