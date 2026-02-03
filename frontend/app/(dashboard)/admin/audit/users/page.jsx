"use client";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Download, CheckCircle, XCircle, Clock, ArrowLeft, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import AdminSidebar from "../../../../components/AdminSidebar";

export default function UserAuditPage() {
    const router = useRouter();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        fetchAuditEvents();
    }, []);

    const fetchAuditEvents = async () => {
        try {
            const token = localStorage.getItem("adminToken");
<<<<<<< Updated upstream
            const nextPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;
            const res = await fetch(`${nextPublicApiUrl}/audit/events?type=USER`, {
=======
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:4000";
            const res = await fetch(`${baseUrl}/audit/events?type=USER`, {
>>>>>>> Stashed changes
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setEvents(data.data.events);
            } else {
                toast.error(data.message || "Failed to fetch audit user history");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error fetching audit user history");
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (outcome) => {
        switch (outcome) {
            case 'PUBLISHED':
                return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700 uppercase"><CheckCircle size={12} className="mr-1" /> Published</span>;
            case 'REJECTED':
                return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700 uppercase"><XCircle size={12} className="mr-1" /> Rejected</span>;
            default:
                return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-yellow-100 text-yellow-700 uppercase"><Clock size={12} className="mr-1" /> Pending</span>;
        }
    };

    const downloadCSV = () => {
        if (events.length === 0) return;

        const headers = ["User Name", "User Email", "Article Title", "Upload Date", "Upload Time", "Status"];
        const csvRows = [headers.join(",")];

        events.forEach(event => {
            const row = [
                `"${event.userName}"`,
                `"${(event.userEmail && event.userEmail !== 'N/A') ? event.userEmail : '-'}"`,
                `"${event.articleTitle}"`,
                `\t${new Date(event.eventDate).toLocaleDateString('en-GB')}`,
                event.eventTime,
                event.decisionOutcome || 'PENDING'
            ];
            csvRows.push(row.join(","));
        });

        const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `user_audit_history_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row font-sans">
            <AdminSidebar
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
            />

            <main className="flex-1 p-6 md:p-12 overflow-y-auto h-screen">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 border-b-4 border-red-600 pb-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-full text-gray-700 transition shadow-sm"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="md:hidden flex items-center gap-2 mb-2">
                                <button onClick={() => setIsMobileMenuOpen(true)} className="text-red-700">
                                    <Menu size={24} />
                                </button>
                                <span className="font-black italic text-red-700">LAW NATION</span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter text-gray-900 uppercase">
                                User Upload History
                            </h1>
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mt-1">Audit Log / System Events</p>
                        </div>
                    </div>

                    <button
                        onClick={downloadCSV}
                        disabled={loading || events.length === 0}
                        className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                        <Download size={16} /> Download CSV
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                        {events.length === 0 ? (
                            <div className="p-12 text-center text-gray-400 italic font-medium">
                                No user records found in the audit logs.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 uppercase text-[10px] font-black tracking-[0.2em]">
                                            <th className="p-6">User Details</th>
                                            <th className="p-6">Article Information</th>
                                            <th className="p-6">Timeline</th>
                                            <th className="p-6">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 text-sm">
                                        {events.map((event) => (
                                            <tr key={event.id} className="hover:bg-red-50/30 transition-colors group">
                                                <td className="p-6">
                                                    <div className="font-bold text-gray-900">{event.userName}</div>
                                                    <div className="text-xs text-gray-400 font-medium">{(event.userEmail && event.userEmail !== 'N/A') ? event.userEmail : '-'}</div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="font-bold text-gray-800 leading-tight">{event.articleTitle}</div>
                                                </td>
                                                <td className="p-6 text-gray-500 font-medium">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Clock size={14} className="text-gray-300" />
                                                        {new Date(event.eventDate).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-xs text-gray-400 ml-5">{event.eventTime}</div>
                                                </td>
                                                <td className="p-6">
                                                    {getStatusBadge(event.decisionOutcome || 'PENDING')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
