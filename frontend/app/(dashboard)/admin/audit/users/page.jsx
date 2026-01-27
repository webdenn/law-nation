"use client";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Download, CheckCircle, XCircle, Clock } from "lucide-react";

export default function UserAuditPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAuditEvents();
    }, []);

    const fetchAuditEvents = async () => {
        try {
            const token = localStorage.getItem("adminToken");
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:4000";
            const res = await fetch(`${baseUrl}/api/audit/events?type=USER`, {
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

        const headers = ["User Name", "User Email", "Organization", "Article Title", "Upload Date", "Upload Time", "Status"];
        const csvRows = [headers.join(",")];

        events.forEach(event => {
            const row = [
                `"${event.userName}"`,
                `"${event.userEmail}"`,
                `"${event.userOrganization || ''}"`,
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
        <div className="p-8">
            <div className="flex justify-between items-end mb-6 border-b-4 border-red-600 pb-2">
                <h1 className="text-3xl font-black italic tracking-tighter text-gray-900 uppercase">
                    User Upload History
                </h1>
                <button
                    onClick={downloadCSV}
                    disabled={loading || events.length === 0}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm uppercase transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download size={16} /> Download CSV
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    {events.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 italic">
                            No user records found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 uppercase text-xs tracking-wider">
                                        <th className="p-4 font-bold">User</th>
                                        <th className="p-4 font-bold">Organization</th>
                                        <th className="p-4 font-bold">Article Title</th>
                                        <th className="p-4 font-bold">Upload Date/Time</th>
                                        <th className="p-4 font-bold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {events.map((event) => (
                                        <tr key={event.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="p-4 font-medium text-gray-900">
                                                {event.userName}
                                                <div className="text-xs text-gray-400 font-normal">{event.userEmail}</div>
                                            </td>
                                            <td className="p-4 text-gray-600">{event.userOrganization || "N/A"}</td>
                                            <td className="p-4 font-bold text-gray-800">{event.articleTitle}</td>
                                            <td className="p-4 text-gray-500">
                                                <div>{new Date(event.eventDate).toLocaleDateString()}</div>
                                                <div className="text-xs text-gray-400">{event.eventTime}</div>
                                            </td>
                                            <td className="p-4">
                                                {getStatusBadge(event.decisionOutcome || 'PENDING')}
                                                {/* Note: audit events might not have outcome directly on upload event, logic might need adjustment if storing separately */}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
