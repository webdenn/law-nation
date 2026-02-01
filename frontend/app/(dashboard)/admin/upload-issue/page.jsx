
"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminSidebar from "../../../components/AdminSidebar";

export default function AdminUploadIssuePage() {
    const router = useRouter();
    const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [currentAdmin, setCurrentAdmin] = useState({ name: "Admin" });

    // Upload Form State
    const [title, setTitle] = useState("");
    const [issue, setIssue] = useState("January"); // Default month
    const [volume, setVolume] = useState(new Date().getFullYear().toString());
    const [shortDescription, setShortDescription] = useState("");
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const fileInputRef = useRef(null);

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    useEffect(() => {
        const token = localStorage.getItem("adminToken");
        const adminData = localStorage.getItem("adminUser");
        if (!token) {
            router.push("/management-login");
        } else {
            if (adminData) setCurrentAdmin(JSON.parse(adminData));
        }
    }, [router]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type !== "application/pdf") {
                toast.error("Only PDF files are allowed");
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !title || !issue || !volume) {
            toast.warning("Please fill all required fields");
            return;
        }

        setIsUploading(true);
        const token = localStorage.getItem("adminToken");
        const formData = new FormData();
        formData.append("pdf", file);
        formData.append("title", title);
        formData.append("issue", issue);
        formData.append("volume", volume);
        if (shortDescription) formData.append("shortDescription", shortDescription);

        try {
            const res = await fetch(`${NEXT_PUBLIC_BASE_URL}/api/admin/pdfs`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            const data = await res.json();
            if (res.ok) {
                toast.success("PDF Uploaded Successfully!");
                // Reset form
                setTitle("");
                setShortDescription("");
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
            } else {
                toast.error(data.error || "Upload failed");
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Upload failed. Check console.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row relative">
            <ToastContainer position="top-right" autoClose={3000} theme="colored" />

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
                            Upload Issue
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

                <div className="p-4 md:p-10 space-y-8 max-w-7xl mx-auto w-full">

                    {/* Upload Form */}
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-600">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                </svg>
                                Upload New Issue
                            </h3>
                        </div>
                        <form onSubmit={handleUpload} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Title <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none"
                                        placeholder="e.g. Law Nation Monthly Digest"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Issue (Month) <span className="text-red-500">*</span></label>
                                        <select
                                            value={issue}
                                            onChange={(e) => setIssue(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none bg-white"
                                        >
                                            {months.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Volume (Year) <span className="text-red-500">*</span></label>
                                        <input
                                            type="number"
                                            required
                                            value={volume}
                                            onChange={(e) => setVolume(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none"
                                            placeholder="2026"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Short Description</label>
                                    <textarea
                                        value={shortDescription}
                                        onChange={(e) => setShortDescription(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none h-[124px] resize-none"
                                        placeholder="Brief summary of the issue..."
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2 border-t border-gray-100 pt-6">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Upload PDF File <span className="text-red-500">*</span></label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        required
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 transition-all border border-gray-300 rounded-lg cursor-pointer bg-white"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isUploading}
                                        className="bg-red-600 hover:bg-red-700 text-white px-8 py-2.5 rounded-lg font-bold shadow-lg shadow-red-200 transition-all flex items-center gap-2 disabled:opacity-70 whitespace-nowrap"
                                    >
                                        {isUploading ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Uploading...
                                            </>
                                        ) : (
                                            <>Upload Issue</>
                                        )}
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2 ml-1">
                                    * Supports unlimited file size. Automatic watermarking will be applied.
                                </p>
                            </div>
                        </form>
                    </div>

                </div>
            </main>
        </div>
    );
}
