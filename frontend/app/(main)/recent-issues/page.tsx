"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AdminPdf {
    id: string;
    title: string;
    issue: string;
    volume: string;
    shortDescription: string;
    uploadedAt: string;
    pdfUrl: string;
}

export default function RecentIssuesPage() {
    const router = useRouter();
    const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

    const [issues, setIssues] = useState<AdminPdf[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("authToken");
        setIsLoggedIn(!!token);
        fetchIssues();
    }, []);

    const fetchIssues = async () => {
        try {
            const res = await fetch(`${NEXT_PUBLIC_BASE_URL}/api/public/admin-pdfs`);
            const data = await res.json();
            if (res.ok) {
                // The backend returns { success: true, data: { pdfs: [...], total: ... } }
                setIssues(data.data?.pdfs || []);
            }
        } catch (error) {
            console.error("Error fetching issues:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white min-h-screen">
                <div className="container mx-auto px-4 py-20 max-w-5xl">
                    <div className="space-y-12">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex flex-col md:flex-row gap-8 animate-pulse border-b border-gray-100 pb-12">
                                <div className="w-14 h-14 bg-gray-100 rounded-full shrink-0"></div>
                                <div className="flex-1 space-y-4">
                                    <div className="h-2 bg-gray-100 rounded w-1/4"></div>
                                    <div className="h-8 bg-gray-100 rounded w-3/4"></div>
                                    <div className="h-4 bg-gray-100 rounded w-full"></div>
                                    <div className="h-2 bg-gray-100 rounded w-1/6 mt-6"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen">
            <div className="container mx-auto px-4 py-16 md:px-8 max-w-5xl">
                {/* Header */}
                <div className="mb-20 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                        <span className="bg-red-700 text-white text-[10px] font-black px-2 py-0.5 rounded italic">LN PRIME</span>
                        <div className="h-px w-8 bg-gray-200"></div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">Monthly Archives</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight leading-none mb-6">
                        Recent <span className="text-red-700 italic">Issues</span>
                    </h1>
                    <p className="text-gray-500 text-lg font-medium max-w-2xl leading-relaxed">
                        Access our complete library of legal digests, constitutional analysis, and judicial reviews published monthly.
                    </p>
                </div>

                {/* List Content */}
                {issues.length > 0 ? (
                    <div className="space-y-16">
                        {issues.map((issue) => (
                            <div key={issue.id} className="relative bg-white border-b border-gray-100 pb-16 last:border-0">
                                <div className="flex flex-col md:flex-row gap-10">
                                    {/* Content Area */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="text-[10px] font-black text-red-700 uppercase tracking-[0.3em] font-sans">
                                                {issue.issue} • {issue.volume}
                                            </span>
                                            <div className="h-px w-8 bg-gray-100"></div>
                                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                                                Digital Edition
                                            </span>
                                        </div>

                                        <Link href={`/issue/${issue.id}`} className="block">
                                            <h2 className="text-3xl md:text-4xl font-black text-blue-600 underline leading-[1.1] tracking-tight mb-5 hover:text-blue-800 transition-colors">
                                                {issue.title}
                                            </h2>
                                        </Link>

                                        <p className="text-gray-600 font-serif text-xl leading-relaxed line-clamp-2 italic mb-8 max-w-4xl">
                                            {issue.shortDescription || "This monthly legal digest features an in-depth analysis of judicial precedents, legislative updates, and constitutional shifts."}
                                        </p>

                                        <div className="flex flex-wrap items-center justify-between gap-6">
                                            <div className="flex items-center gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest font-sans">
                                                <span>{new Date(issue.uploadedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-200"></span>
                                                <span>JOURNAL ARCHIVE</span>
                                            </div>

                                            {isLoggedIn ? (
                                                <Link
                                                    href={`/issue/${issue.id}`}
                                                    className="inline-flex items-center gap-3 text-xs font-black text-red-700 transition-all uppercase tracking-[0.2em]"
                                                >
                                                    View Full Issue
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                                    </svg>
                                                </Link>
                                            ) : (
                                                <Link
                                                    href={`/issue/${issue.id}`}
                                                    className="inline-flex items-center gap-3 text-xs font-black text-gray-900 transition-all uppercase tracking-[0.2em]"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                                    </svg>
                                                    Login to Access
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                                    </svg>
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center border-t border-gray-100">
                        <div className="text-gray-300 mb-4 flex justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                            </svg>
                        </div>
                        <p className="text-gray-400 font-bold uppercase tracking-widest italic">No Issues Found in Archive</p>
                    </div>
                )}
            </div>

            {/* Simple Footer */}
            <div className="bg-gray-50/50 py-12 border-t border-gray-100">
                <div className="container mx-auto px-4 max-w-5xl text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
                        © {new Date().getFullYear()} LAW NATION PRIME TIMES • ALL RIGHTS RESERVED
                    </p>
                </div>
            </div>
        </div>
    );
}
