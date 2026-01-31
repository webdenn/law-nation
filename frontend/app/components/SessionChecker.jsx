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
        // Function to check token validity
        const checkSession = () => {
            const token = localStorage.getItem("token");

            if (!token) {
                // Optional: consistent state sync if token manually cleared
                // dispatch(logout()); 
                return;
            }

            try {
                // Decode payload safely (Handle Base64Url)
                const payloadPart = token.split(".")[1];
                if (!payloadPart) return;

                const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
                const decodedJson = JSON.parse(atob(base64));
                const currentTime = Date.now() / 1000;

                // Check if expired
                if (decodedJson.exp < currentTime) {
                    console.warn("Session expired. Logging out...");
                    dispatch(logout());

                    // Prevent toast loop: Only show if not already on login page
                    if (window.location.pathname !== "/login") {
                        toast.error("Session expired. Please login again.");
                        router.push("/login");
                    }
                }
            } catch (error) {
                console.error("Invalid token format", error);
                dispatch(logout());
            }
        };

        // Run immediately on mount
        checkSession();

        // Check every 1 minute (60000ms)
        const interval = setInterval(checkSession, 60000);

        // Sync across tabs: If token removed elsewhere, logout here
        const handleStorageChange = (e) => {
            if (e.key === "token" && !e.newValue) {
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
