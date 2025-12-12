"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Edit, Trash2, AlertTriangle } from "lucide-react";
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
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit Points State
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
            snap.forEach(doc => data.push({ id: doc.id, ...doc.data() } as User));
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
            // Note: This only deletes from Firestore. Auth deletion requires Admin SDK.
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
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Gerenciar Usuários</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Usuários Cadastrados ({users.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuário</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Pontos</TableHead>
                                <TableHead>Função</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={user.fotoPerfil} />
                                            <AvatarFallback>{user.nome?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{user.nome}</span>
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold">{user.totalPoints || 0}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditPoints(user)}>
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={user.funcao}
                                            onValueChange={(val) => handleRoleChange(user.id, val)}
                                        >
                                            <SelectTrigger className="w-[130px] h-8">
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
                                        <div className="flex items-center gap-2">
                                            <Select
                                                value={user.status}
                                                onValueChange={(val) => handleStatusChange(user.id, val)}
                                            >
                                                <SelectTrigger className={`w-[130px] h-8 ${user.status === 'ativo' ? 'text-green-600' : 'text-red-600'}`}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ativo">Ativo</SelectItem>
                                                    <SelectItem value="bloqueado">Bloqueado</SelectItem>
                                                    <SelectItem value="pendente">Pendente</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => openDeleteUser(user)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Edit Points Dialog */}
            <Dialog open={isEditPointsOpen} onOpenChange={setIsEditPointsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Pontos</DialogTitle>
                        <DialogDescription>
                            Ajuste manual da pontuação para {editingPointsUser?.nome}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="points" className="text-right">
                                Pontos
                            </Label>
                            <Input
                                id="points"
                                type="number"
                                value={newPoints}
                                onChange={(e) => setNewPoints(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditPointsOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSavePoints} disabled={savingPoints}>
                            {savingPoints ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete User Dialog */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir Usuário</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir o usuário <strong>{deletingUser?.nome}</strong>?
                            <br />
                            <span className="text-red-600 font-bold flex items-center gap-2 mt-2">
                                <AlertTriangle className="h-4 w-4" />
                                Esta ação removerá o usuário do banco de dados.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDeleteUser} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir Permanentemente"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
