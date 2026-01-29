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

            if (!token) return;

            try {
                // Decode payload safely
                const payloadBase64 = token.split(".")[1];
                if (!payloadBase64) return;

                const decodedJson = JSON.parse(atob(payloadBase64));
                const currentTime = Date.now() / 1000;

                // Check if expired
                if (decodedJson.exp < currentTime) {
                    console.warn("Session expired. Logging out...");
                    dispatch(logout());
                    router.push("/login");
                    toast.error("Session expired. Please login again.");
                }
            } catch (error) {
                // If token is malformed, log out
                console.error("Invalid token format", error);
                dispatch(logout());
            }
        };

        // Run immediately on mount
        checkSession();

        // Check every 1 minute (60000ms)
        const interval = setInterval(checkSession, 60000);

        return () => clearInterval(interval);
    }, [dispatch, router]);

    return null; // This component renders nothing
}
