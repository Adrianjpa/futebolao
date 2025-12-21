"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Trash2, Search, Filter, MoreVertical, Shield, ShieldAlert, UserCheck } from "lucide-react";
import { format } from "date-fns";
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

    // Delete State
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
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

    const handleDelete = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, "users", userToDelete.id));
            setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
            setIsDeleteOpen(false);
        } catch (error) {
            console.error(error);
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
                                    <TableHead className="w-[300px]">Usuário</TableHead>
                                    <TableHead>Cadastro</TableHead>
                                    <TableHead>Função</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
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
                                        <TableRow key={user.id}>


                                            // ... (existing code)

                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Link href={`/dashboard/profile/${user.id}`}>
                                                        <Avatar className="cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                                                            <AvatarImage src={user.fotoPerfil || user.photoURL} />
                                                            <AvatarFallback>{(user.nome || user.displayName || "U").substring(0, 2).toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                    </Link>
                                                    <div className="flex flex-col">
                                                        <Link href={`/dashboard/profile/${user.id}`} className="font-medium hover:underline hover:text-primary">
                                                            {user.nome || user.displayName}
                                                        </Link>
                                                        <span className="text-xs text-muted-foreground">{user.email}</span>
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
                                                    <SelectTrigger className="h-8 w-[110px] text-xs">
                                                        <SelectValue />
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
                                                    <SelectTrigger className={`h-8 w-[110px] text-xs border-none font-medium ${user.status === 'ativo' ? 'bg-green-100/50 text-green-700 hover:bg-green-100' :
                                                        user.status === 'bloqueado' ? 'bg-red-100/50 text-red-700 hover:bg-red-100' :
                                                            user.status === 'inativo' ? 'bg-gray-100/50 text-gray-700 hover:bg-gray-100' :
                                                                'bg-yellow-100/50 text-yellow-700 hover:bg-yellow-100'
                                                        }`}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ativo" className="text-green-600">Ativo</SelectItem>
                                                        <SelectItem value="pendente" className="text-yellow-600">Pendente</SelectItem>
                                                        <SelectItem value="bloqueado" className="text-red-600">Bloqueado</SelectItem>
                                                        <SelectItem value="inativo" className="text-gray-600">Inativo</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            className="text-red-600 focus:text-red-600"
                                                            onClick={() => {
                                                                setUserToDelete(user);
                                                                setIsDeleteOpen(true);
                                                            }}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Excluir Usuário
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
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
                        <DialogTitle>Excluir Usuário</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir <strong>{userToDelete?.nome || userToDelete?.email}</strong>? Essa ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Excluir"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
