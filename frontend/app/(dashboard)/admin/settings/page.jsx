"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminSidebar from "../../../components/AdminSidebar";

export default function FooterSettingsPage() {
    const router = useRouter();
    const nextPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;

    const [aboutText, setAboutText] = useState("");
    const [researchersText, setResearchersText] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
<<<<<<< Updated upstream
            const res = await fetch(`${nextPublicApiUrl}/settings/footer`);
=======
            const res = await fetch(`${NEXT_PUBLIC_BASE_URL}/settings/footer`);
>>>>>>> Stashed changes
            const data = await res.json();
            if (data.success && data.settings) {
                setAboutText(data.settings.aboutText || "");
                setResearchersText(data.settings.researchersText || "");
            }
        } catch (error) {
            console.error("Fetch Settings Error:", error);
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = localStorage.getItem("adminToken");
<<<<<<< Updated upstream
            const res = await fetch(`${nextPublicApiUrl}/settings/footer`, {
=======
            const res = await fetch(`${NEXT_PUBLIC_BASE_URL}/settings/footer`, {
>>>>>>> Stashed changes
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ aboutText, researchersText }),
            });

            const data = await res.json();
            if (res.ok) {
                toast.success("Footer settings updated successfully!");
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

    return (
        <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row font-sans">
            <ToastContainer position="top-right" autoClose={3000} theme="colored" />

            <AdminSidebar
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
            />

            <main className="flex-1 p-6 md:p-12 overflow-y-auto h-screen">
                {/* Mobile Header Toggle */}
                <div className="md:hidden flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold uppercase">Site Settings</h1>
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="text-red-700 font-bold border border-red-700 px-3 py-1 rounded"
                    >
                        Menu
                    </button>
                </div>

                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-tight">Footer Content</h2>
                    <p className="text-gray-500 text-sm mt-1">Dashboard / Settings / Footer</p>
                </div>

                {loading ? (
                    <p>Loading settings...</p>
                ) : (
                    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm max-w-3xl">
                        <form onSubmit={handleSave} className="space-y-6">

                            {/* About Text */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase">
                                    About Us / Mission Text
                                </label>
                                <textarea
                                    className="w-full border border-gray-300 rounded p-3 text-sm outline-none focus:border-red-600 min-h-[120px]"
                                    value={aboutText}
                                    onChange={(e) => setAboutText(e.target.value)}
                                    placeholder="Enter the main description text for the footer..."
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Keep it concise (around 2-3 sentences).
                                </p>
                            </div>

                            {/* Researchers Text */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase">
                                    "For Researchers" Text
                                </label>
                                <textarea
                                    className="w-full border border-gray-300 rounded p-3 text-sm outline-none focus:border-red-600 min-h-[100px]"
                                    value={researchersText}
                                    onChange={(e) => setResearchersText(e.target.value)}
                                    placeholder="Enter text for the researchers section..."
                                />
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-black text-white px-8 py-3 rounded font-bold uppercase text-sm hover:bg-gray-800 transition disabled:opacity-50"
                                >
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </main>
        </div>
    );
}
