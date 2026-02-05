"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { logout } from "../lib/store/authSlice";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

export default function SessionChecker() {
    const dispatch = useDispatch();
    const router = useRouter();

    useEffect(() => {
        const checkSession = () => {
            const tokenKeys = ["token", "authToken", "adminToken"];

            tokenKeys.forEach(key => {
                const token = localStorage.getItem(key);
                if (!token) return;

                try {
                    const payloadPart = token.split(".")[1];
                    if (!payloadPart) return;

                    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
                    const decodedJson = JSON.parse(atob(base64));
                    const currentTime = Date.now() / 1000;

                    if (decodedJson.exp < currentTime) {
                        console.warn(`Session for ${key} expired. Logging out...`);
                        localStorage.removeItem(key);
                        dispatch(logout());

                        if (key === "adminToken") {
                            if (window.location.pathname.startsWith("/admin")) {
                                toast.error("Admin session expired. Please login again.");
                                router.push("/management-login/");
                            }
                        } else {
                            // Fix: Don't redirect if already on login pages
                            const path = window.location.pathname;
                            if (!path.includes("/login") && !path.includes("/management-login") && !path.startsWith("/admin")) {
                                toast.error("Session expired. Please login again.");
                                router.push("/login");
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Invalid token format for ${key}`, error);
                    localStorage.removeItem(key);
                    dispatch(logout());
                }
            });
        };

        checkSession();
        const interval = setInterval(checkSession, 30000); // Check every 30 seconds

        // Global Fetch Interceptor to catch 401/403
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const response = await originalFetch(...args);

            if (response.status === 401 || response.status === 403) {
                const url = args[0].toString();
                // Avoid intercepting login/auth requests themselves if they fail
                if (!url.includes("/login") && !url.includes("/management-login")) {
                    console.error("Unauthorized request detected. Logging out...");
                    localStorage.removeItem("token");
                    localStorage.removeItem("authToken");
                    localStorage.removeItem("adminToken");
                    dispatch(logout());

                    if (window.location.pathname.startsWith("/admin")) {
                        router.push("/management-login/");
                    } else {
                        router.push("/login");
                    }
                }
            }
            return response;
        };

        const handleStorageChange = (e) => {
            if (["token", "authToken", "adminToken"].includes(e.key) && !e.newValue) {
                dispatch(logout());
            }
        };
        window.addEventListener("storage", handleStorageChange);

        return () => {
            clearInterval(interval);
            window.removeEventListener("storage", handleStorageChange);
        };
    }, [dispatch, router]);

    return null; // This component renders nothing
}
