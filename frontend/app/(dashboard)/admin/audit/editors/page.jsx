"use client";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Download, Upload, CheckCircle, XCircle, UserPlus, FileText, ArrowLeft, Menu, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import AdminSidebar from "../../../../components/AdminSidebar";

export default function EditorAuditPage() {
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
            const nextPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;
            const res = await fetch(`${nextPublicApiUrl}/audit/events?type=EDITOR`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setEvents(data.data.events);
            } else {
                toast.error(data.message || "Failed to fetch audit editor history");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error fetching audit editor history");
        } finally {
            setLoading(false);
        }
    };

    const getEventIcon = (type) => {
        switch (type) {
            case 'EDITOR_ASSIGN': return <UserPlus size={14} className="text-blue-600" />;
            case 'EDITOR_REASSIGN': return <UserPlus size={14} className="text-orange-600" />;
            case 'EDITOR_DOWNLOAD': return <Download size={14} className="text-purple-600" />;
            case 'EDITOR_UPLOAD': return <Upload size={14} className="text-indigo-600" />;
            case 'FINAL_DECISION': return <FileText size={14} className="text-green-600" />;
            default: return <FileText size={14} className="text-gray-400" />;
        }
    };

    const formatEventType = (type) => {
        return type.replace(/_/g, " ");
    };

    const downloadCSV = () => {
        if (events.length === 0) return;

        const headers = ["Date", "Time", "Activity Type", "Performed By", "Article Title", "Details"];
        const csvRows = [headers.join(",")];

        events.forEach(event => {
            let details = "";
            if (event.eventType === 'EDITOR_ASSIGN') details = `Assigned to ${event.targetEditorName}`;
            else if (event.eventType === 'EDITOR_REASSIGN') details = `Reassigned to ${event.targetEditorName}`;
            else if (event.eventType === 'EDITOR_UPLOAD') details = `Editing Duration: ${event.editingDuration || '-'}`;
            else if (event.eventType === 'FINAL_DECISION') details = `Decision: ${event.decisionOutcome}`;

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
        a.download = `editor_audit_activities_${new Date().toISOString().split('T')[0]}.csv`;
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
                                Editor Activity Log
                            </h1>
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mt-1">Audit Log / Editorial Events</p>
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
                                No activity records found.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 uppercase text-[10px] font-black tracking-[0.2em]">
                                            <th className="p-6">Timeline</th>
                                            <th className="p-6">Activity</th>
                                            <th className="p-6">Agent</th>
                                            <th className="p-6">Article Involved</th>
                                            <th className="p-6">Outcome/Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 text-sm">
                                        {events.map((event) => (
                                            <tr key={event.id} className="hover:bg-red-50/30 transition-colors">
                                                <td className="p-6 text-gray-500">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Clock size={14} className="text-gray-300" />
                                                        <div className="font-bold text-gray-900 leading-none">{new Date(event.eventDate).toLocaleDateString()}</div>
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 font-bold ml-5">{event.eventTime}</div>
                                                </td>
                                                <td className="p-6">
                                                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-[10px] font-black text-gray-700 uppercase tracking-tighter">
                                                        {getEventIcon(event.eventType)}
                                                        {formatEventType(event.eventType)}
                                                    </span>
                                                </td>
                                                <td className="p-6 text-gray-900 font-bold">
                                                    {event.userName}
                                                </td>
                                                <td className="p-6 text-gray-800 font-bold max-w-[200px] truncate">
                                                    {event.articleTitle}
                                                </td>
                                                <td className="p-6 text-gray-600 text-xs">
                                                    {(() => {
                                                        switch (event.eventType) {
                                                            case 'EDITOR_ASSIGN':
                                                                return <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold uppercase text-[9px]">Assigned: {event.targetEditorName}</span>;
                                                            case 'EDITOR_REASSIGN':
                                                                return <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded font-bold uppercase text-[9px]">Reassigned to: {event.targetEditorName}</span>;
                                                            case 'EDITOR_UPLOAD':
                                                                return <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold uppercase text-[9px]">Duration: {(event.editingDuration && event.editingDuration !== 'N/A') ? event.editingDuration : '-'}</span>;
                                                            case 'FINAL_DECISION':
                                                                return (
                                                                    <span className={`px-2 py-1 rounded font-black uppercase text-[9px] ${event.decisionOutcome === 'PUBLISHED' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                                        {event.decisionOutcome}
                                                                    </span>
                                                                );
                                                            default:
                                                                return <span>-</span>;
                                                        }
                                                    })()}
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
