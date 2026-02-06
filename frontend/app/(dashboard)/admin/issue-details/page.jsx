"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminSidebar from "../../../components/AdminSidebar";

export default function IssueDetailsPage() {
    const router = useRouter();
    const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [currentAdmin, setCurrentAdmin] = useState({ name: "Admin" });

    const [uploadedIssues, setUploadedIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("adminToken");
        const adminData = localStorage.getItem("adminUser");
        if (!token) {
            router.push("/management-login/");
        } else {
            if (adminData) setCurrentAdmin(JSON.parse(adminData));
            fetchUploadedIssues(token);
        }
    }, [router]);

    const fetchUploadedIssues = async (token) => {
        setLoading(true);
        try {
            const res = await fetch(`${NEXT_PUBLIC_BASE_URL}/admin/pdfs`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setUploadedIssues(data.data.pdfs || []);
            }
        } catch (error) {
            console.error("Failed to fetch issues:", error);
            toast.error("Failed to fetch issues");
        } finally {
            setLoading(false);
        }
    };

    const filteredIssues = uploadedIssues.filter(issue =>
        issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (issue.shortDescription && issue.shortDescription.toLowerCase().includes(searchTerm.toLowerCase())) ||
        issue.issue.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.volume.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                            Issue Details
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

                    <div className="flex justify-between items-center mb-6">
                        <div className="relative w-full max-w-md">
                            <input
                                type="text"
                                placeholder="Search issues by title, month, or year..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                            />
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                            </svg>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-600">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                                Uploaded Issues
                            </h3>
                        </div>

                        <div className="p-6">
                            {loading ? (
                                <p className="text-center text-gray-500 py-4">Loading issues...</p>
                            ) : filteredIssues.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">No issues found.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs">
                                            <tr>
                                                <th className="px-4 py-3 rounded-l-lg">Title</th>
                                                <th className="px-4 py-3">Issue/Volume</th>
                                                <th className="px-4 py-3">Upload Date</th>
                                                <th className="px-4 py-3">File Size</th>
                                                <th className="px-4 py-3 rounded-r-lg text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredIssues.map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-50 transition">
                                                    <td className="px-4 py-4 font-medium text-gray-900">{item.title}</td>
                                                    <td className="px-4 py-4 text-gray-600">{item.issue} {item.volume}</td>
                                                    <td className="px-4 py-4 text-gray-500">
                                                        {new Date(item.uploadedAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-4 text-gray-500">{item.fileSize}</td>
                                                    <td className="px-4 py-4 text-right">
                                                        <a
                                                            href={item.watermarkedPdfUrl || item.originalPdfUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-red-600 hover:text-red-800 font-bold text-xs uppercase hover:underline"
                                                        >
                                                            View PDF
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
