"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import {
    LayoutDashboard,
    Users,
    Trophy,
    Swords,
    History,
    TrendingUp,
    MessageSquare,
    Settings,
    LogOut,
    Menu,
    ArrowLeft,
    Activity
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { profile } = useAuth();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleSignOut = async () => {
        await signOut(auth);
    };

    const navItems = [
        { href: "/admin", label: "Visão Geral", icon: LayoutDashboard },
        { href: "/admin/users", label: "Usuários", icon: Users },
        { href: "/admin/championships", label: "Campeonatos", icon: Trophy },
        { href: "/admin/matches", label: "Partidas", icon: Swords },
        { href: "/admin/history", label: "Histórico", icon: History },

        { href: "/admin/messaging", label: "Mensagens", icon: MessageSquare },
        { href: "/admin/settings", label: "Configurações", icon: Settings },
        { href: "/admin/debug", label: "Debug", icon: Activity },
    ];

    return (
        <AuthGuard requiredRole="admin">
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
                    <div className="h-16 flex items-center px-6 border-b border-white/10 bg-red-500/10 backdrop-blur-md shrink-0">
                        <Settings className="h-6 w-6 text-red-600 mr-2" />
                        <span className="font-bold text-lg text-red-600">Área Admin</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        <Link href="/dashboard" onClick={() => setIsSidebarOpen(false)}>
                            <Button variant="outline" className="w-full justify-start mb-4 border-dashed border-gray-300 hover:bg-white/50 hover:border-gray-400 transition-all">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                <span className="truncate">Voltar ao App</span>
                            </Button>
                        </Link>

                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link key={item.href} href={item.href} onClick={() => setIsSidebarOpen(false)}>
                                    <Button
                                        variant={isActive ? "secondary" : "ghost"}
                                        className={`w-full justify-start transition-all duration-300 rounded-xl ${isActive ? "bg-red-500/10 text-red-700 shadow-sm font-medium border border-red-200/50" : "hover:bg-white/30 hover:text-red-600"}`}
                                    >
                                        <Icon className="mr-2 h-4 w-4 shrink-0" />
                                        <span className="truncate">{item.label}</span>
                                    </Button>
                                </Link>
                            );
                        })}
                    </div>

                    <div className="p-4 border-t border-white/10 bg-white/10 backdrop-blur-md shrink-0">
                        <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl" onClick={handleSignOut}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Sair
                        </Button>
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
                            <span className="text-sm font-medium text-gray-500 hidden sm:inline-block">
                                Logado como Admin: <span className="text-gray-900 font-semibold">{profile?.nickname || profile?.nome}</span>
                            </span>
                        </div>
                    </header>
                    <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
                        {children}
                    </main>
                </div>
            </div>
        </AuthGuard>
    );
}
