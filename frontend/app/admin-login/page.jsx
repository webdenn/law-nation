"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"

export default function Adminlogin() {
  const router = useRouter()
  
  // ✅ 1. FIXED: Automatic Redirect (Check for BOTH tokens)
  useEffect(() => {
    // Pehle Editor Token check karo
    const editorToken = localStorage.getItem("editorToken");
    if (editorToken) {
        router.push("/editor");
        return; // Yahi rok do
    }

    // Fir Admin Token check karo
    const adminToken = localStorage.getItem("adminToken");
    if (adminToken) {
        router.push("/admin");
    }
  }, [router])

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }))
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 6) { 
      newErrors.password = "Password must be at least 6 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error("Please fix the errors above", { toastId: "form-error" })
      return
    }

    setIsLoading(true)

    try {
      const API_URL = "http://localhost:4000/api"
      
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Login failed")
      }

      toast.success("Login Successful!", { 
        toastId: "success-login"
      })
      
      // ✅ 2. FIXED: Role Based Token Storage
      const userRoles = data.user.roles || []
      const isEditor = userRoles.some(role => role.name.toLowerCase() === "editor")
      const tokenToSave = data.accessToken || data.token;

      // Thoda delay taaki toast dikh sake
      setTimeout(() => {
        if (isEditor) {
          // 🚨 AGAR EDITOR HAI -> Save as 'editorToken'
          localStorage.setItem("editorToken", tokenToSave)
          localStorage.setItem("editorUser", JSON.stringify(data.user))
          
          // Safety: Purana admin token hata do taaki confusion na ho
          localStorage.removeItem("adminToken");
          localStorage.removeItem("adminUser");

          router.push("/editor")
        } else {
          // 🚨 AGAR ADMIN HAI -> Save as 'adminToken'
          localStorage.setItem("adminToken", tokenToSave)
          localStorage.setItem("adminUser", JSON.stringify(data.user))
          
          // Safety: Purana editor token hata do
          localStorage.removeItem("editorToken");
          localStorage.removeItem("editorUser");

          router.push("/admin")
        }
      }, 1000)

    } catch (error) {
      console.warn("Login Failed:", error.message)
      toast.error(error.message || "Invalid Credentials", { 
        toastId: "error-login"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left Side - Visual Section */}
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
              Sign in to access the Admin Panel and manage Law Nation submissions securely.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-10 xl:px-12 py-6 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
            <p className="text-sm text-gray-600">Sign in to continue</p>
          </div>
          <div className="hidden lg:block mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign In As Admin</h2>
            <p className="text-sm text-gray-600">Enter your credentials to access your account</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email" id="email" name="email"
                    value={formData.email} onChange={handleInputChange}
                    placeholder="Enter your email"
                    className={`w-full pl-10 pr-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all text-sm ${errors.email ? "border-red-500 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                    required
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-600 flex items-center gap-1">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"} id="password" name="password"
                    value={formData.password} onChange={handleInputChange}
                    placeholder="Enter your password"
                    className={`w-full pl-10 pr-12 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all text-sm ${errors.password ? "border-red-500 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.97 9.97 0 015.12 5.12m3.07 3.07L12 12m-3.81-3.81l3.81 3.81M12 12l3.81 3.81m0 0A9.97 9.97 0 0118.88 18.88m-3.07-3.07L12 12m3.81 3.81l-3.29 3.29M21 21l-3.29-3.29" /></svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-600 flex items-center gap-1">{errors.password}</p>}
                <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-6 py-2.5 bg-red-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 transition-all duration-200 transform hover:scale-[1.02] disabled:bg-red-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying Access...
                  </>
                ) : (
                  "Access Dashboard"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}