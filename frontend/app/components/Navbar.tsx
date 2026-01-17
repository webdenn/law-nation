// "use client"
// import React, { useState, useEffect } from "react"
// import Link from "next/link"
// import { usePathname, useRouter } from "next/navigation"
// import { toast } from 'react-toastify'
// import { useSelector, useDispatch } from "react-redux"
// // Path check karlena apne folder structure ke hisab se
// import { setCredentials, logout as logoutAction } from "../lib/store/authSlice"

// export default function Navbar() {
//   const pathname = usePathname()
//   const router = useRouter()
//   const dispatch = useDispatch()
  
//   // TypeScript: Explicitly defining boolean type
//   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false)
//   const [scrolled, setScrolled] = useState<boolean>(false)

//   // ✅ FIX: Added '(state: any)' to resolve TypeScript error
//   const user = useSelector((state: any) => state.auth.user)

//   // Scroll effect for styling
//   useEffect(() => {
//     const handleScroll = () => {
//       setScrolled(window.scrollY > 10)
//     }
//     window.addEventListener("scroll", handleScroll)
//     return () => window.removeEventListener("scroll", handleScroll)
//   }, [])

//   // Refresh Fix
//   useEffect(() => {
//     if (typeof window !== 'undefined') {
//       const token = localStorage.getItem("authToken");
//       const userName = localStorage.getItem("userName");
      
//       if (token && !user) {
//         dispatch(setCredentials({ 
//           user: { name: userName || "User", email: "" }, 
//           token: token 
//         }));
//       }
//     }
//   }, [dispatch, user]);

//   const handleLogout = () => {
//     dispatch(logoutAction());
//     localStorage.removeItem("authToken");
//     localStorage.removeItem("userName");
    
//     toast.info("Logged out successfully");
//     setIsMobileMenuOpen(false); 
//     router.push("/login");
//   }

//   const navItems = [
//     { name: "Home", link: "/home" },
//     { name: "About Us", link: "/about" },
//     { name: "Research Paper", link: "/research-paper" },
//     { name: "Submit Paper", link: "/submit-paper" }
//   ]

//   const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)

//   // Null check for path
//   if (pathname && pathname.startsWith("/admin")) return null;

//   return (
//     <>
//       {/* Navbar Fixed Top with Blur Effect */}
//       <nav 
//         className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
//           scrolled 
//             ? "bg-white/90 backdrop-blur-md shadow-sm border-gray-200 py-2" 
//             : "bg-white border-transparent py-4"
//         }`}
//       >
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex items-center justify-between">
            
//             {/* Logo */}
//             <div className="flex-shrink-0">
//               <Link href="/" className="flex items-center gap-2">
//                 <img src="/img/logo.jpg" alt="Law Nation" className="h-12 w-auto object-contain" />
//               </Link>
//             </div>

//             {/* Desktop Links */}
//             <div className="hidden lg:flex items-center space-x-8">
//               {navItems.map((item) => {
//                 const isActive = pathname === item.link
//                 return (
//                   <Link
//                     key={item.name}
//                     href={item.link}
//                     className={`relative text-sm font-medium transition-colors duration-200 py-2 ${
//                       isActive 
//                         ? "text-red-600" 
//                         : "text-gray-600 hover:text-red-600"
//                     }`}
//                   >
//                     {item.name}
//                     {/* Active Indicator Line */}
//                     {isActive && (
//                       <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-full"></span>
//                     )}
//                   </Link>
//                 )
//               })}
//             </div>

//             {/* User / Auth Section */}
//             <div className="hidden lg:flex items-center space-x-4">
//               {user && user.name ? (
//                 <div className="relative group">
//                   <button className="flex items-center gap-3 focus:outline-none py-2">
//                     <div className="text-right hidden xl:block">
//                       <p className="text-xs text-gray-500 font-medium">Welcome</p>
//                       <p className="text-sm font-bold text-gray-900 leading-none">{user.name}</p>
//                     </div>
//                     <div className="h-10 w-10 rounded-full bg-gradient-to-r from-red-600 to-red-500 text-white flex items-center justify-center font-bold text-lg shadow-md border-2 border-white ring-1 ring-gray-100 uppercase">
//                       {user.name.charAt(0)}
//                     </div>
//                   </button>

//                   {/* Dropdown */}
//                   <div className="absolute right-0 top-full mt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right">
//                     <div className="bg-white rounded-lg shadow-xl py-1 overflow-hidden">
//                       <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
//                         <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
//                       </div>
//                       <button 
//                         onClick={handleLogout} 
//                         className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-medium flex items-center gap-2 transition-colors"
//                       >
//                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
//                           Sign out
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="flex items-center gap-3">
//                   <Link 
//                     href="/login" 
//                     className="text-sm font-semibold text-gray-600 hover:text-red-600 transition-colors px-3 py-2"
//                   >
//                     Log In
//                   </Link>
//                   <Link 
//                     href="/join-us" 
//                     className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-full shadow-md hover:bg-red-700 hover:shadow-lg transition-all transform hover:-translate-y-0.5"
//                   >
//                     Join Us
//                   </Link>
//                 </div>
//               )}
//             </div>

//             {/* Mobile Toggle Button */}
//             <div className="lg:hidden flex items-center">
//               <button 
//                 onClick={toggleMobileMenu} 
//                 className="p-2 rounded-md text-gray-600 hover:text-red-600 hover:bg-gray-50 focus:outline-none transition-colors"
//               >
//                 {isMobileMenuOpen ? (
//                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
//                 ) : (
//                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
//                 )}
//               </button>
//             </div>
//           </div>
//         </div>
//       </nav>

//       {/* Spacer to prevent content hiding behind fixed navbar */}
//       <div className={scrolled ? "h-16" : "h-20"}></div>

//       {/* Mobile Menu Overlay & Sidebar */}
//       {isMobileMenuOpen && (
//         <div 
//           className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 lg:hidden" 
//           onClick={toggleMobileMenu}
//         />
//       )}

//       <div className={`fixed inset-y-0 right-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}>
//         <div className="flex flex-col h-full">
//           <div className="flex items-center justify-between p-5 border-b border-gray-100">
//             <span className="font-bold text-lg text-gray-800">Menu</span>
//             <button onClick={toggleMobileMenu} className="text-gray-400 hover:text-red-600 transition-colors">
//                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
//             </button>
//           </div>
          
//           <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
//             {navItems.map(item => {
//               const isActive = pathname === item.link;
//               return (
//                 <Link 
//                   key={item.name} 
//                   href={item.link} 
//                   onClick={() => setIsMobileMenuOpen(false)}
//                   className={`block px-4 py-3 rounded-lg text-base font-medium transition-all ${
//                     isActive 
//                       ? "bg-red-50 text-red-600 shadow-sm" 
//                       : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
//                   }`}
//                 >
//                   {item.name}
//                 </Link>
//               )
//             })}
//           </div>

//           <div className="p-5 border-t border-gray-100 bg-gray-50">
//             {user && user.name ? (
//               <div className="space-y-4">
//                 <div className="flex items-center gap-3 px-2">
//                    <div className="h-10 w-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold uppercase shadow-sm">
//                       {user.name.charAt(0)}
//                    </div>
//                    <div className="overflow-hidden">
//                       <p className="font-medium text-gray-900 truncate">{user.name}</p>
//                       <p className="text-xs text-gray-500">Member</p>
//                    </div>
//                 </div>
//                 <button 
//                   onClick={handleLogout} 
//                   className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-red-600 border border-gray-200 rounded-lg font-medium shadow-sm hover:bg-red-50 hover:border-red-100 transition-all"
//                 >
//                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
//                   Sign Out
//                 </button>
//               </div>
//             ) : (
//               <div className="grid grid-cols-2 gap-3">
//                 <Link href="/login" className="px-4 py-3 text-center bg-white text-gray-700 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors">
//                   Log In
//                 </Link>
//                 <Link href="/join-us" className="px-4 py-3 text-center bg-red-600 text-white rounded-lg font-medium shadow-sm hover:bg-red-700 transition-colors">
//                   Sign Up
//                 </Link>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </>
//   )
// }


"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image" // ✅ Next.js Image Component
import { usePathname, useRouter } from "next/navigation"
import { toast } from 'react-toastify'
import { useSelector, useDispatch } from "react-redux"
import { Menu, X, LogOut, User } from 'lucide-react' 

import { setCredentials, logout as logoutAction } from "../lib/store/authSlice"

// ✅ CORRECT IMPORT PATH (Aapke Screenshot ke hisab se)
// ".." se components folder ke bahar aaye -> phir "assets" folder me gaye -> phir "logo.jpg" uthaya
import logoImg from "../assets/logo.jpg" 

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useDispatch()
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Redux State Fix
  const user = useSelector((state: any) => state.auth.user)

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // User Auth Check
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem("authToken");
      const userName = localStorage.getItem("userName");
      
      if (token && !user) {
        dispatch(setCredentials({ 
          user: { name: userName || "User", email: "" }, 
          token: token 
        }));
      }
    }
  }, [dispatch, user]);

  const handleLogout = () => {
    dispatch(logoutAction());
    localStorage.removeItem("authToken");
    localStorage.removeItem("userName");
    
    toast.info("Logged out successfully");
    setIsMobileMenuOpen(false); 
    router.push("/login");
  }

  const navItems = [
    { name: "Home", link: "/home" },
    { name: "Submit a Paper", link: "/submit-paper" },
    { name: "Recent Issues ", link: "/research-paper" },
    { name: " Law Nation Prime Talks ", link: "/ Law-Nation-Prime-Talks" },
    { name: "About Us", link: "/about" },
    
    
  ]

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)

  // Admin pages check
  if (pathname && pathname.startsWith("/admin")) return null;

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
          scrolled 
            ? "bg-white/90 backdrop-blur-md shadow-sm border-gray-200 py-2" 
            : "bg-white border-transparent py-4"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            
            {/* ✅ LOGO SECTION (Ab Path Sahi Hai) */}
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center gap-2">
                <div className="relative h-12 w-40"> 
                  <Image 
                    src={logoImg}  // ✅ Imported variable use kiya
                    alt="Law Nation" 
                    fill
                    className="object-contain object-left"
                    priority
                  />
                </div>
              </Link>
            </div>

            {/* Desktop Links */}
            <div className="hidden lg:flex items-center space-x-8">
              {navItems.map((item) => {
                const isActive = pathname === item.link
                return (
                  <Link
                    key={item.name}
                    href={item.link}
                    className={`relative text-sm font-medium transition-colors duration-200 py-2 ${
                      isActive 
                        ? "text-red-600" 
                        : "text-gray-600 hover:text-red-600"
                    }`}
                  >
                    {item.name}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-full"></span>
                    )}
                  </Link>
                )
              })}
            </div>

            {/* User / Auth Section */}
            <div className="hidden lg:flex items-center space-x-4">
              {user && user.name ? (
                <div className="relative group">
                  <button className="flex items-center gap-3 focus:outline-none py-2">
                    <div className="text-right hidden xl:block">
                      <p className="text-xs text-gray-500 font-medium">Welcome</p>
                      <p className="text-sm font-bold text-gray-900 leading-none">{user.name}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-red-600 to-red-500 text-white flex items-center justify-center font-bold text-lg shadow-md border-2 border-white ring-1 ring-gray-100 uppercase">
                      {user.name.charAt(0)}
                    </div>
                  </button>

                  {/* Dropdown */}
                  <div className="absolute right-0 top-full mt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right">
                    <div className="bg-white rounded-lg shadow-xl py-1 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                      </div>
                      <button 
                        onClick={handleLogout} 
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-medium flex items-center gap-2 transition-colors"
                      >
                          <LogOut size={16} />
                          Sign out
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-red-600 transition-colors px-3 py-2">
                    Log In
                  </Link>
                  <Link href="/join-us" className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-full shadow-md hover:bg-red-700 hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                    Join Us
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Toggle Button */}
            <div className="lg:hidden flex items-center">
              <button 
                onClick={toggleMobileMenu} 
                className="p-2 rounded-md text-gray-600 hover:text-red-600 hover:bg-gray-50 focus:outline-none transition-colors"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer */}
      <div className={scrolled ? "h-16" : "h-20"}></div>

      {/* Mobile Menu Overlay & Sidebar */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 lg:hidden" 
          onClick={toggleMobileMenu}
        />
      )}

      <div className={`fixed inset-y-0 right-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <span className="font-bold text-lg text-gray-800">Menu</span>
            <button onClick={toggleMobileMenu} className="text-gray-400 hover:text-red-600 transition-colors">
               <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
            {navItems.map(item => {
              const isActive = pathname === item.link;
              return (
                <Link 
                  key={item.name} 
                  href={item.link} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-base font-medium transition-all ${
                    isActive 
                      ? "bg-red-50 text-red-600 shadow-sm" 
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>

          <div className="p-5 border-t border-gray-100 bg-gray-50">
            {user && user.name ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                   <div className="h-10 w-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold uppercase shadow-sm">
                      {user.name.charAt(0)}
                   </div>
                   <div className="overflow-hidden">
                      <p className="font-medium text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500">Member</p>
                   </div>
                </div>
                <button 
                  onClick={handleLogout} 
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-red-600 border border-gray-200 rounded-lg font-medium shadow-sm hover:bg-red-50 hover:border-red-100 transition-all"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link href="/login" className="px-4 py-3 text-center bg-white text-gray-700 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                  Log In
                </Link>
                <Link href="/join-us" className="px-4 py-3 text-center bg-red-600 text-white rounded-lg font-medium shadow-sm hover:bg-red-700 transition-colors">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}