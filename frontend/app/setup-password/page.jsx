"use client";
import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Form Logic Component
function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token"); // URL se token nikalega

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Backend URL verify kr lena
  const API_BASE_URL = "http://localhost:4000";

  // Agar token nahi hai URL me
  if (!token) {
    return (
      <div className="text-center p-10">
        <h2 className="text-red-600 font-bold text-xl">Invalid Link</h2>
        <p className="text-gray-500 mt-2">No verification token found. Please check your email again.</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Client side validation
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
      // Backend API Call
      const response = await fetch(`${API_BASE_URL}/api/auth/setup-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Account created successfully!");
        
        // 2 second baad Login page par bhej do
        setTimeout(() => {
          router.push("/admin-login"); // Ya "/login" jo bhi tumhara login route hai
        }, 2000);
      } else {
        toast.error(data.message || "Link expired or invalid");
      }
    } catch (error) {
      console.error(error);
      toast.error("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border-t-4 border-red-600">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black italic tracking-tighter text-red-700">LAW NATION</h1>
        <p className="text-gray-500 font-medium mt-2">Welcome! Set up your password</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Password Field */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">New Password</label>
          <input
            type="password"
            required
            minLength={6}
            className="w-full p-3 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 transition-all font-bold"
            placeholder="Min 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Confirm Password Field */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirm Password</label>
          <input
            type="password"
            required
            minLength={6}
            className="w-full p-3 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 transition-all font-bold"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-lg text-white font-bold uppercase tracking-wider transition-all ${
            loading ? "bg-gray-400 cursor-wait" : "bg-red-700 hover:bg-black"
          }`}
        >
          {loading ? "Activating Account..." : "Create Account & Login"}
        </button>
      </form>
    </div>
  );
}

// Main Page Component (Required for Suspense)
export default function SetupPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <ToastContainer position="top-center" autoClose={2000} />
      <Suspense fallback={<div className="text-red-700 font-bold animate-pulse">Loading...</div>}>
        <SetupForm />
      </Suspense>
    </div>
  );
}