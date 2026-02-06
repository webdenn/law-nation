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
        // 1. Periodic Token Expiry Check
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
                            // Avoid redirect loop if already on management-login
                            if (!window.location.pathname.includes("/management-login")) {
                                toast.error("Admin session expired. Please login again.");
                                router.push("/management-login/");
                            }
                        } else {
                            const path = window.location.pathname;
                            // Update: Use includes to handle base paths like /law/admin
                            if (!path.includes("/login") && !path.includes("/management-login") && !path.includes("/admin")) {
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

        // 2. Global Fetch Interceptor to catch 401s
        const originalFetch = window.fetch;

        // Prevent double wrapping
        if (!originalFetch.__isInterceptor) {
            window.fetch = async (...args) => {
                let url = args[0];
                if (url instanceof Request) {
                    url = url.url;
                }
                url = url ? url.toString() : "";

                try {
                    const response = await originalFetch(...args);

                    // Only intercept 401 (Unauthorized). 403 (Forbidden) should just show an error, not logout.
                    if (response.status === 401) {
                        // 1. Check if we are already on a login page
                        const isLoginPage = typeof window !== 'undefined' && (
                            window.location.pathname.includes('/login') ||
                            window.location.pathname.includes('/management-login')
                        );

                        if (isLoginPage) {
                            // If we are on login page, 401 is expected (invalid credentials)
                            // DO NOT LOGOUT, DO NOT REDIRECT
                            return response;
                        }

                        // 2. Check if the request itself was an auth request (double check)
                        const isAuthRequest = url.includes("/auth/login") ||
                            url.includes("/auth/admin-login") ||
                            url.includes("/management-login");

                        if (!isAuthRequest) {
                            console.error("Unauthorized request detected. Logging out...");

                            // Check which token is relevant
                            // Update: Use includes to handle /law/admin prefix
                            const isAdmin = window.location.pathname.includes("/admin");

                            localStorage.removeItem("token");
                            localStorage.removeItem("authToken");
                            localStorage.removeItem("adminToken");
                            dispatch(logout());

                            if (isAdmin) {
                                router.push("/management-login/");
                            } else {
                                router.push("/login");
                            }
                        }
                    }
                    return response;
                } catch (error) {
                    throw error;
                }
            };
            window.fetch.__isInterceptor = true;
        }

        const handleStorageChange = (e) => {
            if (["token", "authToken", "adminToken"].includes(e.key) && !e.newValue) {
                dispatch(logout());
            }
        };
        window.addEventListener("storage", handleStorageChange);

        return () => {
            clearInterval(interval);
            window.removeEventListener("storage", handleStorageChange);
            // Restore original fetch if we modified it
            if (window.fetch.__isInterceptor) {
                window.fetch = originalFetch;
            }
        };
    }, [dispatch, router]);

    return null;
}
