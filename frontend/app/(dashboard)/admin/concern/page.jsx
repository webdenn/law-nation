"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminSidebar from "../../../components/AdminSidebar";

export default function ConcernPage() {
    const router = useRouter();
    const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
    const [isLoading, setIsLoading] = useState(true);
    const [hiddenArticles, setHiddenArticles] = useState([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [currentAdmin, setCurrentAdmin] = useState({ name: "Admin", email: "" });

    useEffect(() => {
        const token = localStorage.getItem("adminToken");
        const adminData = localStorage.getItem("adminUser");
        if (!token) {
            router.push("/management-login");
        } else {
            if (adminData) setCurrentAdmin(JSON.parse(adminData));
            fetchHiddenArticles();
        }
    }, [router]);

    const fetchHiddenArticles = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem("adminToken");
            const res = await fetch(`${NEXT_PUBLIC_BASE_URL}/api/admin/articles/hidden`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                // The API returns { success: true, data: { articles: [], pagination: {} } }
                setHiddenArticles(data.data?.articles || []);
            } else {
                toast.error("Failed to load hidden articles");
            }
        } catch (error) {
            console.error("Error fetching hidden articles:", error);
            toast.error("Error loading data");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleVisibility = async (id) => {
        try {
            const token = localStorage.getItem("adminToken");
            // We want to SHOW the article, so isVisible = true
            const response = await fetch(`${NEXT_PUBLIC_BASE_URL}/api/admin/articles/${id}/visibility`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ isVisible: true }),
            });

            if (response.ok) {
                toast.success("Article restored to visible list");
                // Remove from this list as it is no longer hidden
                setHiddenArticles(prev => prev.filter(a => a.id !== id));
            } else {
                const data = await response.json();
                toast.error(data.message || "Failed to restore article");
            }
        } catch (error) {
            console.error("Error restoring article:", error);
            toast.error("Server error");
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row relative">
            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <AdminSidebar
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
            />

            <main className="flex-1 h-screen overflow-y-auto bg-gray-50 flex flex-col">
                {/* Header */}
                <header className="bg-white h-20 border-b flex items-center justify-between px-4 md:px-10 shadow-sm sticky top-0 z-20 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="md:hidden text-gray-600 hover:text-red-700 p-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            </svg>
                        </button>
                        <h2 className="text-lg md:text-xl font-black text-gray-700 uppercase">
                            Concern / Hidden Articles
                        </h2>
                    </div>

                    <div className="flex items-center gap-2 md:gap-6">
                        <div className="flex items-center gap-3 pl-3 md:pl-6 border-l border-gray-200">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-bold text-gray-800">{currentAdmin.name}</p>
                                <p className="text-[10px] text-gray-500 font-medium">Administrator</p>
                            </div>
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-100 border-2 border-red-600 text-red-700 flex items-center justify-center font-black text-sm md:text-lg">
                                {currentAdmin.name ? currentAdmin.name.charAt(0).toUpperCase() : "A"}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-4 md:p-10 space-y-6">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 p-5 border-b">
                            <div className="font-black text-gray-700 uppercase tracking-tighter text-base md:text-lg">
                                Hidden Articles List
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                These articles are currently hidden from the user website. Click the "Eye" icon to make them visible again.
                            </p>
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[900px]">
                                <thead className="bg-gray-100 text-[10px] uppercase text-gray-400 font-bold">
                                    <tr>
                                        <th className="p-5">Article Title</th>
                                        <th className="p-5">Author</th>
                                        <th className="p-5">Hidden At</th>
                                        <th className="p-5">Category</th>
                                        <th className="p-5 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan="5" className="p-10 text-center font-bold text-gray-500">Loading...</td>
                                        </tr>
                                    ) : hiddenArticles.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="p-10 text-center font-bold text-gray-500">No hidden articles found.</td>
                                        </tr>
                                    ) : (
                                        hiddenArticles.map((art) => (
                                            <tr key={art.id} className="hover:bg-red-50/30 transition-all">
                                                <td className="p-5 font-bold text-gray-800">{art.title}</td>
                                                <td className="p-5 text-sm text-gray-700 font-medium">{art.authorName || "Unknown"}</td>
                                                <td className="p-5 text-xs text-gray-500">
                                                    {art.hiddenAt ? new Date(art.hiddenAt).toLocaleString() : "N/A"}
                                                </td>
                                                <td className="p-5 text-xs font-bold text-gray-600 uppercase">
                                                    {art.category || "General"}
                                                </td>
                                                <td className="p-5 text-center">
                                                    <button
                                                        onClick={() => toggleVisibility(art.id)}
                                                        className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold text-xs uppercase hover:bg-green-600 hover:text-white transition-all flex items-center justify-center gap-2 mx-auto whitespace-nowrap min-w-[110px]"
                                                        title="Make Visible"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                        Un-Hide
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile List View (Cards) */}
                        <div className="md:hidden flex flex-col p-4 space-y-4 bg-gray-50">
                            {isLoading ? (
                                <div className="text-center text-gray-400 py-10">Loading...</div>
                            ) : hiddenArticles.length === 0 ? (
                                <div className="text-center text-gray-400 py-10">No hidden articles found.</div>
                            ) : (
                                hiddenArticles.map(art => (
                                    <div key={art.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded uppercase tracking-wider">
                                                {art.category}
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                                {art.hiddenAt ? new Date(art.hiddenAt).toLocaleDateString() : ""}
                                            </span>
                                        </div>

                                        <h3 className="font-bold text-gray-800 text-lg leading-tight">
                                            {art.title}
                                        </h3>

                                        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium border-b border-gray-50 pb-3 mb-1">
                                            <span>By {art.authorName}</span>
                                        </div>

                                        <button
                                            onClick={() => toggleVisibility(art.id)}
                                            className="w-full bg-white border border-green-600 text-green-700 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wide hover:bg-green-600 hover:text-white transition-all flex items-center justify-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            Un-Hide Article
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <ToastContainer position="top-right" autoClose={3000} theme="colored" />
        </div>
    );
}
