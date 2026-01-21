"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminSidebar from "../../../components/AdminSidebar";
import { Trash2, Edit2, Plus, Save, X, Users, FileText } from "lucide-react";

export default function OurPeopleSettingsPage() {
    const router = useRouter();
    const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:4000";

    // Data State
    const [teamMembers, setTeamMembers] = useState([]);
    const [reviewers, setReviewers] = useState([]);

    // UI State
    const [activeTab, setActiveTab] = useState("team"); // 'team', 'reviewers'
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Form State
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null); // If null, adding new
    const [formData, setFormData] = useState({
        name: "",
        role: "",
        bio: "",
        specialization: ""
    });

    useEffect(() => {
        const token = localStorage.getItem("adminToken");
        if (!token) {
            router.push("/management-login");
        } else {
            fetchSettings();
        }
    }, [router]);

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${NEXT_PUBLIC_BASE_URL}/api/settings/our-people`);
            const data = await res.json();
            if (data.success && data.settings) {
                setTeamMembers(Array.isArray(data.settings.teamMembers) ? data.settings.teamMembers : []);
                setReviewers(Array.isArray(data.settings.reviewers) ? data.settings.reviewers : []);
            }
        } catch (error) {
            console.error("Fetch Settings Error:", error);
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async (updatedTeam, updatedReviewers, successMessage = "Settings updated successfully!") => {
        setSaving(true);
        try {
            const token = localStorage.getItem("adminToken");
            const res = await fetch(`${NEXT_PUBLIC_BASE_URL}/api/settings/our-people`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    teamMembers: updatedTeam,
                    reviewers: updatedReviewers
                }),
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(successMessage);
                setTeamMembers(updatedTeam);
                setReviewers(updatedReviewers);
                resetForm();
            } else {
                toast.error(data.error || "Failed to update settings");
            }
        } catch (error) {
            console.error("Update Error:", error);
            toast.error("Server error during update");
        } finally {
            setSaving(false);
        }
    };

    const getCurrentList = () => {
        if (activeTab === "reviewers") return reviewers;
        return teamMembers;
    };

    const getTabLabel = () => {
        if (activeTab === "reviewers") return "Reviewer";
        return "Team Member";
    };

    const handleEdit = (member) => {
        setFormData({
            name: member.name,
            role: member.role || "",
            bio: member.bio || "",
            specialization: member.specialization || ""
        });
        setEditId(member.id);
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        const label = getTabLabel();
        if (confirm(`Are you sure you want to remove this ${label}?`)) {
            let updatedTeam = [...teamMembers];
            let updatedReviewers = [...reviewers];

            if (activeTab === "team") {
                updatedTeam = updatedTeam.filter(m => m.id !== id);
            } else {
                updatedReviewers = updatedReviewers.filter(m => m.id !== id);
            }

            await saveSettings(updatedTeam, updatedReviewers, `${label} removed successfully!`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Prepare copies of all lists
        let updatedTeam = [...teamMembers];
        let updatedReviewers = [...reviewers];
        const label = getTabLabel();
        let action = "added";

        // Determine which list to update based on activeTab
        let targetList = activeTab === "team" ? updatedTeam : updatedReviewers;

        if (editId) {
            // Update existing in the active list
            action = "updated";
            const updatedList = targetList.map(m =>
                m.id === editId ? { ...m, ...formData } : m
            );

            if (activeTab === "team") updatedTeam = updatedList;
            else updatedReviewers = updatedList;

        } else {
            // Add new
            const newMember = {
                id: Date.now(),
                ...formData
            };

            if (activeTab === "team") updatedTeam.push(newMember);
            else updatedReviewers.push(newMember);
        }

        await saveSettings(updatedTeam, updatedReviewers, `${label} ${action} successfully!`);
    };

    const resetForm = () => {
        setFormData({ name: "", role: "", bio: "", specialization: "" });
        setEditId(null);
        setIsEditing(false);
    };

    // Tab Button Component
    const TabButton = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => { setActiveTab(id); setIsEditing(false); }}
            className={`flex items-center gap-2 px-6 py-3 font-bold uppercase text-sm border-b-2 transition-all ${activeTab === id
                ? "border-red-600 text-red-600 bg-red-50"
                : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
        >
            <Icon size={18} /> {label}
            <span className="ml-2 bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                {id === "team" ? teamMembers.length : reviewers.length}
            </span>
        </button>
    );

    return (
        <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row font-sans">
            <AdminSidebar
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
            />

            <main className="flex-1 p-6 md:p-12 overflow-y-auto h-screen">
                {/* Mobile Header Toggle */}
                <div className="md:hidden flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold uppercase">Our People</h1>
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="text-red-700 font-bold border border-red-700 px-3 py-1 rounded"
                    >
                        Menu
                    </button>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-tight">Manage People</h2>
                        <p className="text-gray-500 text-sm mt-1">Dashboard / Our People / {getTabLabel()}s</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-8 bg-white shadow-sm rounded-t-lg overflow-x-auto">
                    <TabButton id="team" label="Team Members" icon={Users} />
                    <TabButton id="reviewers" label="Reviewers" icon={FileText} />
                </div>

                {/* Main Content Area */}
                <div className="bg-white rounded-b-lg border border-t-0 p-6 min-h-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold uppercase text-gray-700">{getTabLabel()}s List</h3>
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition shadow-md"
                            >
                                <Plus size={18} /> Add {getTabLabel()}
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <p className="text-center py-10">Loading...</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {getCurrentList().length === 0 ? (
                                <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                    <p className="text-gray-500 italic">No {getTabLabel().toLowerCase()}s added yet.</p>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="mt-4 text-red-600 font-bold hover:underline"
                                    >
                                        Add your first {getTabLabel().toLowerCase()}
                                    </button>
                                </div>
                            ) : (
                                getCurrentList().map((member) => (
                                    <div key={member.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between group hover:border-gray-200 transition-all h-full">
                                        <div className="mb-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{member.name}</h3>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handleEdit(member)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(member.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">{member.role}</p>
                                            <div className="text-sm text-gray-500 line-clamp-4 leading-relaxed">
                                                {member.bio}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Modal Form Section */}
                {isEditing && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6 border-b pb-4">
                                <div>
                                    <h3 className="text-xl font-bold uppercase">
                                        {editId ? "Edit" : "Add"} {getTabLabel()}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Adding to <strong>{getTabLabel()}s</strong> list
                                    </p>
                                </div>
                                <button onClick={resetForm} className="text-gray-400 hover:text-red-600 transition">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder={activeTab === "reviewers" ? "e.g. John Doe" : "e.g. Dr. Rajesh Kumar"}
                                    />
                                </div>

                                {activeTab !== "reviewers" && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase">Role / Designation</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all"
                                                value={formData.role}
                                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                                placeholder="e.g. Editor-in-Chief"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase">Bio (Short Description)</label>
                                            <textarea
                                                required
                                                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none min-h-[120px] transition-all"
                                                value={formData.bio}
                                                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                                placeholder="Enter a brief professional bio..."
                                            />
                                            <p className="text-xs text-gray-400 mt-1 text-right">{formData.bio.length} characters</p>
                                        </div>
                                    </>
                                )}

                                <div className="pt-6 flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 bg-black text-white py-3 rounded-lg font-bold uppercase text-sm hover:bg-gray-800 transition flex justify-center items-center gap-2 shadow-lg"
                                    >
                                        <Save size={18} /> {saving ? "Saving..." : "Save Member"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-6 py-3 border border-gray-300 rounded-lg font-bold uppercase text-sm hover:bg-gray-50 transition text-gray-600"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
