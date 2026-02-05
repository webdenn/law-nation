"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminSidebar from "../../../components/AdminSidebar";
import { Trash2, Edit2, Plus, Save, X, Users } from "lucide-react";

export default function OurPeopleSettingsPage() {
    const router = useRouter();
    const nextPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;

    // Data State
    const [teamMembers, setTeamMembers] = useState([]);

    // UI State
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
            router.push("/law/management-login/");
        } else {
            fetchSettings();
        }
    }, [router]);

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${nextPublicApiUrl}/settings/our-people`);
            const data = await res.json();
            if (data.success && data.settings) {
                setTeamMembers(Array.isArray(data.settings.teamMembers) ? data.settings.teamMembers : []);
            }
        } catch (error) {
            console.error("Fetch Settings Error:", error);
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async (updatedTeam, successMessage = "Settings updated successfully!") => {
        setSaving(true);
        try {
            const token = localStorage.getItem("adminToken");
            // Note: We're still sending reviewers as an empty array or the existing one depending on the backend expectation.
            // Usually, if we want to remove them, we should send the updated state.
            const res = await fetch(`${NEXT_PUBLIC_BASE_URL}/settings/our-people`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    teamMembers: updatedTeam,
                    // We don't modify reviewers here, we can keep the existing ones or send current reviewers if we had them.
                    // But the requirement says "remove reviewers वाला code", so let's send what the backend has for reviewers
                    // OR if the user wants to remove the DATA too, we send empty.
                    // For now, I'll fetch them once to preserve them, or just send the current ones if I had them.
                    // Wait, if I'm removing the UI, I should probably just fetch the existing ones and re-send them to avoid accidental deletion of data.
                    // Actually, let's just keep the fetch logic for reviewers but hide it from UI.
                }),
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(successMessage);
                setTeamMembers(updatedTeam);
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

    // Modified saveSettings to preserve reviewers data while we only manage teamMembers in this UI
    const handleAction = async (updatedTeam, message) => {
        setSaving(true);
        try {
            const token = localStorage.getItem("adminToken");
            // First fetch current to get reviewers
            const getRes = await fetch(`${nextPublicApiUrl}/settings/our-people`);
            const getData = await getRes.json();
            const currentReviewers = getData.success && getData.settings ? getData.settings.reviewers : [];

            const res = await fetch(`${nextPublicApiUrl}/settings/our-people`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    teamMembers: updatedTeam,
                    reviewers: currentReviewers
                }),
            });

            if (res.ok) {
                toast.success(message);
                setTeamMembers(updatedTeam);
                resetForm();
            } else {
                toast.error("Failed to update settings");
            }
        } catch (error) {
            toast.error("Error updating settings");
        } finally {
            setSaving(false);
        }
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
        if (confirm(`Are you sure you want to remove this Team Member?`)) {
            const updatedTeam = teamMembers.filter(m => m.id !== id);
            await handleAction(updatedTeam, `Team Member removed successfully!`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let updatedTeam = [...teamMembers];
        let action = "added";

        if (editId) {
            action = "updated";
            updatedTeam = updatedTeam.map(m =>
                m.id === editId ? { ...m, ...formData } : m
            );
        } else {
            const newMember = {
                id: Date.now(),
                ...formData
            };
            updatedTeam.push(newMember);
        }

        await handleAction(updatedTeam, `Team Member ${action} successfully!`);
    };

    const resetForm = () => {
        setFormData({ name: "", role: "", bio: "", specialization: "" });
        setEditId(null);
        setIsEditing(false);
    };

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
                        <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-tight">Manage Team</h2>
                        <p className="text-gray-500 text-sm mt-1">Dashboard / Our People / Team Members</p>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="bg-white rounded-xl border p-6 min-h-[400px] shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold uppercase text-gray-700">Team Members List</h3>
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition shadow-md"
                            >
                                <Plus size={18} /> Add Team Member
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <p className="text-center py-10">Loading...</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {teamMembers.length === 0 ? (
                                <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                    <p className="text-gray-500 italic">No team members added yet.</p>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="mt-4 text-red-600 font-bold hover:underline"
                                    >
                                        Add your first team member
                                    </button>
                                </div>
                            ) : (
                                teamMembers.map((member) => (
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
                                        {editId ? "Edit" : "Add"} Team Member
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Adding to <strong>Team Members</strong> list
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
                                        placeholder="e.g. Dr. Rajesh Kumar"
                                    />
                                </div>

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
