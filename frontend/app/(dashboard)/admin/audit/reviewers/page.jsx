"use client";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Copy, ArrowRight, Download, Upload, CheckCircle, XCircle, UserPlus, FileText } from "lucide-react";

export default function ReviewerAuditPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAuditEvents();
    }, []);

    const fetchAuditEvents = async () => {
        try {
            const token = localStorage.getItem("adminToken");
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:4000";
            const res = await fetch(`${baseUrl}/api/audit/events?type=REVIEWER`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setEvents(data.data.events);
            } else {
                toast.error(data.message || "Failed to fetch audit reviewer history");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error fetching audit reviewer history");
        } finally {
            setLoading(false);
        }
    };

    const getEventIcon = (type) => {
        switch (type) {
            case 'REVIEWER_ASSIGN': return <UserPlus size={16} className="text-blue-600" />;
            case 'REVIEWER_REASSIGN': return <UserPlus size={16} className="text-orange-600" />;
            case 'REVIEWER_DOWNLOAD': return <Download size={16} className="text-purple-600" />;
            case 'REVIEWER_UPLOAD': return <Upload size={16} className="text-indigo-600" />;
            // Fallback for editor types if mixed or similar
            case 'EDITOR_ASSIGN': return <UserPlus size={16} className="text-blue-600" />;
            default: return <FileText size={16} className="text-gray-400" />;
        }
    };

    const formatEventType = (type) => {
        return type.replace(/_/g, " ");
    };

    const formatDuration = (event) => {
        const parts = [];
        if (event.editingDurationDays > 0) parts.push(`${event.editingDurationDays}d`);
        if (event.editingDurationHours > 0) parts.push(`${event.editingDurationHours}h`);
        if (event.editingDurationMinutes > 0) parts.push(`${event.editingDurationMinutes}m`);
        return parts.length > 0 ? parts.join(' ') : '0m';
    };

    const downloadCSV = () => {
        if (events.length === 0) return;

        const headers = ["Date", "Time", "Activity Type", "Performed By", "Article Title", "Details"];
        const csvRows = [headers.join(",")];

        events.forEach(event => {
            let details = "";
            // Adapt details based on event type
            if (event.eventType === 'REVIEWER_ASSIGN') details = `Assigned to ${event.targetEditorName || 'Reviewer'}`;
            else if (event.eventType === 'REVIEWER_REASSIGN') details = `Reassigned from ${event.previousEditorName || 'Previous'} to ${event.targetEditorName || 'New'}`;
            else if (event.eventType === 'REVIEWER_UPLOAD') details = `Review Uploaded (Duration: ${formatDuration(event)})`;
            else if (event.eventType === 'REVIEWER_DOWNLOAD') details = `Reviewer Downloaded Document`;

            const row = [
                `\t${new Date(event.eventDate).toLocaleDateString('en-GB')}`,
                event.eventTime,
                event.eventType,
                `"${event.userName}"`,
                `"${event.articleTitle}"`,
                `"${details}"`
            ];
            csvRows.push(row.join(","));
        });

        const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `reviewer_audit_activities_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-end mb-6 border-b-4 border-red-600 pb-2">
                <h1 className="text-3xl font-black italic tracking-tighter text-gray-900 uppercase">
                    Reviewer Activity Log
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
                            No activity records found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 uppercase text-xs tracking-wider">
                                        <th className="p-4 font-bold">Date/Time</th>
                                        <th className="p-4 font-bold">Activity Type</th>
                                        <th className="p-4 font-bold">Performed By (Admin/Reviewer)</th>
                                        <th className="p-4 font-bold">Article Involved</th>
                                        <th className="p-4 font-bold">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {events.map((event) => (
                                        <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 text-gray-500">
                                                <div className="font-medium text-gray-900">{new Date(event.eventDate).toLocaleDateString()}</div>
                                                <div className="text-xs">{event.eventTime}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100 text-xs font-bold text-gray-700 uppercase">
                                                    {getEventIcon(event.eventType)}
                                                    {formatEventType(event.eventType)}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-900 font-medium">
                                                {event.userName}
                                            </td>
                                            <td className="p-4 text-gray-800 font-bold">
                                                {event.articleTitle}
                                            </td>
                                            <td className="p-4 text-gray-600 text-xs">
                                                {event.eventType === 'REVIEWER_ASSIGN' && (
                                                    <span>Assigned to <strong>{event.targetEditorName}</strong></span>
                                                )}
                                                {event.eventType === 'REVIEWER_REASSIGN' && (
                                                    <span>Reassigned from <strong>{event.previousEditorName}</strong> to <strong>{event.targetEditorName}</strong></span>
                                                )}
                                                {event.eventType === 'REVIEWER_UPLOAD' && (
                                                    <span>Review Uploaded (Duration: {formatDuration(event)})</span>
                                                )}
                                                {event.eventType === 'REVIEWER_DOWNLOAD' && (
                                                    <span>Downloaded Document</span>
                                                )}
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
