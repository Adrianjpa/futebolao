"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { LogOut, User as UserIcon, Settings, Circle, ChevronDown } from "lucide-react";
import Link from "next/link";
import { doc, updateDoc } from "firebase/firestore";
import { useState } from "react";

export function UserNav() {
    const { profile, user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    // Default presence logic (could be improved with real-time sync)
    const [currentStatus, setCurrentStatus] = useState<string>(profile?.presence || "Online");

    const handleSignOut = async () => {
        await signOut(auth);
    };

    const handleStatusChange = async (status: string) => {
        setCurrentStatus(status);
        if (user) {
            try {
                const userRef = doc(db, "users", user.uid);
                await updateDoc(userRef, { presence: status });
            } catch (e) {
                console.error("Error updating status status", e);
            }
        }
    };

    const statusColors: Record<string, string> = {
        "Online": "bg-green-500",
        "Ocupado": "bg-red-500",
        "Não Incomode": "bg-red-600",
        "Invisível": "bg-slate-400",
        "Offline": "bg-slate-500"
    };

    return (
        <DropdownMenu onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-auto px-2 rounded-full flex items-center gap-2 hover:bg-accent/50">
                    <div className="flex flex-col items-end hidden md:flex">
                        <span className="text-sm font-medium leading-none">{profile?.nickname || profile?.nome}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className={`h-1.5 w-1.5 rounded-full ${statusColors[currentStatus] || "bg-green-500"}`}></span>
                            {currentStatus}
                        </span>
                    </div>
                    <Avatar className="h-9 w-9 border border-border">
                        <AvatarImage src={profile?.fotoPerfil} alt={profile?.nome} />
                        <AvatarFallback>{(profile?.nickname || profile?.nome || "U").substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{profile?.nome}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {profile?.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/profile" className="w-full cursor-pointer">
                            <UserIcon className="mr-2 h-4 w-4" />
                            <span>Meu Perfil</span>
                        </Link>
                    </DropdownMenuItem>
                    {/* Status Submenu */}
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Circle className="mr-2 h-4 w-4 fill-current text-green-500" />
                            <span>Status</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => handleStatusChange("Online")}>
                                <div className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                                <span>Online</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange("Ocupado")}>
                                <div className="h-2 w-2 rounded-full bg-red-500 mr-2" />
                                <span>Ocupado</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange("Não Incomode")}>
                                <div className="h-2 w-2 rounded-full bg-red-600 mr-2" />
                                <span>Não Incomode</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange("Invisível")}>
                                <div className="h-2 w-2 rounded-full bg-slate-400 mr-2" />
                                <span>Invisível</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange("Offline")}>
                                <div className="h-2 w-2 rounded-full bg-slate-500 mr-2" />
                                <span>Offline</span>
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                    <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
