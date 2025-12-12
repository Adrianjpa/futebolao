"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
    children: React.ReactNode;
    requiredRole?: "admin" | "moderator" | "usuario";
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/login");
            } else if (profile) {
                // Check status
                if (profile.status === "bloqueado") {
                    // Redirect to blocked page or show message (for now login)
                    // router.push("/blocked"); 
                    // For MVP, just alert or stay.
                } else if (profile.status === "pendente" && window.location.pathname !== "/pending") {
                    router.push("/pending");
                }

                // Check role
                if (requiredRole) {
                    if (requiredRole === "admin" && profile.funcao !== "admin") {
                        router.push("/dashboard"); // Redirect to user dashboard if trying to access admin
                    }
                }
            }
        }
    }, [user, profile, loading, router, requiredRole]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect
    }

    return <>{children}</>;
}
