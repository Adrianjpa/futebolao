"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Edit, Trash2, AlertTriangle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface User {
    id: string;
    nome: string;
    email: string;
    funcao: "admin" | "moderator" | "usuario";
    status: "ativo" | "bloqueado" | "pendente";
    totalPoints: number;
    fotoPerfil?: string;
    createdAt?: Date;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit Points State (Kept in logic but hidden from UI as requested)
    const [editingPointsUser, setEditingPointsUser] = useState<User | null>(null);
    const [newPoints, setNewPoints] = useState("");
    const [isEditPointsOpen, setIsEditPointsOpen] = useState(false);
    const [savingPoints, setSavingPoints] = useState(false);

    // Delete User State
    const [deletingUser, setDeletingUser] = useState<User | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "users"), orderBy("nome"));
            const snap = await getDocs(q);
            const data: User[] = [];
            snap.forEach(doc => {
                const userData = doc.data();
                // Ensure createdAt is handled safely (it might be a Timestamp or string or undefined)
                let createdAt = userData.createdAt;
                if (createdAt && typeof createdAt.toDate === 'function') {
                    createdAt = createdAt.toDate();
                } else if (createdAt && typeof createdAt === 'string') {
                    createdAt = new Date(createdAt);
                }

                data.push({
                    id: doc.id,
                    ...userData,
                    createdAt: createdAt
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
            setUsers(users.map(u => u.id === userId ? { ...u, funcao: newRole as any } : u));
        } catch (error) {
            console.error("Error updating role:", error);
            alert("Erro ao atualizar função.");
        }
    };

    const handleStatusChange = async (userId: string, newStatus: string) => {
        try {
            await updateDoc(doc(db, "users", userId), { status: newStatus });
            setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus as any } : u));
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Erro ao atualizar status.");
        }
    };

    // Logic kept for future use if needed, but not shown in UI
    const openEditPoints = (user: User) => {
        setEditingPointsUser(user);
        setNewPoints(user.totalPoints?.toString() || "0");
        setIsEditPointsOpen(true);
    };

    const handleSavePoints = async () => {
        if (!editingPointsUser) return;
        setSavingPoints(true);
        try {
            const points = parseInt(newPoints);
            if (isNaN(points)) throw new Error("Pontuação inválida");

            await updateDoc(doc(db, "users", editingPointsUser.id), { totalPoints: points });
            setUsers(users.map(u => u.id === editingPointsUser.id ? { ...u, totalPoints: points } : u));
            setIsEditPointsOpen(false);
        } catch (error) {
            console.error("Error updating points:", error);
            alert("Erro ao atualizar pontos.");
        } finally {
            setSavingPoints(false);
        }
    };

    const openDeleteUser = (user: User) => {
        setDeletingUser(user);
        setIsDeleteOpen(true);
    };

    const handleDeleteUser = async () => {
        if (!deletingUser) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, "users", deletingUser.id));
            setUsers(users.filter(u => u.id !== deletingUser.id));
            setIsDeleteOpen(false);
        } catch (error) {
            console.error("Error deleting user:", error);
            alert("Erro ao excluir usuário.");
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
    }

    return (
        <div className="space-y-8 p-6 animate-in fade-in duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                        Usuários
                    </h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Gerencie os participantes da plataforma.
                    </p>
                </div>
                <Badge variant="outline" className="px-4 py-1 text-sm backdrop-blur-md bg-white/30 border-white/20 shadow-sm">
                    Total: {users.length}
                </Badge>
            </div>

            <Card className="border-0 shadow-xl bg-white/40 backdrop-blur-xl ring-1 ring-black/5 overflow-hidden rounded-2xl">
                <CardHeader className="border-b border-white/10 bg-white/20 pb-4">
                    <CardTitle className="text-xl font-medium text-gray-800">Lista de Membros</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-gray-50/50">
                            <TableRow className="hover:bg-transparent border-b border-gray-100">
                                <TableHead className="pl-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Participante</TableHead>
                                <TableHead className="py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Cadastro</TableHead>
                                <TableHead className="py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Função</TableHead>
                                <TableHead className="py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</TableHead>
                                <TableHead className="pr-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id} className="group hover:bg-white/60 transition-colors duration-200 border-b border-gray-50 last:border-0">
                                    <TableCell className="pl-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-10 w-10 ring-2 ring-white shadow-md transition-transform group-hover:scale-105">
                                                <AvatarImage src={user.fotoPerfil} />
                                                <AvatarFallback className="bg-gradient-to-br from-blue-100 to-purple-100 text-blue-700 font-bold">
                                                    {user.nome?.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-gray-900 text-base">{user.nome}</span>
                                                <span className="text-sm text-gray-500 font-light">{user.email}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            {user.createdAt ? format(user.createdAt, "dd/MM/yyyy") : "-"}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <Select
                                            value={user.funcao}
                                            onValueChange={(val) => handleRoleChange(user.id, val)}
                                        >
                                            <SelectTrigger className="w-[140px] h-9 bg-white/50 border-gray-200 focus:ring-2 focus:ring-blue-500/20 rounded-lg shadow-sm transition-all hover:bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-gray-100 shadow-lg backdrop-blur-xl bg-white/90">
                                                <SelectItem value="usuario">Usuário</SelectItem>
                                                <SelectItem value="moderator">Moderador</SelectItem>
                                                <SelectItem value="admin">Admin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <Select
                                            value={user.status}
                                            onValueChange={(val) => handleStatusChange(user.id, val)}
                                        >
                                            <SelectTrigger className={`w-[140px] h-9 bg-white/50 border-gray-200 focus:ring-2 focus:ring-blue-500/20 rounded-lg shadow-sm transition-all hover:bg-white ${user.status === 'ativo' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}`}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-gray-100 shadow-lg backdrop-blur-xl bg-white/90">
                                                <SelectItem value="ativo" className="text-green-600">Ativo</SelectItem>
                                                <SelectItem value="bloqueado" className="text-red-600">Bloqueado</SelectItem>
                                                <SelectItem value="pendente" className="text-yellow-600">Pendente</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="pr-6 py-4 text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-300"
                                            onClick={() => openDeleteUser(user)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Delete User Dialog - Styled */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-2xl border-0 shadow-2xl bg-white/90 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-gray-900">Excluir Usuário</DialogTitle>
                        <DialogDescription className="text-gray-500 text-base mt-2">
                            Tem certeza que deseja excluir <strong>{deletingUser?.nome}</strong>?
                            <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100 flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                <span className="text-sm text-red-700 font-medium">
                                    Esta ação é irreversível e removerá o usuário do banco de dados.
                                </span>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6 gap-2">
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="rounded-xl border-gray-200 hover:bg-gray-50">Cancelar</Button>
                        <Button variant="destructive" onClick={handleDeleteUser} disabled={isDeleting} className="rounded-xl bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200">
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir Permanentemente"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
