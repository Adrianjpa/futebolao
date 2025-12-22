"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Trash2, Search, Filter, MoreVertical, Shield, ShieldAlert, UserCheck, Key, Chrome, Mail, Check } from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface User {
    id: string;
    nome?: string;
    displayName?: string;
    email: string;
    funcao: "admin" | "moderator" | "usuario";
    status: "ativo" | "bloqueado" | "pendente" | "inativo";
    totalPoints: number;
    fotoPerfil?: string;
    photoURL?: string;
    createdAt?: any;
    isGhost?: boolean;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    // Delete State
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        let result = users;

        // Filter by Status
        if (statusFilter !== "all") {
            result = result.filter(u => u.status === statusFilter);
        }

        // Filter by Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(u =>
                (u.nome || u.displayName || "").toLowerCase().includes(lowerTerm) ||
                (u.email || "").toLowerCase().includes(lowerTerm)
            );
        }

        // Sort by Name
        result.sort((a, b) => {
            const nameA = a.nome || a.displayName || "";
            const nameB = b.nome || b.displayName || "";
            return nameA.localeCompare(nameB);
        });

        setFilteredUsers(result);
    }, [users, searchTerm, statusFilter]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // Fetch ALL users (no orderBy to avoid missing index issues or missing fields)
            const snap = await getDocs(collection(db, "users"));
            const data: User[] = [];
            snap.forEach(doc => {
                const d = doc.data();
                data.push({
                    id: doc.id,
                    ...d,
                    // Normalize data
                    nome: d.nome || d.displayName || "Sem Nome",
                    status: d.status || "pendente",
                    funcao: d.funcao || "usuario",
                    createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : (d.createdAt ? new Date(d.createdAt) : undefined)
                } as User);
            });
            setUsers(data);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            await updateDoc(doc(db, "users", userId), { funcao: newRole });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, funcao: newRole as any } : u));
        } catch (error) {
            console.error("Error updating role:", error);
        }
    };

    const handleStatusChange = async (userId: string, newStatus: string) => {
        try {
            await updateDoc(doc(db, "users", userId), { status: newStatus });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus as any } : u));
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const toggleUser = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const toggleAll = () => {
        if (selectedUsers.length === filteredUsers.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(filteredUsers.map(u => u.id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedUsers.length === 0) return;
        setIsDeleting(true);
        try {
            const deletePromises = selectedUsers.map(id => deleteDoc(doc(db, "users", id)));
            await Promise.all(deletePromises);

            setUsers(prev => prev.filter(u => !selectedUsers.includes(u.id)));
            setSelectedUsers([]);
            setIsDeleteOpen(false);
        } catch (error) {
            console.error("Error deleting users:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gerenciar Usuários</h1>
                    <p className="text-muted-foreground">Visualize e gerencie todos os membros da plataforma.</p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedUsers.length > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setIsDeleteOpen(true)}
                            className="mr-2 animate-in fade-in"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir Selecionados ({selectedUsers.length})
                        </Button>
                    )}
                    <Badge variant="secondary" className="px-4 py-1.5 text-sm">
                        Total: {users.length}
                    </Badge>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Membros</CardTitle>
                    <CardDescription>
                        Lista completa de usuários registrados.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome ou email..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <Filter className="mr-2 h-4 w-4" />
                                <SelectValue placeholder="Filtrar Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Status</SelectItem>
                                <SelectItem value="ativo">Ativo</SelectItem>
                                <SelectItem value="pendente">Pendente</SelectItem>
                                <SelectItem value="bloqueado">Bloqueado</SelectItem>
                                <SelectItem value="inativo">Inativo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                                            onCheckedChange={toggleAll}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[300px]">Usuário</TableHead>
                                    <TableHead>Cadastro</TableHead>
                                    <TableHead>Função</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            Nenhum usuário encontrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <TableRow key={user.id} data-state={selectedUsers.includes(user.id) ? "selected" : undefined}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedUsers.includes(user.id)}
                                                    onCheckedChange={() => toggleUser(user.id)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Link href={`/dashboard/profile/${user.id}`}>
                                                        <Avatar className="cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                                                            <AvatarImage src={user.fotoPerfil || user.photoURL} />
                                                            <AvatarFallback>{(user.nome || user.displayName || "U").substring(0, 2).toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                    </Link>
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <Link href={`/dashboard/profile/${user.id}`} className="font-bold hover:underline hover:text-primary transition-colors">
                                                                {user.nome || user.displayName}
                                                            </Link>
                                                            {/* User Provider Icons */}
                                                            {/* Assuming default is Email/Key, if provider logic existed we'd split it. Using fixed icons for design as requested. */}
                                                            <Key className="h-3 w-3 text-muted-foreground" />
                                                            {/* <Chrome className="h-3 w-3 text-blue-500" />  Example for Google */}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <span className="hidden sm:inline">{user.email}</span>
                                                            <Mail className="h-3 w-3 sm:hidden" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {user.createdAt ? format(user.createdAt, "dd/MM/yyyy") : "-"}
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    defaultValue={user.funcao}
                                                    onValueChange={(v) => handleRoleChange(user.id, v)}
                                                >
                                                    <SelectTrigger className="h-8 w-[130px] text-xs">
                                                        <div className="flex items-center gap-2">
                                                            {user.funcao === "admin" && <ShieldAlert className="h-3 w-3 text-red-500" />}
                                                            {user.funcao === "moderator" && <Shield className="h-3 w-3 text-blue-500" />}
                                                            {user.funcao === "usuario" && <UserCheck className="h-3 w-3 text-green-500" />}
                                                            <SelectValue />
                                                        </div>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="usuario">Usuário</SelectItem>
                                                        <SelectItem value="moderator">Moderador</SelectItem>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    defaultValue={user.status}
                                                    onValueChange={(v) => handleStatusChange(user.id, v)}
                                                >
                                                    <SelectTrigger className={`h-8 w-[110px] text-xs border-none font-medium transition-colors ${user.status === 'ativo' ? 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20' :
                                                        user.status === 'bloqueado' ? 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20' :
                                                            user.status === 'inativo' ? 'bg-gray-500/10 text-gray-600 dark:text-gray-400 hover:bg-gray-500/20' :
                                                                'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20'
                                                        }`}>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`h-1.5 w-1.5 rounded-full ${user.status === 'ativo' ? 'bg-green-500' :
                                                                    user.status === 'bloqueado' ? 'bg-red-500' :
                                                                        user.status === 'inativo' ? 'bg-gray-500' :
                                                                            'bg-yellow-500'
                                                                }`} />
                                                            <SelectValue />
                                                        </div>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ativo">Ativo</SelectItem>
                                                        <SelectItem value="pendente">Pendente</SelectItem>
                                                        <SelectItem value="bloqueado">Bloqueado</SelectItem>
                                                        <SelectItem value="inativo">Inativo</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir Usuários</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir <strong>{selectedUsers.length}</strong> usuário(s)? Essa ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleBulkDelete} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Excluir"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
