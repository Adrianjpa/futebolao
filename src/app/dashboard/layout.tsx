"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import {
    LayoutDashboard,
    Trophy,
    Users,
    LogOut,
    Menu,
    Calendar,
    Medal,
    Settings,
    User as UserIcon,
    History,
    Swords,
    MessageSquare,
    Shield,
    Activity
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/dashboard/UserNav";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { profile } = useAuth();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const isAdmin = profile?.funcao === "admin" || profile?.funcao === "moderator";

    const handleSignOut = async () => {
        await signOut(auth);
    };

    // Main Navigation (Everyone)
    const mainNavItems = [
        { href: "/dashboard", label: "Início", icon: LayoutDashboard },
        { href: "/dashboard/matches", label: "Partidas", icon: Swords }, // New Unified Page
        { href: "/dashboard/history", label: "Histórico", icon: History }, // New Unified Page
        { href: "/dashboard/ranking", label: "Ranking", icon: Medal },
        { href: "/dashboard/fame", label: "Hall da Fama", icon: Trophy },
        { href: "/dashboard/profile", label: "Meu Perfil", icon: UserIcon },
    ];

    // Admin Navigation
    const adminNavItems = [
        { href: "/admin/users", label: "Usuários", icon: Users },
        { href: "/admin/championships", label: "Campeonatos", icon: Trophy },
        { href: "/admin/messaging", label: "Mensagens", icon: MessageSquare },
        { href: "/admin/settings", label: "Configurações", icon: Settings },
        { href: "/admin/debug", label: "System Debug", icon: Activity },
    ];

    // Filter prediction link for admins if needed (optional, keeping it as it was in previous code if any)
    const filteredMainNav = mainNavItems.filter(item => {
        if (isAdmin && item.href === "/dashboard/predictions") {
            // Keep it unless user really doesn't want it. 
            // Logic: Admins *can* bet, but often use admin tools.
            // User said everything should be "normal". I'll keep it.
            return true;
        }
        return true;
    });

    return (
        <AuthGuard>
            <div className="h-screen w-full flex bg-background overflow-hidden">
                {/* Mobile Sidebar Overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white/40 backdrop-blur-xl border-r border-white/20 transform transition-transform duration-200 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0 shadow-2xl flex flex-col h-full
        `}>
                    <div className="h-16 flex items-center px-6 border-b border-white/10 shrink-0">
                        {/* Light Mode Logo (Colored/Dark) */}
                        <div className="dark:hidden h-14 w-auto">
                            <img src="/images/logo-full-dark.png" alt="FuteBolão" className="h-full w-auto object-contain" />
                        </div>
                        {/* Dark Mode Logo (White/Light) */}
                        <div className="hidden dark:block h-14 w-auto">
                            <img src="/images/logo-full-light.png" alt="FuteBolão" className="h-full w-auto object-contain" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {/* Main Menu */}
                        {filteredMainNav.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link key={item.href} href={item.href} onClick={() => setIsSidebarOpen(false)}>
                                    <Button
                                        variant={isActive ? "secondary" : "ghost"}
                                        className={`w-full justify-start transition-all duration-300 rounded-xl mb-1 ${isActive ? "bg-white/60 text-primary shadow-sm font-medium" : "hover:bg-white/30 hover:text-primary"}`}
                                    >
                                        <Icon className="mr-2 h-4 w-4" />
                                        {item.label}
                                    </Button>
                                </Link>
                            );
                        })}

                        {/* Admin Divider */}
                        {isAdmin && (
                            <>
                                <div className="my-4 border-t border-black/10 mx-2" />
                                <div className="px-3 mb-2 text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center">
                                    <Shield className="h-3 w-3 mr-1" /> Administração
                                </div>
                                {adminNavItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link key={item.href} href={item.href} onClick={() => setIsSidebarOpen(false)}>
                                            <Button
                                                variant={isActive ? "secondary" : "ghost"}
                                                className={`w-full justify-start transition-all duration-300 rounded-xl mb-1 ${isActive ? "bg-red-500/10 text-red-700 font-medium" : "hover:bg-red-500/5 hover:text-red-600 text-muted-foreground"}`}
                                            >
                                                <Icon className="mr-2 h-4 w-4" />
                                                {item.label}
                                            </Button>
                                        </Link>
                                    );
                                })}
                            </>
                        )}
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
                    <header className="h-16 border-b border-white/20 flex items-center justify-between px-4 md:px-6 bg-white/30 backdrop-blur-xl shrink-0 z-30 shadow-sm">
                        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(true)}>
                            <Menu className="h-6 w-6" />
                        </Button>
                        <div className="ml-auto flex items-center gap-4">
                            <ThemeToggle />
                            <UserNav />
                        </div>
                    </header>
                    <main className="flex-1 overflow-y-auto p-4 md:p-6">
                        {children}
                    </main>
                </div>
            </div>
        </AuthGuard>
    );
}
