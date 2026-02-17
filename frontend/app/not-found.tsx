"use client";

import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-24">
            <div className="max-w-md w-full text-center">
                {/* Icon */}
                <div className="mx-auto w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-8">
                    <FileQuestion className="w-12 h-12 text-red-600" />
                </div>

                {/* Text Content */}
                <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                    Page Not Found
                </h1>
                <p className="text-lg text-slate-600 mb-10 leading-relaxed">
                    The page you are looking for doesn't exist or has been moved.
                    Please check the URL or return to the homepage.
                </p>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20"
                    >
                        <ArrowLeft size={20} />
                        Go Back
                    </button>
                </div>

                <div className="mt-12 text-sm text-slate-400">
                    Error Code: 404
                </div>
            </div>
        </div>
    );
}
