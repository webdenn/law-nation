"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";

// Define Interface
interface AdminPdf {
    id: string;
    title: string;
    issue: string;
    volume: string;
    shortDescription?: string;
    uploadedAt: string;
    pdfUrl: string;
}

export default function IssueViewerPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

    const [pdfData, setPdfData] = useState<AdminPdf | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // Edit States
    const [isEditMode, setIsEditMode] = useState(false);
    const [editData, setEditData] = useState({ title: "", shortDescription: "" });

    useEffect(() => {
        // 1. Check Auth (Standard Member)
        const token = localStorage.getItem("authToken");
        setIsLoggedIn(!!token);

        // 2. Check Admin
        const adminToken = localStorage.getItem("adminToken");
        setIsAdmin(!!adminToken);

        // 3. Fetch PDF Details
        if (id) {
            fetchPdfDetails(id);
        }
    }, [id]);

    const fetchPdfDetails = async (issueId: string) => {
        try {
            const res = await fetch(`${NEXT_PUBLIC_BASE_URL}/api/public/admin-pdfs/${issueId}`);
            const data = await res.json();

            if (res.ok) {
                setPdfData(data.data);
                setEditData({
                    title: data.data.title,
                    shortDescription: data.data.shortDescription || ""
                });
            } else {
                toast.error(data.error || "Failed to load issue.");
                router.push("/recent-issues");
            }
        } catch (error) {
            console.error("Error fetching PDF:", error);
            toast.error("Error loading issue.");
        } finally {
            setIsLoading(false);
        }
    };

    const getPdfFullUrl = (url: string) => {
        if (!url) return "";
        if (url.startsWith("http")) return url;
        // Prepends base URL for absolute hitting
        return `${NEXT_PUBLIC_BASE_URL}${url}`;
    };

    const handleDownload = async () => {
        if (!pdfData?.pdfUrl) return;
        try {
            toast.info("Preparing official download...");
            const url = getPdfFullUrl(pdfData.pdfUrl);
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `${pdfData.title.replace(/\s+/g, '_')}_LN_${pdfData.issue}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            toast.success("Download started!");
        } catch (error) {
            console.error("Download failed:", error);
            toast.error("Download failed. Please try again.");
        }
    };

    const handleUpdateIssue = async () => {
        const adminToken = localStorage.getItem("adminToken");
        try {
            toast.info("Publishing updates...");
            const res = await fetch(`${NEXT_PUBLIC_BASE_URL}/api/admin/pdfs/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${adminToken}`
                },
                body: JSON.stringify(editData)
            });
            if (res.ok) {
                toast.success("Issue details updated!");
                setIsEditMode(false);
                fetchPdfDetails(id);
            } else {
                const errData = await res.json();
                toast.error(errData.error || "Update failed.");
            }
        } catch (error) {
            toast.error("Request failed. Please check connection.");
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white min-h-screen">
                <div className="container mx-auto px-4 py-12 md:px-8 max-w-5xl animate-pulse">
                    <div className="h-6 bg-gray-100 rounded w-24 mb-6" />
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-4 bg-gray-100 rounded w-16" />
                        <div className="h-px w-8 bg-gray-100" />
                        <div className="h-4 bg-gray-100 rounded w-32" />
                    </div>
                    <div className="h-12 bg-gray-100 rounded w-3/4 mb-8" />
                    <div className="h-12 bg-gray-50 rounded w-full mb-10" />
                    <div className="h-[600px] bg-gray-100 rounded-3xl w-full" />
                </div>
            </div>
        );
    }

    if (!pdfData) return null;

    return (
        <div className="bg-white min-h-screen">
            <div className="container mx-auto px-4 py-12 md:px-8 max-w-5xl">
                {/* Header Section - Article Style */}
                <div className="mb-10 text-center md:text-left">
                    <Link
                        href="/recent-issues"
                        className="inline-flex items-center gap-2 text-[10px] font-black text-red-700 hover:text-red-800 mb-6 transition-all uppercase tracking-[0.2em] group outline-none"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3 group-hover:-translate-x-1 transition-transform">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        Back to Library
                    </Link>

                    <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                        <span className="bg-red-700 text-white text-[10px] font-black px-2 py-0.5 rounded italic">LN JOURNAL</span>
                        <div className="h-px w-8 bg-gray-200"></div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            {pdfData.issue} <span className="text-gray-300">•</span> {pdfData.volume}
                        </span>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-black text-gray-900 leading-[1.1] tracking-tight mb-8 max-w-4xl">
                        {pdfData.title}
                    </h1>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 border-y border-gray-100 py-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                Published {new Date(pdfData.uploadedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                                </svg>
                            </div>
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Digital Archive</span>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="relative">
                    {isLoggedIn ? (
                        /* 🟢 Logged In: Editor Style (Gray background container + shadow box) */
                        <div className="space-y-6 mb-12">
                            {/* Professional Toolbar */}
                            <div className="bg-gray-50 p-2 rounded-xl flex items-center justify-between shadow-inner border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleDownload}
                                        className="flex items-center gap-2 bg-white hover:bg-red-50 text-red-700 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-red-50 shadow-sm group"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5M12 3v13.5" />
                                        </svg>
                                        Download Official PDF
                                    </button>

                                    {isAdmin && (
                                        <button
                                            onClick={() => setIsEditMode(!isEditMode)}
                                            className={`flex items-center gap-2 ${isEditMode ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-100'} px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-gray-100 shadow-sm`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                            </svg>
                                            {isEditMode ? 'Exit Editor' : 'Edit Metadata'}
                                        </button>
                                    )}
                                </div>
                                <div className="hidden md:flex items-center gap-2 pr-4">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">Authenticity Verified • LN Prime</span>
                                </div>
                            </div>

                            {/* Management Panel */}
                            {isEditMode && isAdmin && (
                                <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-xl shadow-red-100/20 animate-in slide-in-from-top duration-500">
                                    <h3 className="text-xs font-black text-red-900 uppercase tracking-[0.2em] mb-5 flex items-center gap-3">
                                        <div className="bg-red-700 w-6 h-6 rounded flex items-center justify-center text-white italic shadow-lg shadow-red-200">M</div>
                                        Issue Management Panel
                                    </h3>
                                    <div className="grid grid-cols-1 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-red-800 uppercase tracking-widest flex items-center gap-2">
                                                Title <span className="text-red-300">| Required</span>
                                            </label>
                                            <input
                                                value={editData.title}
                                                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                                className="w-full bg-white border border-red-100 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-bold text-gray-900 placeholder-gray-300 shadow-sm transition-all"
                                                placeholder="Enter issue title..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-red-800 uppercase tracking-widest flex items-center gap-2">
                                                Public Description <span className="text-red-300">| Optional</span>
                                            </label>
                                            <textarea
                                                value={editData.shortDescription}
                                                onChange={(e) => setEditData({ ...editData, shortDescription: e.target.value })}
                                                rows={3}
                                                className="w-full bg-white border border-red-100 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-600 placeholder-gray-300 shadow-sm transition-all"
                                                placeholder="Enter short teaser for guest users..."
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-8 flex justify-end gap-4">
                                        <button
                                            onClick={() => setIsEditMode(false)}
                                            className="px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-red-700 transition-all font-sans"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleUpdateIssue}
                                            className="bg-red-700 hover:bg-black text-white px-10 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-xl hover:shadow-red-200"
                                        >
                                            Publish Metadata Updates
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* PDF Viewer - Premium Styled Container */}
                            <div className="bg-gray-100 p-3 md:p-6 rounded-3xl shadow-2xl border border-gray-200 h-[850px] relative">
                                <div className="bg-white rounded-xl shadow-inner overflow-hidden h-full relative border border-gray-300 ring-1 ring-black/[0.03]">
                                    <iframe
                                        src={getPdfFullUrl(pdfData.pdfUrl)}
                                        className="w-full h-full border-none"
                                        title={pdfData.title}
                                    />
                                    {/* Protective Overlay (Subtle) */}
                                    <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-black/5 rounded-xl"></div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* 🔒 Guest: Article Style (White background + blur overlay) */
                        <div className="relative w-full">
                            {/* Short Description Feature */}
                            <div className="text-xl md:text-3xl text-gray-600 leading-[1.4] font-serif italic mb-10 max-w-4xl border-l-[6px] border-red-700 pl-8 py-2">
                                {pdfData.shortDescription || "This monthly legal digest features an in-depth analysis of judicial precedents, legislative updates, and constitutional shifts that define our legal landscape today."}
                            </div>

                            {/* Faded Background Text */}
                            <div className="prose prose-xl prose-slate max-w-none prose-p:font-serif opacity-20 blur-[1.5px] select-none pointer-events-none mb-20 space-y-12">
                                <p>The legal framework of our nation continues to evolve as new judicial precedents are set and legislative reforms are introduced. In this issue, we delve into the most significant developments of the past month, providing expert commentary and analysis for legal professionals and scholars alike.</p>
                                <p>Judicial review remains a cornerstone of our democracy, ensuring that the legislative and executive branches operate within the bounds of the constitution. Our featured articles explore recent landmark judgments and their long-term implications for civil liberties and corporate governance.</p>
                                <p>Furthermore, we examine the shifting landscape of international law and its intersection with domestic policies. As global challenges such as digital privacy become increasingly prominent, the legal community must adapt to address these complex issues through innovative legal strategies and robust advocacy.</p>
                            </div>

                            {/* Sticky Professional Overlay */}
                            <div className="absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-white via-white/95 to-transparent flex items-end justify-center pb-20 z-10 transition-all duration-500">
                                <div className="text-center w-full px-4">
                                    <button
                                        onClick={() => router.push(`/login?redirect=/issue/${id}`)}
                                        className="inline-flex items-center justify-center bg-red-700 text-white font-black px-12 py-5 rounded-full hover:bg-black transition-all shadow-[0_20px_50px_rgba(220,38,38,0.3)] hover:shadow-red-300 transform hover:-translate-y-1 active:translate-y-0 active:scale-95 group outline-none"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 mr-3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                        </svg>
                                        <span className="text-sm uppercase tracking-[0.2em] font-sans">Login to Read Full Issue</span>
                                    </button>
                                    <p className="mt-8 text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] font-sans">Law Nation Premium Archive</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Legal Section */}
                <div className="mt-20 pt-12 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8 pb-32">
                    <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase text-center md:text-left">
                        © {new Date().getFullYear()} LAW NATION PRIME TIMES JOURNAL • ALL RIGHTS RESERVED
                    </p>
                    <div className="flex gap-10">
                        <button className="text-[10px] font-bold text-gray-400 hover:text-red-700 uppercase tracking-[0.2em] transition-colors outline-none cursor-default">Terms of Use</button>
                        <button className="text-[10px] font-bold text-gray-400 hover:text-red-700 uppercase tracking-[0.2em] transition-colors outline-none cursor-default">Privacy Policy</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
