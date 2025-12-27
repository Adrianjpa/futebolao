"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { collection, query, getDocs, where, documentId } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Crown, Medal, Trophy, Siren, Flame } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getFlagUrl } from "@/lib/utils";

interface UserProfile {
    id: string;
    nome: string;
    nickname?: string;
    fotoPerfil?: string;
    totalPoints?: number;
    championshipPoints?: number; // Calculated dynamically
    teamPicks?: string[]; // Legacy Team Picks
    championPick?: string; // Legacy Champion Pick
    exactScores?: number;
    outcomes?: number;
    errors?: number;
}

interface Championship {
    id: string;
    name: string;
    status: string;
    createdAt: any;
    legacyImport?: boolean; // Added flag
    category?: string;
}

export default function RankingPage() {
    const { user: currentUser } = useAuth();
    const searchParams = useSearchParams();
    const initialChampionshipId = searchParams.get("championship") || "all";

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [championships, setChampionships] = useState<Championship[]>([]);
    const [selectedChampionship, setSelectedChampionship] = useState<string>(initialChampionshipId);
    const [sortBy, setSortBy] = useState<'totalPoints' | 'exactScores' | 'outcomes'>('totalPoints');

    useEffect(() => {
        fetchChampionships();
    }, []);

    useEffect(() => {
        if (selectedChampionship) {
            fetchRanking();
        }
    }, [selectedChampionship, championships]);

    const fetchChampionships = async () => {
        try {
            const q = query(collection(db, "championships"));
            const snap = await getDocs(q);
            const data: Championship[] = [];
            snap.forEach(doc => {
                const docData = doc.data();
                if (docData.status !== 'arquivado') {
                    data.push({ id: doc.id, ...docData } as Championship);
                }
            });

            // Sort: Active first, then by createdAt (Recent -> Oldest), then by name
            data.sort((a, b) => {
                // 1. Status: Active first
                if (a.status === 'ativo' && b.status !== 'ativo') return -1;
                if (a.status !== 'ativo' && b.status === 'ativo') return 1;

                // 2. Date: Recent first (if createdAt exists)
                if (a.createdAt && b.createdAt) {
                    const dateA = a.createdAt.seconds || 0;
                    const dateB = b.createdAt.seconds || 0;
                    if (dateA !== dateB) return dateB - dateA;
                }

                // 3. Name: Alphabetical
                return a.name.localeCompare(b.name);
            });

            setChampionships(data);

            // Set default selection if "all" or empty, and we have championships
            if ((selectedChampionship === "all" || !selectedChampionship) && data.length > 0) {
                setSelectedChampionship(data[0].id);
            }
        } catch (error) {
            console.error("Error fetching championships:", error);
        }
    };

    const fetchRanking = async () => {
        setLoading(true);
        try {
            let rankedUsers: UserProfile[] = [];
            const currentChamp = championships.find(c => c.id === selectedChampionship);

            if (currentChamp?.legacyImport) {
                // Fetch from legacy_history
                // 0. Prefetch all users to resolve names to IDs (Hydration Support)
                const usersSnap = await getDocs(collection(db, "users"));
                const nameToIdMap = new Map();
                usersSnap.forEach(u => {
                    const d = u.data();
                    if (d.displayName) nameToIdMap.set(d.displayName, u.id);
                    if (d.nome) nameToIdMap.set(d.nome, u.id);
                });

                const q = query(collection(db, "legacy_history"), where("championshipId", "==", selectedChampionship));
                const snap = await getDocs(q);

                rankedUsers = snap.docs.map(doc => {
                    const data = doc.data();
                    const realId = nameToIdMap.get(data.legacyUserName) || data.legacyUserName;
                    return {
                        id: realId, // Use REAL ID if found (hydrated), else fallback to name
                        nome: data.legacyUserName,
                        nickname: data.legacyUserName,
                        totalPoints: data.points,
                        exactScores: data.exactScores || 0,
                        outcomes: data.outcomes || 0,
                        errors: data.errors || 0,
                        teamPicks: data.teamPicks,
                        championPick: data.championPick
                    } as UserProfile;
                });

            } else if (selectedChampionship !== "all") {
                // EXISTING LOGIC for Standard Championships
                // 1. Get all matches for this championship
                const matchesQ = query(collection(db, "matches"), where("championshipId", "==", selectedChampionship));
                const matchesSnap = await getDocs(matchesQ);
                const matchIds = matchesSnap.docs.map(d => d.id);

                if (matchIds.length > 0) {
                    // 2. Get all predictions for these matches
                    const predictionsRef = collection(db, "predictions");
                    const predsSnapshot = await getDocs(query(predictionsRef));
                    const relevantPreds = predsSnapshot.docs
                        .map(d => d.data())
                        .filter(p => matchIds.includes(p.matchId));

                    // 3. Aggregate points
                    const userStatsMap = new Map<string, { total: number, exacts: number, outcomes: number, errors: number }>();

                    relevantPreds.forEach(p => {
                        const current = userStatsMap.get(p.userId) || { total: 0, exacts: 0, outcomes: 0, errors: 0 };
                        current.total += (p.points || 0);
                        if (p.points === 3) current.exacts++;
                        else if (p.points === 1) current.outcomes++;
                        else if (p.points === 0) current.errors++;
                        userStatsMap.set(p.userId, current);
                    });

                    // 4. Fetch User Details for those who have points
                    const userIds = Array.from(userStatsMap.keys());
                    if (userIds.length > 0) {
                        // Fetch users in batches of 10
                        const userDocs: any[] = [];
                        for (let i = 0; i < userIds.length; i += 10) {
                            const chunk = userIds.slice(i, i + 10);
                            const usersQ = query(collection(db, "users"), where(documentId(), "in", chunk));
                            const usersSnap = await getDocs(usersQ);
                            usersSnap.forEach(d => userDocs.push({ id: d.id, ...d.data() }));
                        }

                        rankedUsers = userDocs.map(u => {
                            const stats = userStatsMap.get(u.id);
                            return {
                                ...u,
                                totalPoints: stats?.total || 0,
                                exactScores: stats?.exacts || 0,
                                outcomes: stats?.outcomes || 0,
                                errors: stats?.errors || 0
                            };
                        });
                    }
                }
            }

            setUsers(rankedUsers);
        } catch (error) {
            console.error("Error fetching ranking:", error);
        } finally {
            setLoading(false);
        }
    };

    const getRankIcon = (index: number, totalUsers: number) => {
        // First Place
        if (index === 0) return (
            <div className="relative">
                <Crown className="h-8 w-8 text-yellow-500 animate-bounce" />
            </div>
        );

        // Top 3
        if (index === 1) return <Medal className="h-6 w-6 text-gray-400" />;
        if (index === 2) return <Medal className="h-6 w-6 text-amber-700" />;

        // Last Place (Lantern)
        if (index === totalUsers - 1 && totalUsers > 3) return (
            <div className="relative" title="Lanterna">
                <Siren className="h-8 w-8 text-red-600 animate-[pulse_0.4s_ease-in-out_infinite]" />
            </div>
        );

        // Remove redundant number for other positions
        return null;
    };



    const sortedUsers = [...users].sort((a, b) => {
        // Tiebreaker: Total Points always secondary
        if (sortBy !== 'totalPoints') {
            // Otherwise, MORE is better (Descending)
            const valA = a[sortBy] || 0;
            const valB = b[sortBy] || 0;
            if (valA !== valB) return valB - valA;
        }
        return (b.totalPoints || 0) - (a.totalPoints || 0);
    });

    const isLegacy = championships.find(c => c.id === selectedChampionship)?.legacyImport;

    const [categoryFilter, setCategoryFilter] = useState("all");

    // Computed Chmapionships based on Category
    const filteredChampionships = championships.filter(c => {
        if (categoryFilter === 'all') return true;
        const cat = c.category || 'other'; // Default to 'other' if category is not set
        if (categoryFilter === 'other') {
            // If filtering for 'other', show championships whose category is NOT one of the specific ones
            const specificCategories = ['world_cup', 'euro', 'copa_america', 'brasileirao', 'champions_league', 'libertadores', 'nacional'];
            return !specificCategories.includes(cat);
        }
        // Otherwise, filter by the selected category
        return cat === categoryFilter;
    });

    const handleSort = (field: 'totalPoints' | 'exactScores' | 'outcomes') => {
        if (sortBy === field) {
            // Toggle direction? Currently only descending is supported/needed mostly
            return;
        }
        setSortBy(field);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Ranking</h1>

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
                            <SelectItem value="world_cup">Copa do Mundo</SelectItem>
                            <SelectItem value="euro">Eurocopa</SelectItem>
                            <SelectItem value="copa_america">Copa América</SelectItem>
                            <SelectItem value="brasileirao">Brasileirão</SelectItem>
                            <SelectItem value="libertadores">Libertadores</SelectItem>
                            <SelectItem value="champions_league">Champions League</SelectItem>
                            <SelectItem value="nacional">Nacional</SelectItem>
                            <SelectItem value="other">Outros</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Championship Filter */}
                    <Select value={selectedChampionship} onValueChange={setSelectedChampionship}>
                        <SelectTrigger className="w-full sm:w-[260px]">
                            <SelectValue placeholder="Selecione um Campeonato" />
                        </SelectTrigger>
                        <SelectContent>
                            {filteredChampionships.length > 0 ? (
                                filteredChampionships.map(c => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.name} {c.status === 'ativo' && '(Ativo)'}
                                    </SelectItem>
                                ))
                            ) : (
                                <SelectItem value="none" disabled>Nenhum campeonato encontrado</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card>
                <CardHeader className="p-0 block border-b border-white/5 bg-muted/5">
                    {/* Header Row */}
                    <div className="flex items-center text-sm font-medium text-muted-foreground px-4 py-3 gap-2">
                        <div className="w-8 text-center shrink-0">Pos.</div>
                        <div className="flex-1">Jogador</div>

                        {/* Interactive Stats Headers (Desktop) */}
                        <div
                            onClick={() => handleSort('totalPoints')}
                            className={`hidden sm:block w-16 text-center shrink-0 cursor-pointer hover:bg-white/5 rounded py-1 transition-colors select-none ${sortBy === 'totalPoints' ? 'text-primary font-bold bg-primary/5' : ''}`}
                            title="Ordenar por Pontos"
                        >
                            Pontos
                        </div>
                        <div
                            onClick={() => handleSort('exactScores')}
                            className={`hidden sm:block w-16 text-center shrink-0 cursor-pointer hover:bg-white/5 rounded py-1 transition-colors select-none ${sortBy === 'exactScores' ? 'text-primary font-bold bg-primary/5' : ''}`}
                            title="Ordenar por Buchas (3 pts)"
                        >
                            Buchas
                        </div>
                        <div
                            onClick={() => handleSort('outcomes')}
                            className={`hidden sm:block w-16 text-center shrink-0 cursor-pointer hover:bg-white/5 rounded py-1 transition-colors select-none ${sortBy === 'outcomes' ? 'text-primary font-bold bg-primary/5' : ''}`}
                            title="Ordenar por Situações (1 pt)"
                        >
                            Situação
                        </div>

                        {/* Mobile Dynamic Header (Dropdown Embedded) */}
                        <div className="sm:hidden w-20 shrink-0 flex justify-end">
                            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                                <SelectTrigger className="w-full h-8 px-2 text-xs font-bold text-primary bg-transparent border-none hover:bg-white/10 focus:ring-0 shadow-none justify-end gap-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    <SelectItem value="totalPoints">Pontos</SelectItem>
                                    <SelectItem value="exactScores">Buchas (3pts)</SelectItem>
                                    <SelectItem value="outcomes">Situação (1pt)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {sortedUsers.map((user, index) => {
                            const isCurrentUser = currentUser?.uid === user.id;
                            const isLast = index === sortedUsers.length - 1 && sortedUsers.length > 3;

                            return (
                                <div
                                    key={user.id}
                                    className={`flex items-center px-4 py-3 gap-2 transition-all duration-300 
                                        ${isCurrentUser ? "bg-primary/10 hover:bg-primary/15 border-l-4 border-primary" : "hover:bg-muted/50"}
                                        ${index === 0 ? "bg-yellow-50/50 dark:bg-yellow-900/10" : ""}
                                        ${isLast ? "bg-red-50/50 dark:bg-red-900/10" : ""}
                                    `}
                                >
                                    {/* Position Number */}
                                    <div className="w-8 flex justify-center text-sm font-bold text-muted-foreground shrink-0">
                                        {index + 1}
                                    </div>

                                    {/* Player Container (Avatar + Name) - Aligns with 'Jogador' header */}
                                    <div className="flex-1 flex items-center gap-3 min-w-0">
                                        <Avatar className={`h-10 w-10 border-2 shrink-0 ${index === 0 ? "border-yellow-500 shadow-lg shadow-yellow-500/20" : "border-primary/10"}`}>
                                            <AvatarImage src={user.fotoPerfil} />
                                            <AvatarFallback>{user.nome?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>

                                        <div className="flex flex-col justify-center min-w-0">
                                            <Link href={`/dashboard/profile/${user.id}`} className="hover:underline cursor-pointer">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium truncate leading-none">
                                                        {user.nickname || user.nome}
                                                    </p>
                                                    {/* Rank Icon */}
                                                    <div>{getRankIcon(index, sortedUsers.length)}</div>

                                                    {isCurrentUser && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold">VOCÊ</span>}
                                                </div>
                                            </Link>

                                            {/* Legacy Flags Display */}
                                            {isLegacy && user.teamPicks && (
                                                <div className="mt-1.5">
                                                    {/* Desktop: Row of flags */}
                                                    <div className="hidden sm:flex items-center gap-2">
                                                        {user.teamPicks.map((pick, i) => {
                                                            const isChampion = pick === "Espanha" && i === 0;
                                                            return (
                                                                <div key={i} className="relative group" title={`${i + 1}º Palpite: ${pick}`}>
                                                                    <img
                                                                        src={getFlagUrl(pick)}
                                                                        alt={pick}
                                                                        className={`w-5 h-3.5 object-cover rounded-sm shadow-sm transition-all duration-300 ${isChampion ? 'ring-1 ring-yellow-400 scale-110 opacity-100' : 'opacity-40 hover:opacity-100 grayscale hover:grayscale-0'}`}
                                                                    />
                                                                    {isChampion && <span className="absolute -top-1.5 -right-1.5 text-[6px]">🏆</span>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Mobile: Trophy Popover */}
                                                    <div className="sm:hidden flex items-center">
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <div className="cursor-pointer p-1 -ml-1 hover:bg-muted rounded-full transition-colors flex items-center gap-1 group">
                                                                    <Trophy className="h-4 w-4 text-yellow-600/80 group-hover:text-yellow-600" />
                                                                    <span className="text-[10px] text-muted-foreground group-hover:text-foreground">Ver Palpites</span>
                                                                </div>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-64 p-3" align="start">
                                                                <div className="space-y-2">
                                                                    <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">Seleções Escolhidas</h4>
                                                                    {user.teamPicks.map((pick, i) => {
                                                                        const isChampion = pick === "Espanha" && i === 0;
                                                                        return (
                                                                            <div key={i} className={`flex items-center gap-3 p-2 rounded-md transition-all duration-300 ${isChampion ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' : 'bg-muted/30 opacity-60 grayscale'}`}>
                                                                                <div className="font-bold text-xs w-4 text-muted-foreground">{i + 1}º</div>
                                                                                <img src={getFlagUrl(pick)} alt={pick} className="w-6 h-4 object-cover rounded shadow-sm" />
                                                                                <span className={`text-sm font-medium ${isChampion ? 'text-yellow-700 dark:text-yellow-500' : ''}`}>{pick}</span>
                                                                                {isChampion && <span className="ml-auto text-xs">🏆</span>}
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                </div>
                                            )}
                                            {!isLegacy && (
                                                <p className="text-xs text-muted-foreground truncate mt-1">{user.nome}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Desktop Stats Columns */}
                                    <div className="hidden sm:block w-16 text-center shrink-0">
                                        <div className="font-bold text-lg text-primary">
                                            {user.totalPoints || 0}
                                        </div>
                                    </div>
                                    <div className="hidden sm:block w-16 text-center text-sm font-medium text-muted-foreground shrink-0">{user.exactScores}</div>
                                    <div className="hidden sm:block w-16 text-center text-sm font-medium text-muted-foreground shrink-0">{user.outcomes}</div>

                                    {/* Mobile Dynamic Column */}
                                    <div className="sm:hidden w-16 text-center shrink-0">
                                        <div className={`font-bold text-lg ${sortBy === 'totalPoints' ? 'text-primary' : 'text-muted-foreground'}`}>
                                            {sortBy === 'totalPoints' && (user.totalPoints || 0)}
                                            {sortBy === 'exactScores' && (user.exactScores || 0)}
                                            {sortBy === 'outcomes' && (user.outcomes || 0)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {users.length === 0 && !loading && (
                            <div className="p-8 text-center text-muted-foreground">
                                Nenhum jogador pontuou neste campeonato ainda.
                            </div>
                        )}
                        {loading && (
                            <div className="p-8 text-center text-muted-foreground animate-pulse">
                                Carregando ranking...
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
