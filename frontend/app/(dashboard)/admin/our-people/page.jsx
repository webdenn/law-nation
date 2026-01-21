"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminSidebar from "../../../components/AdminSidebar";
import { Trash2, Edit2, Plus, Save, X } from "lucide-react";

export default function OurPeopleSettingsPage() {
    const router = useRouter();
    const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:4000";

    const [teamMembers, setTeamMembers] = useState([]);
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
        specialization: "" // Optional if needed
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
            if (data.success && data.settings && data.settings.teamMembers) {
                setTeamMembers(data.settings.teamMembers);
            } else {
                setTeamMembers([]);
            }
        } catch (error) {
            console.error("Fetch Settings Error:", error);
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async (updatedMembers) => {
        setSaving(true);
        try {
            const token = localStorage.getItem("adminToken");
            const res = await fetch(`${NEXT_PUBLIC_BASE_URL}/api/settings/our-people`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ teamMembers: updatedMembers }),
            });

            const data = await res.json();
            if (res.ok) {
                toast.success("Team updated successfully!");
                setTeamMembers(updatedMembers);
                resetForm();
            } else {
                toast.error(data.error || "Failed to update");
            }
        } catch (error) {
            console.error("Update Error:", error);
            toast.error("Server error during update");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (member) => {
        setFormData({
            name: member.name,
            role: member.role,
            bio: member.bio,
            specialization: member.specialization || ""
        });
        setEditId(member.id);
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        if (confirm("Are you sure you want to remove this member?")) {
            const updated = teamMembers.filter(m => m.id !== id);
            await saveSettings(updated);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let updatedMembers = [...teamMembers];

        if (editId) {
            // Update existing
            updatedMembers = updatedMembers.map(m =>
                m.id === editId ? { ...m, ...formData } : m
            );
        } else {
            // Add new
            const newMember = {
                id: Date.now(), // Simple ID generation
                ...formData
            };
            updatedMembers.push(newMember);
        }

        await saveSettings(updatedMembers);
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

                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-tight">Team Management</h2>
                        <p className="text-gray-500 text-sm mt-1">Dashboard / Our People</p>
                    </div>
                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition"
                        >
                            <Plus size={18} /> Add Member
                        </button>
                    )}
                </div>

                {loading ? (
                    <p>Loading team...</p>
                ) : (
                    <div>

                        {/* List Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {teamMembers.length === 0 ? (
                                <div className="col-span-full text-center py-10">
                                    <p className="text-gray-500 italic">No team members added yet.</p>
                                </div>
                            ) : (
                                teamMembers.map((member) => (
                                    <div key={member.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between group hover:border-red-200 transition-all h-full">
                                        <div className="mb-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-lg text-gray-900">{member.name}</h3>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEdit(member)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(member.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">{member.role}</p>
                                            <p className="text-sm text-gray-500 line-clamp-3">{member.bio}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Modal Form Section */}
                        {isEditing && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                                <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                                        <h3 className="text-xl font-bold uppercase">
                                            {editId ? "Edit Member" : "Add New Member"}
                                        </h3>
                                        <button onClick={resetForm} className="text-gray-400 hover:text-red-600 transition">
                                            <X size={24} />
                                        </button>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase">Full Name</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full border border-gray-300 rounded p-3 text-sm focus:border-red-600 outline-none"
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
                                                className="w-full border border-gray-300 rounded p-3 text-sm focus:border-red-600 outline-none"
                                                value={formData.role}
                                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                                placeholder="e.g. Editor-in-Chief"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase">Bio (Short Description)</label>
                                            <textarea
                                                required
                                                className="w-full border border-gray-300 rounded p-3 text-sm focus:border-red-600 outline-none min-h-[120px]"
                                                value={formData.bio}
                                                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                                placeholder="Enter a brief professional bio..."
                                            />
                                        </div>

                                        <div className="pt-6 flex gap-3">
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                className="flex-1 bg-black text-white py-3 rounded-lg font-bold uppercase text-sm hover:bg-gray-800 transition flex justify-center items-center gap-2"
                                            >
                                                <Save size={18} /> {saving ? "Saving..." : "Save Member"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={resetForm}
                                                className="px-6 py-3 border border-gray-300 rounded-lg font-bold uppercase text-sm hover:bg-gray-50 transition"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
