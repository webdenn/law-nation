"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast, ToastContainer } from "react-toastify"
import 'react-toastify/dist/ReactToastify.css';

export default function Adminlogin() {
  const router = useRouter()
  
  // ✅ FIX 1: Sirf redirect logic ko handle kiya
  useEffect(() => {
    const editorToken = localStorage.getItem("editorToken");
    const adminToken = localStorage.getItem("adminToken");
    if (editorToken) {
        router.push("/editor");
    } else if (adminToken) {
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
      toast.error("Please fix the errors above")
      return
    }

    setIsLoading(true)

    try {
      const API_URL = "http://localhost:4000/api"
      
      const response = await fetch(`${API_URL}/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Login failed")
      }

      // ✅ FIX 2: Login se pehle purana kachra saaf karein
      localStorage.clear(); 
      toast.success("Login Successful!")
      
      const userRoles = data.user.roles || []
      // Roles check karne ka sahi tareeka
      const isEditor = userRoles.some(role => 
        (role.name?.toLowerCase() === "editor") || 
        (role.role?.name?.toLowerCase() === "editor")
      )
      const tokenToSave = data.accessToken || data.token;

      setTimeout(() => {
        if (isEditor) {
          localStorage.setItem("editorToken", tokenToSave)
          localStorage.setItem("editorUser", JSON.stringify(data.user))
          router.push("/editor")
        } else {
          localStorage.setItem("adminToken", tokenToSave)
          localStorage.setItem("adminUser", JSON.stringify(data.user))
          router.push("/admin")
        }
      }, 1000)

    } catch (error) {
      toast.error(error.message || "Invalid Credentials")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <ToastContainer position="top-right" autoClose={2000} />
      {/* Left Side - Visual Section (Aapka Original Design) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-600 via-red-700 to-red-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
        <div className="relative z-10 flex flex-col justify-center items-start px-10 xl:px-14 text-white">
          <h1 className="text-4xl xl:text-5xl font-bold mb-3 leading-tight">Welcome Back</h1>
          <div className="w-16 h-1 bg-white mb-4"></div>
          <p className="text-lg xl:text-xl text-white/90 font-light leading-relaxed max-w-md">
            Sign in to access the Admin Panel and manage Law Nation submissions securely.
          </p>
        </div>
      </div>

      {/* Right Side - Form Section (Aapka Original Design) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-10 xl:px-12 py-6 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5 sm:p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Management Login</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <input
                  type="email" name="email"
                  value={formData.email} onChange={handleInputChange}
                  placeholder="Enter your email"
                  className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 ${errors.email ? "border-red-500 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"} name="password"
                    value={formData.password} onChange={handleInputChange}
                    placeholder="Enter your password"
                    className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 ${errors.password ? "border-red-500 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center text-gray-400">
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-6 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:bg-red-400 flex items-center justify-center"
              >
                {isLoading ? "Verifying..." : "Access Dashboard"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}