"use client";
import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Form Logic Component
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500 hover:text-red-600 transition-colors">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeSlashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500 hover:text-red-600 transition-colors">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // Toggle State
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Toggle State
  const [loading, setLoading] = useState(false);

  // Backend URL
  const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

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
      const response = await fetch(`${NEXT_PUBLIC_BASE_URL}/auth/setup-password`, {
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

        // 👇 REDIRECT UPDATE: Redirects to User Home with hard reload to ensure path correctness
        setTimeout(() => {
          // Use exact path matching user requirement
          window.location.replace("/management-login/");
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
        <div className="text-red-600 text-[10px] mt-2 font-semibold bg-red-50 p-2 rounded border border-red-100">
          Password must be at least 8 chars<br />
          (Include: Capital Letter, Small Letter, Symbol)
        </div>
      </div>

      {/* Form Section */}
      <form onSubmit={handleSubmit} className="p-8 space-y-6">

        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">New Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              className="w-full p-3 bg-white border border-gray-300 rounded text-sm text-gray-800 focus:border-red-700 focus:outline-none transition-colors pr-10"
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              required
              minLength={8}
              className="w-full p-3 bg-white border border-gray-300 rounded text-sm text-gray-800 focus:border-red-700 focus:outline-none transition-colors pr-10"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showConfirmPassword ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded text-white font-bold text-sm uppercase tracking-wider transition-colors ${loading ? "bg-red-400 cursor-wait" : "bg-red-700 hover:bg-black"
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
      {/* ToastContainer removed to avoid duplicates (handled in layout) */}
      <Suspense fallback={<div className="text-gray-500 font-bold text-sm">Loading Interface...</div>}>
        <SetupForm />
      </Suspense>
    </div>
  );
}