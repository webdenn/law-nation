"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminSidebar from "../../../components/AdminSidebar";

export default function BannerManagementPage() {
    const router = useRouter();
    const nextPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;
    const nextPublicBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [title, setTitle] = useState("");
    const [file, setFile] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("adminToken");
        if (!token) {
            router.push("/management-login/");
        } else {
            fetchBanners();
        }
    }, [router]);

    const fetchBanners = async () => {
        try {
            const res = await fetch(`${nextPublicApiUrl}/banners`);
            if (res.ok) {
                const data = await res.json();
                setBanners(data.banners || []);
            }
        } catch (error) {
            console.error("Fetch Banners Error:", error);
            toast.error("Failed to load banners");
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return toast.warning("Please select an image");

        setUploading(true);
        const formData = new FormData();
        formData.append("image", file);
        formData.append("title", title);

        try {
            const token = localStorage.getItem("adminToken");
            const res = await fetch(`${nextPublicApiUrl}/banners`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await res.json();
            if (res.ok) {
                toast.success("Banner uploaded successfully!");
                setFile(null);
                setTitle("");
                fetchBanners();
            } else {
                toast.error(data.error || "Upload failed");
            }
        } catch (error) {
            console.error("Upload Error:", error);
            toast.error("Server error during upload");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this banner?")) return;

        try {
            const token = localStorage.getItem("adminToken");
            const res = await fetch(`${nextPublicApiUrl}/banners/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (res.ok) {
                toast.success("Banner deleted!");
                fetchBanners();
            } else {
                toast.error("Failed to delete banner");
            }
        } catch (error) {
            console.error("Delete Error:", error);
            toast.error("Server error during delete");
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row font-sans">
            <ToastContainer position="top-right" autoClose={3000} theme="colored" />

            {/* 🔴 SIDEBAR */}
            <AdminSidebar
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
            />

            <main className="flex-1 p-6 md:p-12 overflow-y-auto h-screen">
                {/* Mobile Header Toggle */}
                <div className="md:hidden flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold uppercase">Banner Management</h1>
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="text-red-700 font-bold border border-red-700 px-3 py-1 rounded"
                    >
                        Menu
                    </button>
                </div>

                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-tight">Banner Management</h2>
                    <p className="text-gray-500 text-sm mt-1">Dashboard / Banners</p>
                </div>

                {/* Upload Section */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-10">
                    <h3 className="text-lg font-bold text-black mb-4 uppercase">Upload New Banner</h3>
                    <form onSubmit={handleUpload} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full relative">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Banner Title (Optional)</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-red-600"
                                placeholder="e.g. Winter Conference"
                            />
                        </div>
                        <div className="flex-1 w-full relative">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Image File</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="w-full border border-gray-300 rounded p-1.5 text-sm outline-none focus:border-red-600 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={uploading}
                            className="bg-black text-white px-6 py-2.5 rounded font-bold uppercase text-xs hover:bg-gray-800 transition disabled:opacity-50 h-[42px]"
                        >
                            {uploading ? "Uploading..." : "Upload Banner"}
                        </button>
                    </form>
                </div>

                {/* List Section */}
                <div>
                    <h3 className="text-lg font-bold text-black mb-4 uppercase">Active Banners</h3>
                    {loading ? (
                        <p>Loading banners...</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {banners.map((banner) => (
                                <div key={banner.id} className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition">
                                    <div className="aspect-video bg-gray-100 relative">
                                        <img
                                            src={banner.imageUrl.startsWith("http") ? banner.imageUrl : `${nextPublicBaseUrl}${banner.imageUrl}`}
                                            alt={banner.title}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleDelete(banner.id)}
                                                className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold uppercase hover:bg-red-700"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <p className="font-bold text-sm text-gray-800 truncate">{banner.title || "Untitled"}</p>
                                        <p className="text-[10px] text-gray-500">{new Date(banner.createdAt).toLocaleDateString()}</p>
                                        {/* Debug URL */}
                                        <p className="text-[9px] text-gray-400 truncate mt-1" title={banner.imageUrl}>
                                            {banner.imageUrl}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {banners.length === 0 && (
                                <p className="text-gray-500 text-sm col-span-full">No banners uploaded yet.</p>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
