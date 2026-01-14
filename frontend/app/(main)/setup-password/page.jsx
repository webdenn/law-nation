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
  
  // Backend URL
  const API_BASE_URL = "http://localhost:4000";

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
    
    // 1. Validation Update: 8 Characters Check
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match. Please try again.");
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
        toast.success("Password set successfully! Redirecting...");
        
        // Storage Clear
        localStorage.clear(); 
        sessionStorage.clear();

        // 👇 REDIRECT UPDATE: Ab ye management-login par jayega
        setTimeout(() => {
          window.location.href = "/management-login"; 
        }, 2000);

      } else {
        // Error Handling
        console.error("Backend Error:", data.message);
        toast.error("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)");
      }
    } catch (error) {
      console.error("Setup Password Error:", error);
      toast.error("Something went wrong. Please check your connection and try again.");
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
        <p className="text-red-500 text-xs mt-1 font-semibold">Password must be at least 8 characters</p>
      </div>

      {/* Form Section */}
      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">New Password</label>
          <input
            type="password"
            required
            minLength={8}
            className="w-full p-3 bg-white border border-gray-300 rounded text-sm text-gray-800 focus:border-red-700 focus:outline-none transition-colors"
            placeholder="Min 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">Confirm Password</label>
          <input
            type="password"
            required
            minLength={8}
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
      <ToastContainer position="top-center" autoClose={3000} theme="colored" />
      <Suspense fallback={<div className="text-gray-500 font-bold text-sm">Loading Interface...</div>}>
        <SetupForm />
      </Suspense>
    </div>
  );
}