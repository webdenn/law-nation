"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminSidebar from "../../../components/AdminSidebar";

export default function StaffPage() {
    const router = useRouter();
    const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("editors"); // "editors" | "reviewers"
    const [editors, setEditors] = useState([]);
    const [reviewers, setReviewers] = useState([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [currentAdmin, setCurrentAdmin] = useState({ name: "Admin", email: "" });

    const [selectedUser, setSelectedUser] = useState(null);
    const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
    const [removalReason, setRemovalReason] = useState("");
    const [isRemoving, setIsRemoving] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("adminToken");
        const adminData = localStorage.getItem("adminUser");
        if (!token) {
            router.push("/law/management-login/");
        } else {
            if (adminData) setCurrentAdmin(JSON.parse(adminData));
            fetchData();
        }
    }, [router, activeTab]);

    const fetchData = async () => {
        setIsLoading(true);
        const token = localStorage.getItem("adminToken");
        try {
            if (activeTab === "editors") {
                const res = await fetch(`${NEXT_PUBLIC_BASE_URL}/admin/access-management/editors`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    // New API returns data.data.editors
                    setEditors(data.data?.editors || []);
                } else {
                    toast.error("Failed to fetch editors");
                }
            } else {
                const res = await fetch(`${NEXT_PUBLIC_BASE_URL}/admin/access-management/reviewers`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    // New API returns data.data.reviewers
                    setReviewers(data.data?.reviewers || []);
                } else {
                    toast.error("Failed to fetch reviewers");
                }
            }
        } catch (error) {
            console.error("Error fetching staff:", error);
            toast.error("Error loading data");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveAccessClick = (user) => {
        setSelectedUser(user);
        setRemovalReason("");
        setIsRemoveModalOpen(true);
    };

    const confirmRemoveAccess = async () => {
        if (!selectedUser) return;

        setIsRemoving(true);
        const token = localStorage.getItem("adminToken");

        try {
            const res = await fetch(`${NEXT_PUBLIC_BASE_URL}/admin/access-management/remove-access`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: selectedUser.id,
                    userType: activeTab === "editors" ? "EDITOR" : "REVIEWER",
                    reason: removalReason || "Access removed by admin"
                })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || "Access removed successfully");
                // Update local state to reflect change without full reload
                const updateUserList = (list) =>
                    list.map(u => u.id === selectedUser.id ? { ...u, status: "INACTIVE" } : u);

                if (activeTab === "editors") {
                    setEditors(updateUserList(editors));
                } else {
                    setReviewers(updateUserList(reviewers));
                }
                setIsRemoveModalOpen(false);
            } else {
                toast.error(data.error || "Failed to remove access");
            }
        } catch (error) {
            console.error("Error removing access:", error);
            toast.error("Connection error. Please try again.");
        } finally {
            setIsRemoving(false);
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
                            Editors & Reviewers
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
                    {/* Tabs */}
                    <div className="flex gap-4 border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab("editors")}
                            className={`pb-4 px-4 font-bold text-sm uppercase tracking-wide transition-all ${activeTab === "editors"
                                ? "text-red-600 border-b-2 border-red-600"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            Editors ({editors.length})
                        </button>
                        <button
                            onClick={() => setActiveTab("reviewers")}
                            className={`pb-4 px-4 font-bold text-sm uppercase tracking-wide transition-all ${activeTab === "reviewers"
                                ? "text-red-600 border-b-2 border-red-600"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            Reviewers ({reviewers.length})
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[900px]">
                                <thead className="bg-gray-100 text-[10px] uppercase text-gray-400 font-bold">
                                    <tr>
                                        <th className="p-5">Name</th>
                                        <th className="p-5">Email</th>
                                        <th className="p-5">Status</th>
                                        <th className="p-5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan="6" className="p-10 text-center font-bold text-gray-500">Loading...</td>
                                        </tr>
                                    ) : (activeTab === "editors" ? editors : reviewers).length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="p-10 text-center font-bold text-gray-500">No {activeTab} found.</td>
                                        </tr>
                                    ) : (
                                        (activeTab === "editors" ? editors : reviewers).map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50 transition-all">
                                                <td className="p-5 font-bold text-gray-800 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                                        {user.name?.charAt(0) || "U"}
                                                    </div>
                                                    {user.name}
                                                </td>
                                                <td className="p-5 text-sm text-gray-600">{user.email}</td>
                                                <td className="p-5">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${user.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                        }`}>
                                                        {user.status === "ACTIVE" ? "Active" : "Inactive"}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-right">
                                                    {user.status === "ACTIVE" ? (
                                                        <button
                                                            onClick={() => handleRemoveAccessClick(user)}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-all"
                                                            title="Remove Access"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                                                            </svg>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            disabled
                                                            className="text-gray-300 cursor-not-allowed p-2 rounded-full"
                                                            title="Access already removed"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                                                            </svg>
                                                        </button>
                                                    )}
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
                            ) : (activeTab === "editors" ? editors : reviewers).length === 0 ? (
                                <div className="text-center text-gray-400 py-10">No {activeTab} found.</div>
                            ) : (
                                (activeTab === "editors" ? editors : reviewers).map(user => (
                                    <div key={user.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${user.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                }`}>
                                                {user.status === "ACTIVE" ? "Active" : "Inactive"}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {user.status === "ACTIVE" && (
                                                    <button
                                                        onClick={() => handleRemoveAccessClick(user)}
                                                        className="text-red-500 hover:text-red-700 p-1"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700 shrink-0">
                                                {user.name?.charAt(0) || "U"}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800 text-base leading-tight">
                                                    {user.name}
                                                </h3>
                                                <p className="text-xs text-gray-500">{user.email}</p>
                                            </div>
                                        </div>

                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </main >

            {/* Remove Access Modal */}
            {
                isRemoveModalOpen && selectedUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-2xl w-full max-w-md">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Remove Access?</h3>
                                <p className="text-sm text-gray-500 mt-2">
                                    You are about to remove access for <span className="font-bold text-gray-800">{selectedUser.name}</span>.
                                    This will deactivate their account immediately.
                                </p>
                            </div>

                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Reason (Optional)</label>
                                <textarea
                                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none min-h-[80px]"
                                    placeholder="e.g. Employee left the company"
                                    value={removalReason}
                                    onChange={(e) => setRemovalReason(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsRemoveModalOpen(false)}
                                    disabled={isRemoving}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmRemoveAccess}
                                    disabled={isRemoving}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition shadow-lg flex justify-center items-center gap-2"
                                >
                                    {isRemoving ? "Removing..." : "Confirm Removal"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            <ToastContainer position="top-right" autoClose={3000} theme="colored" />
        </div >
    );
}
