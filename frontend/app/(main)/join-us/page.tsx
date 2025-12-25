"use client"

import React, { useState } from "react" // React import kiya TS error bachane ke liye
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function JoinUsPage() {
  const router = useRouter()
  
  // States
  const [formData, setFormData] = useState({
    name: "", 
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  })
  
  // OTP States
  const [otp, setOtp] = useState("") 
  const [isOtpSent, setIsOtpSent] = useState(false) 

  // UI States
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // ✅ Fixed: TypeScript Type for Input Change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Form Validation
  const validateForm = () => {
    if (!formData.name.trim()) { toast.error("Full Name is required"); return false; }
    if (!formData.email) { toast.error("Email is required"); return false; }
    if (!formData.phone || formData.phone.length < 10) { toast.error("Valid Phone is required"); return false; }
    if (!formData.password || formData.password.length < 8) { toast.error("Password must be at least 8 chars"); return false; }
    if (formData.password !== formData.confirmPassword) { toast.error("Passwords do not match"); return false; }
    return true;
  }

  // ✅ STEP 1: Send OTP Logic
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    try {
      // Backend Send OTP Endpoint (Port 4000)
      const response = await fetch("http://localhost:4000/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("OTP Sent to your email!", { position: "top-right", theme: "colored" });
        setIsOtpSent(true) // UI Change: Show OTP Input
      } else {
        toast.error(data.message || "Failed to send OTP", { position: "top-right", theme: "colored" });
      }
    } catch (error) {
      console.error("Network Error:", error)
      toast.error("Server Error. Check Backend is running on 4000.", { position: "top-right", theme: "colored" });
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ STEP 2: Verify OTP & Signup Logic
  const handleVerifyAndSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp) { toast.error("Please enter the OTP"); return; }

    setIsLoading(true)
    try {
      // 1. Verify OTP Call
      const verifyResponse = await fetch("http://localhost:4000/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, otp: otp }),
      })

      const verifyData = await verifyResponse.json()

      if (!verifyResponse.ok) {
        toast.error(verifyData.message || "Invalid OTP", { position: "top-right", theme: "colored" });
        setIsLoading(false)
        return
      }

      // 2. Agar OTP sahi hai -> Call Signup
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone
      }
      
      const signupResponse = await fetch("http://localhost:4000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const signupData = await signupResponse.json()

      if (signupResponse.ok) {
        toast.success("Account Verified & Created! Please Login.", {
          position: "top-right",
          autoClose: 2000,
          theme: "colored",
        });

        setTimeout(() => {
          router.push("/login") 
        }, 2000)
      } else {
        toast.error(signupData.message || "Signup failed", { position: "top-right", theme: "colored" });
      }

    } catch (error) {
      console.error("Network Error:", error)
      toast.error("Something went wrong.", { position: "top-right", theme: "colored" });
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Toast Container */}
      <ToastContainer />

      {/* Left Side - Visual Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-600 via-red-700 to-red-800 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        {/* Decorative Shapes */}
        <div className="absolute top-10 right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-start px-10 xl:px-14 text-white">
          <div>
            <h1 className="text-4xl xl:text-5xl font-bold mb-3 leading-tight">
              Join Law Nation
            </h1>
            <div className="w-16 h-1 bg-white mb-4"></div>
            <p className="text-lg xl:text-xl text-white/90 font-light leading-relaxed max-w-md">
              Begin your scholarly journey with us. Access premium research papers, legal resources, and connect with legal scholars worldwide.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-10 xl:px-12 py-6 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Join Law Nation</h1>
            <p className="text-sm text-gray-600">Create your account to get started</p>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:block mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Create Account</h2>
            <p className="text-sm text-gray-600">Fill in your details to join our community</p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5 sm:p-6">
            <form onSubmit={isOtpSent ? handleVerifyAndSignup : handleSendOtp} className="space-y-4">
              
              {/* Name Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    disabled={isOtpSent} 
                    className={`w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all text-sm bg-gray-50 ${isOtpSent ? 'opacity-70 cursor-not-allowed' : ''}`}
                    required
                  />
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    disabled={isOtpSent} 
                    className={`w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all text-sm bg-gray-50 ${isOtpSent ? 'opacity-70 cursor-not-allowed' : ''}`}
                    required
                  />
                </div>
              </div>

              {/* Phone Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1234567890"
                    disabled={isOtpSent} 
                    className={`w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all text-sm bg-gray-50 ${isOtpSent ? 'opacity-70 cursor-not-allowed' : ''}`}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Create a password"
                    disabled={isOtpSent} 
                    className={`w-full pl-10 pr-12 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all text-sm bg-gray-50 ${isOtpSent ? 'opacity-70 cursor-not-allowed' : ''}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.97 9.97 0 015.12 5.12m3.07 3.07L12 12m-3.81-3.81l3.81 3.81M12 12l3.81 3.81m0 0A9.97 9.97 0 0118.88 18.88m-3.07-3.07L12 12m3.81 3.81l-3.29 3.29M21 21l-3.29-3.29" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your password"
                    disabled={isOtpSent} 
                    className={`w-full pl-10 pr-12 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all text-sm bg-gray-50 ${isOtpSent ? 'opacity-70 cursor-not-allowed' : ''}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.97 9.97 0 015.12 5.12m3.07 3.07L12 12m-3.81-3.81l3.81 3.81M12 12l3.81 3.81m0 0A9.97 9.97 0 0118.88 18.88m-3.07-3.07L12 12m3.81 3.81l-3.29 3.29M21 21l-3.29-3.29" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* OTP Input Field */}
              {isOtpSent && (
                <div className="animate-fade-in-down">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Enter Verification Code
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      className="w-full pl-10 pr-4 py-2.5 border-2 border-green-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition-all text-sm bg-green-50 tracking-widest font-bold"
                      required
                    />
                  </div>
                  <p className="text-xs text-green-600 mt-1">OTP sent to {formData.email}</p>
                </div>
              )}

              {/* Terms and Conditions */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="terms"
                  name="terms"
                  className="mt-1 h-4 w-4 text-red-600 focus:ring-red-600 border-gray-300 rounded cursor-pointer"
                  required
                />
                <label htmlFor="terms" className="ml-3 text-sm text-gray-600 leading-relaxed">
                  I agree to the{" "}
                  <Link href="/terms" className="text-red-600 hover:text-red-700 font-semibold">
                    Terms and Conditions
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-red-600 hover:text-red-700 font-semibold">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full px-6 py-2.5 bg-red-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 transition-all duration-200 transform hover:scale-[1.02] ${
                  isLoading ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {isLoading 
                  ? (isOtpSent ? "Verifying..." : "Sending OTP...") 
                  : (isOtpSent ? "Verify & Create Account" : "Send OTP & Create Account")
                }
              </button>
            </form>

            {/* Divider */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-center text-xs text-gray-600">
                Already have an account?{" "}
                <Link href="/login" className="text-red-600 hover:text-red-700 font-semibold">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}