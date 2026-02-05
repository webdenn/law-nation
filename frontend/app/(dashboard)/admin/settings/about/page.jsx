"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminSidebar from "../../../../components/AdminSidebar";

export default function AboutSettingsPage() {
    const router = useRouter();
    const nextPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;

    const [heading, setHeading] = useState("");
    const [lead, setLead] = useState("");
    const [mission, setMission] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("adminToken");
        if (!token) {
            router.push("/management-login/");
        } else {
            fetchAboutContent();
        }
    }, [router]);

    const fetchAboutContent = async () => {
        try {
            const token = localStorage.getItem("adminToken");
            const res = await fetch(`${nextPublicApiUrl}/admin/dashboard/about`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const result = await res.json();
            if (result.success && result.data && result.data.content) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(result.data.content, 'text/html');

                setHeading(doc.querySelector('h1')?.innerHTML || "");
                setLead(doc.querySelector('.about-lead-text')?.textContent || "");
                setMission(doc.querySelector('.about-mission-text')?.textContent || "");
            } else {
                loadDefaults();
            }
        } catch (error) {
            console.error("Fetch About Error:", error);
            toast.error("Failed to load content.");
        } finally {
            setLoading(false);
        }
    };


    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        // Bundle back into a format that keeps the classes for parsing if needed, 
        // though the public page now handles the layout.
        const content = `
            <div>
                <h1>${heading}</h1>
                <p class="about-lead-text">${lead}</p>
                <div class="about-mission-text">${mission}</div>
            </div>
        `.trim();

        try {
            const token = localStorage.getItem("adminToken");
            const res = await fetch(`${nextPublicApiUrl}/admin/dashboard/about`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ content }),
            });

            if (res.ok) {
                toast.success("About Us updated!");
            } else {
                toast.error("Failed to update");
            }
        } catch (error) {
            toast.error("Server error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex h-screen bg-white flex-col md:flex-row font-sans text-gray-900 overflow-hidden relative">
            <ToastContainer position="top-right" autoClose={3000} theme="colored" />

            {/* 🌑 MOBILE OVERLAY (Backdrop) */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <AdminSidebar
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
            />

            <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-10 pb-6 border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-md z-10">
                        <div className="flex items-center gap-3">
                            {/* Hamburger Button (Mobile Only) */}
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="md:hidden text-gray-600 hover:text-red-700 p-1"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                    className="w-7 h-7"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                                    />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">About Us Settings</h1>
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-widest hidden md:block">Configure core brand messaging</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 md:px-8 py-2 bg-red-700 text-white text-[10px] md:text-xs font-bold uppercase tracking-widest rounded hover:bg-red-800 transition disabled:opacity-50 shadow-lg shadow-red-700/20"
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="w-8 h-8 border-4 border-red-700 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-red-700">1. Main Heading</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-md p-4 text-2xl font-bold outline-none focus:border-red-700 transition bg-white"
                                    value={heading}
                                    onChange={(e) => setHeading(e.target.value)}
                                    placeholder=''
                                />
                                <p className="text-[10px] text-gray-400 italic">Supports HTML for coloring specific words.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-red-700">2. Lead Message (Red Border Text)</label>
                                <textarea
                                    className="w-full border border-gray-300 bg-white rounded-md p-4 text-lg text-gray-600 outline-none focus:border-red-700 transition min-h-[120px]"
                                    value={lead}
                                    onChange={(e) => setLead(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-red-700">3. The Mission Content</label>
                                <textarea
                                    className="w-full border border-gray-300 bg-white rounded-md p-4 text-sm text-gray-500 font-light leading-relaxed outline-none focus:border-red-700 transition min-h-[200px]"
                                    value={mission}
                                    onChange={(e) => setMission(e.target.value)}
                                />
                            </div>

                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
