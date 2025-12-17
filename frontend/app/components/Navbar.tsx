"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"



export default function Navbar() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navItems = [
    { name: "Home", link: "/" },
    { name: "About Us", link: "/about" },
    { name: "Research Paper", link: "/research-paper" },
    { name: "Submit Paper", link: "/submit-paper" }
  ]

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  return (
    <>
      <nav className="w-full bg-white  shadow-sm border-b border-gray-200 navbar-font">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left Side - Logo */}
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center">
                <img src="/img/logo.jpg" alt="Law Nation Prime Times Journal" className="h-12 w-auto" />
              </Link>
            </div>

            {/* Center Navigation */}
            <div className="hidden lg:flex lg:items-center lg:space-x-1 flex-1 justify-center">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.link}
                  className={`px-4 py-2 text-gray-900 hover:text-red-600 transition-colors duration-200 ${
                    pathname === item.link ? "text-red-600 font-medium" : ""
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Right Side - Create Account and Sign In */}
            <div className="hidden lg:flex lg:items-center lg:space-x-4">
              <Link
                href="/join-us"
                className="px-4 py-2 bg-white text-red-600 border border-red-600 rounded-md hover:bg-red-50 transition-colors duration-200 font-medium"
              >
                Create Account
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Login
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <button
                onClick={toggleMobileMenu}
                className="p-2 text-gray-700 hover:text-red-600 transition-colors duration-200"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <img src="/img/logo.jpg" alt="Law Nation Prime Times Journal" className="h-10 w-auto" />
            <button
              onClick={toggleMobileMenu}
              className="p-2 text-gray-700 hover:text-red-600 transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mobile Navigation */}
          <div className="flex-1 overflow-y-auto py-4">
            {navItems.map((item) => (
              <div key={item.name} className="border-b border-gray-100">
                <Link
                  href={item.link}
                  className={`block px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors duration-200 ${
                    pathname === item.link ? "bg-red-50 text-red-600 font-medium" : ""
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              </div>
            ))}
          </div>

          {/* Mobile Actions */}
          <div className="border-t border-gray-200 p-4 space-y-3">
            <Link
              href="/join-us"
              className="block w-full px-4 py-2.5 text-center bg-white text-red-600 border border-red-600 rounded-md hover:bg-red-50 transition-colors duration-200 font-medium"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Create Account
            </Link>
            <Link
              href="/login"
              className="block w-full px-4 py-2.5 text-center bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 font-medium"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleMobileMenu}
        />
      )}
    </>
  )
}
