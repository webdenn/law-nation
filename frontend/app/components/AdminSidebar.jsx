"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import Image from "next/image";
import logoImg from "../assets/logo.jpg";

export default function AdminSidebar({ isMobileMenuOpen, setIsMobileMenuOpen }) {
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = () => {
        localStorage.clear();
        toast.info("Admin Logged Out");
        router.push("/management-login/");
        window.location.reload();
    };

    const [expandedMenu, setExpandedMenu] = useState(null);

    const toggleSubmenu = (menuName) => {
        if (expandedMenu === menuName) {
            setExpandedMenu(null);
        } else {
            setExpandedMenu(menuName);
        }
    };

    const menuItems = [
        { name: "Dashboard", path: "/admin" },
        { name: "Our People", path: "/admin/our-people" },
        {
            name: "Audit History",
            path: "#",
            children: [
                { name: "User Audit", path: "/admin/audit/users" },
                { name: "Stage 1 Review History", path: "/admin/audit/editors" },
                { name: "Stage 2 Review History", path: "/admin/audit/reviewers" },
            ]
        },
        { name: "Add Stage 1 Review", path: "/admin/add-editor" },
        { name: "Add Stage 2 Review", path: "/admin/add-reviewer" },
        { name: "All Staff", path: "/admin/staff" }, // New Item
        { name: "Concern", path: "/admin/concern" },
        { name: "Upload Issue", path: "/admin/upload-issue" },
        { name: "Issue Details", path: "/admin/issue-details" }, // New Item
        { name: "Banner Management", path: "/admin/banners" },
        {
            name: "Site Settings",
            path: "#",
            children: [
                { name: "Footer Content", path: "/admin/settings" },
                { name: "About Us", path: "/admin/settings/about" },
            ]
        },
        // { name: "Live Database", path: "/admin/live-database" },
    ];

    return (
        <aside
            className={`fixed md:sticky top-0 h-screen w-72 bg-red-700 text-white flex flex-col shadow-2xl z-50 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen
                    ? "translate-x-0"
                    : "-translate-x-full md:translate-x-0"
                }`}
        >
            <div className="p-8 border-b border-red-800 flex flex-col items-center relative">
                <div className="mb-4 flex justify-center w-full">
                    <div className="bg-white p-1.5 rounded-lg shadow-md inline-block">
                        <Image
                            src={logoImg}
                            alt="Law Nation"
                            width={140}
                            height={40}
                            className="h-auto w-auto max-w-[140px] object-contain rounded-sm"
                            priority
                        />
                    </div>
                </div>
                <span className="text-[9px] bg-red-900/50 text-white/90 px-4 py-0.5 rounded-full font-black uppercase tracking-[0.2em] border border-red-800/50 shadow-sm">
                    Admin Management
                </span>

                {/* Close Button Mobile - Absolute Positioning */}
                <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="md:hidden text-white absolute top-6 right-6"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-6 h-6"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>
            <nav className="flex-1 px-4 mt-6 space-y-2 overflow-y-auto">
                {menuItems.map((item) => (
                    <div key={item.name}>
                        {item.children ? (
                            // Dropdown Menu Item
                            <div>
                                <button
                                    onClick={() => toggleSubmenu(item.name)}
                                    className={`w-full text-left p-3 rounded-lg transition-all flex justify-between items-center ${expandedMenu === item.name || item.children.some(child => pathname === child.path)
                                        ? "bg-red-800 text-white font-bold"
                                        : "hover:bg-red-600 text-red-100"
                                        }`}
                                >
                                    {item.name}
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className={`h-4 w-4 transition-transform ${expandedMenu === item.name ? 'rotate-180' : ''}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {expandedMenu === item.name && (
                                    <div className="pl-4 mt-1 space-y-1">
                                        {item.children.map((child) => (
                                            <Link
                                                key={child.path}
                                                href={child.path}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={`block w-full text-left p-2 rounded-lg transition-all text-sm ${pathname === child.path
                                                    ? "bg-red-900 text-white font-bold"
                                                    : "text-red-200 hover:text-white hover:bg-red-600/50"
                                                    }`}
                                            >
                                                {child.name}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Standard Menu Item
                            <Link
                                href={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`block w-full text-left p-3 rounded-lg transition-all ${pathname === item.path
                                    ? "bg-red-900 font-bold"
                                    : "hover:bg-red-600 text-red-100"
                                    }`}
                            >
                                {item.name}
                            </Link>
                        )}
                    </div>
                ))}
            </nav>
            <div className="p-4 border-t border-red-800">
                <button
                    onClick={handleLogout}
                    className="w-full p-2 text-sm bg-red-900 rounded font-bold uppercase hover:bg-black transition-colors"
                >
                    Logout
                </button>
            </div>
        </aside>
    );
}
