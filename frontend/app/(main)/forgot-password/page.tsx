"use client";
import React, { useState, ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import ReCAPTCHA from "react-google-recaptcha";

export default function ForgotPassword() {
    const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

    const [email, setEmail] = useState("");
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!captchaToken) {
            toast.error("Please verify you are not a robot!");
            return;
        }
        setIsLoading(true);

        try {
            const response = await fetch(`${NEXT_PUBLIC_BASE_URL}/api/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, recaptchaToken: captchaToken }),
            });

            const data = await response.json();

            if (response.ok) {
                setIsSubmitted(true);
                toast.success("Password reset instructions sent!");
            } else {
                toast.error(data.message || data.error || "Something went wrong.");
            }
        } catch (error) {
            console.warn("Forgot Password Error:", error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen flex overflow-hidden">
            {/* Left Side */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-600 via-red-700 to-red-800 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div
                        className="absolute top-0 left-0 w-full h-full"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                        }}
                    ></div>
                </div>
                <div className="absolute top-10 right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-10 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex flex-col justify-center items-start px-10 xl:px-14 text-white">
                    <div>
                        <h1 className="text-4xl xl:text-5xl font-bold mb-3 leading-tight">
                            Forgot Password?
                        </h1>
                        <div className="w-16 h-1 bg-white mb-4"></div>
                        <p className="text-lg xl:text-xl text-white/90 font-light leading-relaxed max-w-md">
                            Don't worry! It happens. Please enter the email address associated with your account.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side */}
            <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-10 xl:px-12 py-6 overflow-y-auto">
                <div className="w-full max-w-md">
                    <div className="lg:hidden text-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">
                            Reset Password
                        </h1>
                        <p className="text-sm text-gray-600">Recover your account access</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5 sm:p-6">
                        {!isSubmitted ? (
                            <>
                                <div className="hidden lg:block mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Reset Password</h2>
                                    <p className="text-sm text-gray-600">
                                        We will send you instructions to reset your password.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <svg
                                                    className="h-5 w-5 text-gray-400"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                                    />
                                                </svg>
                                            </div>
                                            <input
                                                type="email"
                                                name="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="Enter your email"
                                                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all text-sm bg-gray-50"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <ReCAPTCHA
                                            sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
                                            onChange={(token) => setCaptchaToken(token)}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className={`w-full px-6 py-2.5 bg-red-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 transition-all duration-200 transform hover:scale-[1.02] ${isLoading ? "opacity-70 cursor-not-allowed" : ""
                                            }`}
                                    >
                                        {isLoading ? "Sending..." : "Send Reset Link"}
                                    </button>
                                </form>
                            </>
                        ) : (
                            <div className="text-center py-6">
                                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                                    <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Check your email</h3>
                                <p className="text-gray-600 mb-6">
                                    If an account exists for {email}, we have sent a password reset link to it.
                                    Please check your inbox (and spam folder).
                                </p>
                                <button
                                    onClick={() => { setIsSubmitted(false); setEmail(""); setCaptchaToken(null); }}
                                    className="text-red-600 hover:text-red-700 font-medium text-sm"
                                >
                                    Try another email
                                </button>
                            </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                            <Link
                                href="/login"
                                className="text-gray-600 hover:text-gray-800 font-medium text-sm flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" dev-stroke="currentColor" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
