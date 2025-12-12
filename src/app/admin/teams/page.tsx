"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Shield, Search } from "lucide-react";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Team {
    id: string;
    name: string;
    shortName: string;
    shieldUrl: string;
    type: "club" | "national";
}

export default function AdminTeamsPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form State
    const [newName, setNewName] = useState("");
    const [newShortName, setNewShortName] = useState("");
    const [newShieldUrl, setNewShieldUrl] = useState("");
    const [newType, setNewType] = useState<"club" | "national">("club");

    useEffect(() => {
        fetchTeams();
    }, []);

    const fetchTeams = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "teams"), orderBy("name"));
            const querySnapshot = await getDocs(q);
            const teamsData: Team[] = [];
            querySnapshot.forEach((doc) => {
                teamsData.push({ id: doc.id, ...doc.data() } as Team);
            });
            setTeams(teamsData);
        } catch (error) {
            console.error("Error fetching teams:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTeam = async () => {
        try {
            await addDoc(collection(db, "teams"), {
                name: newName,
                shortName: newShortName,
                shieldUrl: newShieldUrl,
                type: newType,
                createdAt: serverTimestamp(),
            });

            setIsDialogOpen(false);
            // Reset form
            setNewName("");
            setNewShortName("");
            setNewShieldUrl("");
            setNewType("club");

            fetchTeams(); // Refresh list
        } catch (error) {
            console.error("Error adding team:", error);
            alert("Erro ao adicionar time.");
        }
    };

    const filteredTeams = teams.filter(team =>
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.shortName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Gerenciar Equipes</h1>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Adicionar Time
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Adicionar Nova Equipe</DialogTitle>
                            <DialogDescription>
                                Cadastre um novo time ou seleção para usar nos campeonatos.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nome Completo</Label>
                                <Input id="name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Clube de Regatas do Flamengo" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="shortName">Nome Curto (Sigla)</Label>
                                    <Input id="shortName" value={newShortName} onChange={(e) => setNewShortName(e.target.value)} placeholder="Ex: FLA" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="type">Tipo</Label>
                                    <Select value={newType} onValueChange={(val: "club" | "national") => setNewType(val)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="club">Clube</SelectItem>
                                            <SelectItem value="national">Seleção</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="shieldUrl">URL do Escudo</Label>
                                <Input id="shieldUrl" value={newShieldUrl} onChange={(e) => setNewShieldUrl(e.target.value)} placeholder="https://..." />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleAddTeam}>Salvar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar times..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                {filteredTeams.map((team) => (
                    <Card key={team.id} className="overflow-hidden">
                        <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
                            <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center overflow-hidden mb-2">
                                {team.shieldUrl ? (
                                    <img src={team.shieldUrl} alt={team.name} className="h-full w-full object-cover" />
                                ) : (
                                    <Shield className="h-10 w-10 text-muted-foreground" />
                                )}
                            </div>
                            <h3 className="font-bold truncate w-full" title={team.name}>{team.name}</h3>
                            <p className="text-sm text-muted-foreground">{team.shortName}</p>
                            <span className="text-xs px-2 py-1 bg-secondary rounded-full capitalize">{team.type === 'club' ? 'Clube' : 'Seleção'}</span>
                        </CardContent>
                    </Card>
                ))}
                {filteredTeams.length === 0 && !loading && (
                    <div className="col-span-full text-center py-10 text-muted-foreground">
                        Nenhum time encontrado.
                    </div>
                )}
            </div>
        </div>
    );
}
