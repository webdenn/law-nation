"use client";
import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Form Logic Component
function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Backend URL (Make sure this matches your server port)
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

  // Agar URL mein token nahi hai
  if (!token) {
    return (
      <div className="w-full max-w-md p-8 text-center border border-red-200 bg-red-50 rounded">
        <h2 className="text-red-700 font-bold text-lg uppercase tracking-wide">Invalid Link</h2>
        <p className="text-red-600 text-sm mt-2">No verification token found. Please check your email again.</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Client Side Validation
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    setLoading(true);

    try {
      // 2. Backend API Call
      const response = await fetch(`${API_BASE_URL}/api/auth/setup-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Password set successfully!");
        
        // 🚨 3. REDIRECT FIX: Saara purana local storage saaf karein
        localStorage.clear(); 
        sessionStorage.clear();

        // 4. Forceful Redirect to Login Page
        setTimeout(() => {
          window.location.href = "/law/admin-login"; 
        }, 2000);
      } else {
        toast.error(data.message || "Link expired or invalid");
      }
    } catch (error) {
      console.error("Setup Password Error:", error);
      toast.error("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-gray-300 rounded overflow-hidden">
      {/* Header Section */}
      <div className="p-8 text-center border-b border-gray-100">
        <h1 className="text-3xl font-black italic tracking-tighter text-red-700">LAW NATION</h1>
        <p className="text-gray-500 text-sm mt-2 font-medium">Secure your account</p>
      </div>

      {/* Form Section */}
      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">New Password</label>
          <input
            type="password"
            required
            minLength={6}
            className="w-full p-3 bg-white border border-gray-300 rounded text-sm text-gray-800 focus:border-red-700 focus:outline-none transition-colors"
            placeholder="Min 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">Confirm Password</label>
          <input
            type="password"
            required
            minLength={6}
            className="w-full p-3 bg-white border border-gray-300 rounded text-sm text-gray-800 focus:border-red-700 focus:outline-none transition-colors"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded text-white font-bold text-sm uppercase tracking-wider transition-colors ${
            loading ? "bg-red-400 cursor-wait" : "bg-red-700 hover:bg-black"
          }`}
        >
          {loading ? "Activating..." : "Set Password & Login"}
        </button>
      </form>
    </div>
  );
}

// Main Page Component
export default function SetupPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <ToastContainer position="top-center" autoClose={2000} theme="colored" />
      <Suspense fallback={<div className="text-gray-500 font-bold text-sm">Loading Interface...</div>}>
        <SetupForm />
      </Suspense>
    </div>
  );
}