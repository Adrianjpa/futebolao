"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { collection, getDocs, query, where, orderBy, addDoc, serverTimestamp, limit, startAfter, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { UnifiedMatchCard } from "@/components/UnifiedMatchCard";

interface Championship {
    id: string;
    name: string;
    status: string;
    category?: string;
}

interface Team {
    id: string;
    name: string;
    shortName: string;
}

interface Match {
    id: string;
    homeTeamId: string;
    awayTeamId: string;
    homeTeamName: string;
    awayTeamName: string;
    date: any; // Timestamp
    round: string;
    status: string;
    homeScore: number;
    awayScore: number;
    homeTeamCrest?: string;
    awayTeamCrest?: string;
    championshipId?: string;
    championshipName?: string;
}

const ITEMS_PER_PAGE = 10;

export default function MatchesClient() {
    const { profile, user: authUser } = useAuth();
    const isAdmin = profile?.funcao === 'admin' || profile?.funcao === 'moderator';

    const [championships, setChampionships] = useState<Championship[]>([]);
    const [selectedChampionship, setSelectedChampionship] = useState<string>("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [matches, setMatches] = useState<Match[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [userPredictions, setUserPredictions] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Pagination
    const [pageStack, setPageStack] = useState<QueryDocumentSnapshot[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLastPage, setIsLastPage] = useState(false);

    // Form State (Admin)
    const [homeTeamId, setHomeTeamId] = useState("");
    const [awayTeamId, setAwayTeamId] = useState("");
    const [matchDate, setMatchDate] = useState("");
    const [matchTime, setMatchTime] = useState("");
    const [round, setRound] = useState("Rodada 1");

    // FETCH FUNCTIONS 
    const fetchUsers = async () => {
        try {
            const q = query(collection(db, "users"));
            const snap = await getDocs(q);
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(data);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const fetchUserPredictions = async () => {
        if (!authUser) return;
        try {
            const q = query(collection(db, "predictions"), where("userId", "==", authUser.uid));
            const snap = await getDocs(q);
            const predSet = new Set<string>();
            snap.forEach(doc => predSet.add(doc.data().matchId));
            setUserPredictions(predSet);
        } catch (error) {
            console.error("Error fetching user predictions:", error);
        }
    };

    const fetchChampionships = async () => {
        const q = query(collection(db, "championships"));
        const snap = await getDocs(q);
        const data: Championship[] = [];
        snap.forEach(doc => {
            const d = doc.data();
            // Filter out finished/archived championships from the UI list entirely
            if (d.status === 'ativo') {
                data.push({ id: doc.id, ...d } as Championship);
            }
        });
        setChampionships(data);

        // Auto-select if only one active championship
        if (data.length === 1) {
            setSelectedChampionship(data[0].id);
        }
    };

    const fetchTeams = async () => {
        const q = query(collection(db, "teams"), orderBy("name"));
        const snap = await getDocs(q);
        const data: Team[] = [];
        snap.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Team));
        setTeams(data);
    };

    // Helper to filter championships by category (reused in fetchMatches)
    const getChampionshipsByCategory = () => {
        return championships.filter(c => {
            if (categoryFilter === 'all') return true;
            const cat = c.category || 'other';
            if (categoryFilter === 'other') {
                const specificCategories = ['world_cup', 'euro', 'copa_america', 'brasileirao', 'champions_league', 'libertadores', 'nacional'];
                return !specificCategories.includes(cat);
            }
            return cat === categoryFilter;
        });
    };

    const fetchMatches = async (page: number = 1, stack: QueryDocumentSnapshot[] = []) => {
        setLoading(true);
        try {
            const matchesCollection = collection(db, "matches");
            let constraints: any[] = [];

            // Basic constraints: Status scheduled, ordered by date
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            constraints.push(where("status", "==", "scheduled"));
            constraints.push(where("date", ">=", today)); // Only future matches
            constraints.push(orderBy("date", "asc"));

            if (selectedChampionship && selectedChampionship !== "all") {
                // Specific Championship
                constraints.unshift(where("championshipId", "==", selectedChampionship));
            } else {
                // All Championships: Filter by Category-Filtered ACTIVE championships
                const validChamps = getChampionshipsByCategory().map(c => c.id);

                if (validChamps.length > 0) {
                    // Firestore IN query limit is 30.
                    constraints.unshift(where("championshipId", "in", validChamps.slice(0, 30)));
                } else {
                    if (championships.length > 0) {
                        setMatches([]);
                        setLoading(false);
                        return;
                    }
                    setMatches([]);
                    setLoading(false);
                    return;
                }
            }

            // Pagination Cursor
            if (page > 1 && stack.length >= page - 1) {
                const prevDoc = stack[page - 2];
                if (prevDoc) {
                    constraints.push(startAfter(prevDoc));
                }
            }

            constraints.push(limit(ITEMS_PER_PAGE));

            const q = query(matchesCollection, ...constraints);
            const snap = await getDocs(q);

            // Update Stack
            if (snap.docs.length > 0) {
                const lastDoc = snap.docs[snap.docs.length - 1];
                const newStack = [...stack];
                newStack[page - 1] = lastDoc;
                setPageStack(newStack);
            }

            const data: Match[] = [];
            const champMap = new Map(championships.map(c => [c.id, c.name]));

            snap.forEach(doc => {
                const m = doc.data();
                data.push({
                    id: doc.id,
                    ...m,
                    homeScore: m.homeScore ?? 0,
                    awayScore: m.awayScore ?? 0,
                    championshipName: champMap.get(m.championshipId) || m.championshipName
                } as Match);
            });

            setMatches(data);
            setIsLastPage(snap.docs.length < ITEMS_PER_PAGE);

        } catch (error) {
            console.error("Error fetching matches:", error);
        } finally {
            setLoading(false);
        }
    };

    // EFFECTS
    useEffect(() => {
        fetchChampionships();
        fetchTeams();
        fetchUsers();
    }, []);

    useEffect(() => {
        if (authUser) {
            fetchUserPredictions();
        }
    }, [authUser]);

    // Initial Load & Filter Change
    useEffect(() => {
        setPageStack([]);
        setCurrentPage(1);
        setIsLastPage(false);
        fetchMatches(1, []);
    }, [selectedChampionship, categoryFilter, championships]);

    // HANDLERS
    const handleNextPage = () => {
        if (!isLastPage) {
            const nextPage = currentPage + 1;
            setCurrentPage(nextPage);
            fetchMatches(nextPage, pageStack);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            const prevPage = currentPage - 1;
            setCurrentPage(prevPage);
            fetchMatches(prevPage, pageStack);
        }
    };

    const handleAddMatch = async () => {
        if (!selectedChampionship || selectedChampionship === "all" || !homeTeamId || !awayTeamId || !matchDate || !matchTime) {
            alert("Preencha todos os campos. Selecione um campeonato específico.");
            return;
        }

        const homeTeam = teams.find(t => t.id === homeTeamId);
        const awayTeam = teams.find(t => t.id === awayTeamId);
        const champ = championships.find(c => c.id === selectedChampionship);

        const dateTime = new Date(`${matchDate}T${matchTime}`);

        try {
            await addDoc(collection(db, "matches"), {
                championshipId: selectedChampionship,
                championshipName: champ?.name,
                homeTeamId,
                awayTeamId,
                homeTeamName: homeTeam?.name,
                awayTeamName: awayTeam?.name,
                homeTeamCrest: (homeTeam as any)?.crest || "",
                awayTeamCrest: (awayTeam as any)?.crest || "",
                date: dateTime,
                round,
                status: "scheduled",
                createdAt: serverTimestamp(),
                homeScore: 0,
                awayScore: 0
            });

            setIsDialogOpen(false);
            setHomeTeamId("");
            setAwayTeamId("");
            setMatchDate("");
            setMatchTime("");

            fetchMatches(1, []);
            alert("Partida criada com sucesso!");
        } catch (error) {
            console.error("Error adding match:", error);
            alert("Erro ao criar partida.");
        }
    };

    // Computed Variables for UI
    const filteredChampionships = getChampionshipsByCategory();

    const availableCategories = new Set<string>();
    championships.forEach(c => {
        const cat = c.category || 'other';
        if (['world_cup', 'euro', 'copa_america', 'brasileirao', 'champions_league', 'libertadores', 'nacional'].includes(cat)) {
            availableCategories.add(cat);
        } else {
            availableCategories.add('other');
        }
    });

    const getCategoryLabel = (cat: string) => {
        switch (cat) {
            case 'world_cup': return 'Copa do Mundo';
            case 'euro': return 'Eurocopa';
            case 'copa_america': return 'Copa América';
            case 'brasileirao': return 'Brasileirão';
            case 'libertadores': return 'Libertadores';
            case 'champions_league': return 'Champions League';
            case 'nacional': return 'Nacional';
            case 'other': return 'Outros';
            default: return 'Outros';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Próximas Partidas</h1>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    {/* Category Filter */}
                    <Select value={categoryFilter} onValueChange={(val) => {
                        setCategoryFilter(val);
                        setSelectedChampionship("all");
                    }}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas Categorias</SelectItem>
                            {['world_cup', 'euro', 'copa_america', 'brasileirao', 'libertadores', 'champions_league', 'nacional', 'other'].map(cat => {
                                if (availableCategories.has(cat)) {
                                    return <SelectItem key={cat} value={cat}>{getCategoryLabel(cat)}</SelectItem>;
                                }
                                return null;
                            })}
                        </SelectContent>
                    </Select>

                    {/* Championship Filter */}
                    <Select value={selectedChampionship} onValueChange={setSelectedChampionship}>
                        <SelectTrigger className="w-full sm:w-[220px]">
                            <SelectValue placeholder="Campeonato" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Campeonatos</SelectItem>
                            {filteredChampionships.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {isAdmin && (
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button disabled={!selectedChampionship || selectedChampionship === "all"}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nova
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Agendar Partida</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Time Mandante</Label>
                                            <Select value={homeTeamId} onValueChange={setHomeTeamId}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Time Visitante</Label>
                                            <Select value={awayTeamId} onValueChange={setAwayTeamId}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Data e Hora</Label>
                                        <div className="flex gap-2">
                                            <Input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} />
                                            <Input type="time" value={matchTime} onChange={e => setMatchTime(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Rodada / Fase</Label>
                                        <Input value={round} onChange={e => setRound(e.target.value)} placeholder="Ex: Rodada 1" />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleAddMatch}>Agendar</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                {matches.length === 0 && !loading && (
                    <div className="text-center py-12 text-muted-foreground">
                        <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p>Nenhuma partida agendada encontrada.</p>
                    </div>
                )}

                {loading && (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                )}

                {matches.map((match) => (
                    <UnifiedMatchCard
                        key={match.id}
                        match={match}
                        users={users}
                        live={match.status === 'live' || match.status === 'IN_PLAY'}
                        showBetButton={!isAdmin}
                        hasPrediction={userPredictions.has(match.id)}
                        isAdmin={isAdmin}
                        onUpdate={() => fetchMatches(currentPage, pageStack)}
                        showChampionshipName={selectedChampionship === 'all'}
                    />
                ))}
            </div>

            {/* Pagination Controls */}
            {(matches.length > 0 || currentPage > 1) && !loading && (
                <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                        className="w-[120px]"
                    >
                        <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
                    </Button>

                    <span className="text-sm text-muted-foreground font-mono">
                        Página {currentPage}
                    </span>

                    <Button
                        variant="outline"
                        onClick={handleNextPage}
                        disabled={isLastPage || matches.length < ITEMS_PER_PAGE} // Disable if fewer items than limit, implying end
                        className="w-[120px]"
                    >
                        Próxima <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
