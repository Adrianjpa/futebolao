"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Calendar, Clock, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, UserX } from "lucide-react";
import { collection, getDocs, query, where, orderBy, addDoc, serverTimestamp, doc, updateDoc, writeBatch, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import { calculatePoints } from "@/lib/scoring";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Championship {
    id: string;
    name: string;
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
    status: "scheduled" | "live" | "finished";
    homeScore?: number;
    awayScore?: number;
    homeTeamCrest?: string;
    awayTeamCrest?: string;
}

interface User {
    id: string;
    nome: string;
    fotoPerfil?: string;
}

export default function AdminMatchesPage() {
    const [championships, setChampionships] = useState<Championship[]>([]);
    const [selectedChampionship, setSelectedChampionship] = useState<string>("");
    const [matches, setMatches] = useState<Match[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Form State
    const [homeTeamId, setHomeTeamId] = useState("");
    const [awayTeamId, setAwayTeamId] = useState("");
    const [matchDate, setMatchDate] = useState("");
    const [matchTime, setMatchTime] = useState("");
    const [round, setRound] = useState("Rodada 1");

    useEffect(() => {
        fetchChampionships();
        fetchTeams();
        fetchUsers();
    }, []);

    useEffect(() => {
        fetchMatches(selectedChampionship);
    }, [selectedChampionship]);

    const fetchUsers = async () => {
        const q = query(collection(db, "users"));
        const snap = await getDocs(q);
        const data: User[] = [];
        snap.forEach(doc => data.push({ id: doc.id, ...doc.data() } as User));
        setUsers(data);
    };

    const fetchChampionships = async () => {
        // Try to sort by createdAt if possible, otherwise we might need to rely on client sorting
        // For now, let's assume we want to show them. If createdAt exists, we use it.
        // If not, we can just fetch all.
        const q = query(collection(db, "championships"));
        const snap = await getDocs(q);
        const data: Championship[] = [];
        snap.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Championship));

        // Client-side sort to be safe (assuming newer ones might be added later or we can reverse)
        // If we have a createdAt field we should use it. Let's try to reverse it to show newest first if natural order is insertion.
        // Or better, let's just reverse it as a heuristic if we don't have explicit dates.
        setChampionships(data.reverse());

        // Default to "all" if not set
        if (!selectedChampionship) setSelectedChampionship("all");
    };

    const fetchTeams = async () => {
        const q = query(collection(db, "teams"), orderBy("name"));
        const snap = await getDocs(q);
        const data: Team[] = [];
        snap.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Team));
        setTeams(data);
    };

    const fetchMatches = async (champId: string) => {
        setLoading(true);
        try {
            let q;
            if (champId && champId !== "all") {
                // Filter by championship AND status (scheduled/live)
                // Note: This might require a composite index. If it fails, we might need to filter client-side.
                // Let's try client-side filtering for status to avoid index issues for now, 
                // or just fetch by championship and date, then filter.
                q = query(collection(db, "matches"), where("championshipId", "==", champId), orderBy("date"));
            } else {
                // All championships, ordered by date
                q = query(collection(db, "matches"), orderBy("date"));
            }

            const snap = await getDocs(q);
            const data: Match[] = [];
            snap.forEach(doc => {
                const m = { id: doc.id, ...doc.data() } as Match;
                // Client-side filter: Only show SCHEDULED matches (future)
                // User requested to remove Live matches from here.
                if (m.status === 'scheduled') {
                    data.push(m);
                }
            });
            setMatches(data);
        } catch (error) {
            console.error("Error fetching matches:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddMatch = async () => {
        if (!selectedChampionship || selectedChampionship === "all" || !homeTeamId || !awayTeamId || !matchDate || !matchTime) {
            alert("Preencha todos os campos. Selecione um campeonato específico.");
            return;
        }

        const homeTeam = teams.find(t => t.id === homeTeamId);
        const awayTeam = teams.find(t => t.id === awayTeamId);

        const dateTime = new Date(`${matchDate}T${matchTime}`);

        try {
            await addDoc(collection(db, "matches"), {
                championshipId: selectedChampionship,
                homeTeamId,
                awayTeamId,
                homeTeamName: homeTeam?.name,
                awayTeamName: awayTeam?.name,
                date: dateTime,
                round,
                status: "scheduled",
                createdAt: serverTimestamp(),
            });

            setIsDialogOpen(false);
            fetchMatches(selectedChampionship);
        } catch (error) {
            console.error("Error adding match:", error);
            alert("Erro ao criar partida.");
        }
    };

    // Finish Match State
    const [finishMatchId, setFinishMatchId] = useState<string | null>(null);
    const [finalHomeScore, setFinalHomeScore] = useState("");
    const [finalAwayScore, setFinalAwayScore] = useState("");

    const handleFinishMatch = async () => {
        if (!finishMatchId || finalHomeScore === "" || finalAwayScore === "") return;

        const home = parseInt(finalHomeScore);
        const away = parseInt(finalAwayScore);

        try {
            // 1. Update Match
            const matchRef = doc(db, "matches", finishMatchId);
            await updateDoc(matchRef, {
                homeScore: home,
                awayScore: away,
                status: "finished",
            });

            // 2. Calculate Points for Predictions
            const qPreds = query(collection(db, "predictions"), where("matchId", "==", finishMatchId));
            const predsSnap = await getDocs(qPreds);

            const batch = writeBatch(db);

            predsSnap.forEach((docSnap) => {
                const pred = docSnap.data();
                const points = calculatePoints(pred.homeScore, pred.awayScore, home, away);

                // Update prediction points
                batch.update(doc(db, "predictions", docSnap.id), { points });

                // Increment user total points
                const userRef = doc(db, "users", pred.userId);
                batch.update(userRef, {
                    totalPoints: increment(points)
                });
            });

            await batch.commit();

            setFinishMatchId(null);
            setFinalHomeScore("");
            setFinalAwayScore("");
            fetchMatches(selectedChampionship);
            alert("Partida finalizada e pontos calculados!");
        } catch (error) {
            console.error("Error finishing match:", error);
            alert("Erro ao finalizar partida.");
        }
    };

    // Pagination Logic (No more status filter)
    const totalPages = Math.ceil(matches.length / ITEMS_PER_PAGE);
    const paginatedMatches = matches.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Gerenciar Partidas</h1>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button disabled={!selectedChampionship || selectedChampionship === "all"}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nova Partida
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
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Data</Label>
                                    <Input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Horário</Label>
                                    <Input type="time" value={matchTime} onChange={e => setMatchTime(e.target.value)} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Rodada / Fase</Label>
                                <Input value={round} onChange={e => setRound(e.target.value)} placeholder="Ex: Rodada 1, Quartas de Final" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAddMatch}>Agendar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Finish Match Dialog */}
                <Dialog open={!!finishMatchId} onOpenChange={(open) => !open && setFinishMatchId(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Finalizar Partida</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="flex items-center justify-center gap-4">
                                <Input
                                    type="number"
                                    className="w-20 text-center"
                                    placeholder="Casa"
                                    value={finalHomeScore}
                                    onChange={(e) => setFinalHomeScore(e.target.value)}
                                />
                                <span>X</span>
                                <Input
                                    type="number"
                                    className="w-20 text-center"
                                    placeholder="Fora"
                                    value={finalAwayScore}
                                    onChange={(e) => setFinalAwayScore(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleFinishMatch}>Confirmar Resultado</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="w-full md:w-1/2">
                            <Label className="mb-2 block">Selecione o Campeonato</Label>
                            <Select value={selectedChampionship} onValueChange={setSelectedChampionship}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">TODOS</SelectItem>
                                    {championships.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4">
                {paginatedMatches.length === 0 && selectedChampionship && !loading && (
                    <p className="text-muted-foreground">Nenhuma partida encontrada com este filtro.</p>
                )}
                {paginatedMatches.map((match) => (
                    <AdminMatchCard
                        key={match.id}
                        match={match}
                        users={users}
                        onFinish={() => setFinishMatchId(match.id)}
                    />
                ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        Anterior
                    </Button>
                    <span className="flex items-center px-2 text-sm">
                        Página {currentPage} de {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Próxima
                    </Button>
                </div>
            )}
        </div>
    );
}

function AdminMatchCard({ match, users, onFinish }: { match: Match, users: User[], onFinish: () => void }) {
    const [expanded, setExpanded] = useState(false);
    const [predictions, setPredictions] = useState<any[]>([]);
    const [loadingPreds, setLoadingPreds] = useState(false);

    const handleToggle = async () => {
        if (!expanded && predictions.length === 0) {
            setLoadingPreds(true);
            try {
                const q = query(collection(db, "predictions"), where("matchId", "==", match.id));
                const snap = await getDocs(q);
                setPredictions(snap.docs.map(d => d.data()));
            } catch (e) {
                console.error("Error fetching predictions", e);
            } finally {
                setLoadingPreds(false);
            }
        }
        setExpanded(!expanded);
    };

    const votedUserIds = new Set(predictions.map(p => p.userId));
    const notVotedUsers = users.filter(u => !votedUserIds.has(u.id));

    return (
        <Card>
            <CardContent className="p-0">
                {/* Header - Always Visible */}
                <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={handleToggle}
                >
                    <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2 flex-1 justify-end">
                            <span className="font-bold text-right">{match.homeTeamName}</span>
                            {match.homeTeamCrest && <img src={match.homeTeamCrest} alt={match.homeTeamName} className="h-8 w-8 object-contain" />}
                        </div>
                        <div className="px-3 py-1 bg-muted rounded text-sm font-mono font-bold min-w-[60px] text-center">
                            {match.status === 'finished' || match.status === 'live' ? `${match.homeScore ?? 0} x ${match.awayScore ?? 0}` : 'vs'}
                        </div>
                        <div className="flex items-center gap-2 flex-1 justify-start">
                            {match.awayTeamCrest && <img src={match.awayTeamCrest} alt={match.awayTeamName} className="h-8 w-8 object-contain" />}
                            <span className="font-bold text-left">{match.awayTeamName}</span>
                        </div>
                    </div>

                    <div className="ml-6 text-sm text-muted-foreground flex flex-col items-end gap-2 min-w-[120px]">
                        <div className="flex items-center">
                            <Calendar className="mr-1 h-3 w-3" />
                            {match.date?.seconds ? format(new Date(match.date.seconds * 1000), "dd/MM/yyyy") : "Data inválida"}
                        </div>
                        <div className="flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            {match.date?.seconds ? format(new Date(match.date.seconds * 1000), "HH:mm") : "--:--"}
                        </div>
                        <span className={`text-xs mt-1 px-2 rounded-full ${match.status === 'live' ? 'bg-red-100 text-red-800 animate-pulse' : 'bg-secondary'}`}>
                            {match.status === 'live' ? 'AO VIVO' : match.round}
                        </span>
                    </div>

                    <div className="ml-4">
                        {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                </div>

                {/* Expanded Content */}
                {expanded && (
                    <div className="p-4 border-t bg-muted/20">
                        <div className="flex justify-between items-start mb-4">
                            <h4 className="font-semibold text-sm">Palpites ({predictions.length}/{users.length})</h4>
                            {match.status !== 'finished' && (
                                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onFinish(); }}>
                                    Finalizar Partida
                                </Button>
                            )}
                        </div>

                        {loadingPreds ? (
                            <p className="text-sm text-muted-foreground">Carregando palpites...</p>
                        ) : (
                            <div className="space-y-4">
                                {/* Not Voted Section */}
                                {notVotedUsers.length > 0 && (
                                    <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
                                        <AlertCircle className="h-4 w-4" />
                                        <span className="text-sm font-medium">Pendentes: {notVotedUsers.length}</span>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <UserX className="h-4 w-4 ml-2 cursor-help opacity-70 hover:opacity-100" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <div className="flex flex-col gap-1">
                                                        <p className="font-semibold mb-1">Ainda não palpitaram:</p>
                                                        {notVotedUsers.map(u => (
                                                            <span key={u.id} className="text-xs">{u.nome}</span>
                                                        ))}
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                )}

                                {/* Voted List */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {predictions.map(pred => {
                                        const user = users.find(u => u.id === pred.userId);
                                        return (
                                            <div key={pred.id} className="flex items-center gap-2 p-2 bg-background rounded border text-sm">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={user?.fotoPerfil} />
                                                    <AvatarFallback>{user?.nome?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-xs truncate max-w-[100px]">{user?.nome || "Desconhecido"}</span>
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {pred.homeScore} x {pred.awayScore}
                                                    </span>
                                                </div>
                                                <CheckCircle2 className="h-3 w-3 text-green-500 ml-auto" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
