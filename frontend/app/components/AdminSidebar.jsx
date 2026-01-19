"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "react-toastify";

export default function AdminSidebar({ isMobileMenuOpen, setIsMobileMenuOpen }) {
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = () => {
        localStorage.clear();
        toast.info("Admin Logged Out");
        router.push("/management-login");
        window.location.reload();
    };

    const menuItems = [
        { name: "Dashboard", path: "/admin" },
        { name: "Add New Editor", path: "/admin/add-editor" },
        { name: "Banner Management", path: "/admin/banners" },
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
            <div className="p-8 border-b border-red-800 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black italic tracking-tighter">
                        LAW NATION
                    </h1>
                    <span className="text-[10px] bg-white text-red-700 px-2 py-0.5 rounded-full font-bold uppercase mt-2 inline-block">
                        Admin Panel
                    </span>
                </div>
                {/* Close Button Mobile */}
                <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="md:hidden text-white"
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
            <nav className="flex-1 px-4 mt-6 space-y-2">
                {menuItems.map((item) => (
                    <Link
                        key={item.path}
                        href={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`block w-full text-left p-3 rounded-lg transition-all ${pathname === item.path
                                ? "bg-red-900 font-bold"
                                : "hover:bg-red-600 text-red-100"
                            }`}
                    >
                        {item.name}
                    </Link>
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
