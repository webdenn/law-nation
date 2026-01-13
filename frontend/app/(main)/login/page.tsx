"use client"
import React, { useState, ChangeEvent, FormEvent } from "react"
import Link from "next/link"
// ✅ Change 1: useSearchParams yahan import kiya
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from 'react-toastify';

import { useDispatch } from "react-redux";
import { setCredentials } from "../../lib/store/authSlice"; 

export default function Login() {
  const router = useRouter()
  const dispatch = useDispatch()
  
  // ✅ Change 2: Ye lines Component ke ANDAR honi chahiye
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect');

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      
      if (response.ok) {
        const token = data.token || data.accessToken || data.jwt;
        const user = data.user || { name: data.name, email: data.email };

        if (token) {
          dispatch(setCredentials({ user, token }));
          localStorage.setItem("authToken", token);
          localStorage.setItem("userName", user.name);
        }
        
        toast.success("Login Successful! Welcome back.", {
          toastId: "login-success"
        });

        // ✅ Change 3: Logic Update - Redirect check
        setTimeout(() => {
          if (redirectPath) {
             router.push(redirectPath); // Article par wapas bhejo
          } else {
             router.push("/home"); // Normal Home page bhejo
          }
        }, 1500)

      } else {
        toast.error(data.message || "Invalid credentials", { 
            toastId: "login-error"
        });
      }
    } catch (error) {
      console.warn("Login Error:", error)
      toast.error("Something went wrong. Please try again.", { 
          toastId: "net-error"
      });
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen flex overflow-hidden">
      
      {/* Left Side */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-600 via-red-700 to-red-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
        <div className="absolute top-10 right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col justify-center items-start px-10 xl:px-14 text-white">
          <div>
            <h1 className="text-4xl xl:text-5xl font-bold mb-3 leading-tight">Welcome Back</h1>
            <div className="w-16 h-1 bg-white mb-4"></div>
            <p className="text-lg xl:text-xl text-white/90 font-light leading-relaxed max-w-md">
              Sign in to access your saved research, manage submissions, and stay connected.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-10 xl:px-12 py-6 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
            <p className="text-sm text-gray-600">Sign in to continue</p>
          </div>
          <div className="hidden lg:block mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign In</h2>
            <p className="text-sm text-gray-600">Enter your credentials to access your account</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Enter your email" className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all text-sm bg-gray-50" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} placeholder="Enter your password" className="w-full pl-10 pr-12 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all text-sm bg-gray-50" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                    {showPassword ? "Hide" : "Show"}
                  </button>

                  
                </div>
              </div>

              <button type="submit" disabled={isLoading} className={`w-full px-6 py-2.5 bg-red-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 transition-all duration-200 transform hover:scale-[1.02] ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}>
                {isLoading ? "Signing In..." : "Sign In"}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-center text-xs text-gray-600">
                Don&apos;t have an account? <Link href="/join-us" className="text-red-600 hover:text-red-700 font-semibold">Create Account</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}