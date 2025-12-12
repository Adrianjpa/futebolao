"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit, where, documentId } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Crown, Lightbulb, Siren, Flame } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface UserProfile {
    id: string;
    nome: string;
    nickname?: string;
    fotoPerfil?: string;
    totalPoints?: number;
    championshipPoints?: number; // Calculated dynamically
}

interface Championship {
    id: string;
    name: string;
    status: string;
    createdAt: any;
}

export default function RankingPage() {
    const { user: currentUser } = useAuth();
    const searchParams = useSearchParams();
    const initialChampionshipId = searchParams.get("championship") || "all";

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [championships, setChampionships] = useState<Championship[]>([]);
    const [selectedChampionship, setSelectedChampionship] = useState<string>(initialChampionshipId);

    useEffect(() => {
        fetchChampionships();
    }, []);

    useEffect(() => {
        if (selectedChampionship !== "all") {
            fetchRanking();
        }
    }, [selectedChampionship]);

    const fetchChampionships = async () => {
        try {
            const q = query(collection(db, "championships"));
            const snap = await getDocs(q);
            const data: Championship[] = [];
            snap.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Championship));

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

            // Championship Specific Ranking
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
                const userPointsMap = new Map<string, number>();
                relevantPreds.forEach(p => {
                    const current = userPointsMap.get(p.userId) || 0;
                    userPointsMap.set(p.userId, current + (p.points || 0));
                });

                // 4. Fetch User Details for those who have points
                const userIds = Array.from(userPointsMap.keys());
                if (userIds.length > 0) {
                    // Fetch users in batches of 10
                    const userDocs: any[] = [];
                    for (let i = 0; i < userIds.length; i += 10) {
                        const chunk = userIds.slice(i, i + 10);
                        const usersQ = query(collection(db, "users"), where(documentId(), "in", chunk));
                        const usersSnap = await getDocs(usersQ);
                        usersSnap.forEach(d => userDocs.push({ id: d.id, ...d.data() }));
                    }

                    rankedUsers = userDocs.map(u => ({
                        ...u,
                        totalPoints: userPointsMap.get(u.id) || 0 // Override totalPoints with championship points for display
                    }));

                    rankedUsers.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
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
                <div className="absolute -top-1 -right-1">
                    <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
                </div>
            </div>
        );

        // Top 3
        if (index === 1) return <Medal className="h-6 w-6 text-gray-400" />;
        if (index === 2) return <Medal className="h-6 w-6 text-amber-700" />;

        // Last Place (Lantern)
        if (index === totalUsers - 1 && totalUsers > 3) return (
            <div className="relative" title="Lanterna">
                <Siren className="h-8 w-8 text-red-600 animate-pulse" />
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[8px] font-bold bg-red-100 text-red-800 px-1 rounded">LANTERNA</span>
            </div>
        );

        return <span className="text-lg font-bold text-muted-foreground w-6 text-center">{index + 1}</span>;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Ranking</h1>

                <div className="w-full md:w-[250px]">
                    <Select value={selectedChampionship} onValueChange={setSelectedChampionship}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione um Campeonato" />
                        </SelectTrigger>
                        <SelectContent>
                            {championships.map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                    {c.name} {c.status === 'ativo' && '(Ativo)'}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Classificação</span>
                        {selectedChampionship !== 'all' && <span className="text-sm font-normal text-muted-foreground">Pontos neste campeonato</span>}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {users.map((user, index) => {
                            const isCurrentUser = currentUser?.uid === user.id;
                            const isLast = index === users.length - 1 && users.length > 3;

                            return (
                                <div
                                    key={user.id}
                                    className={`flex items-center p-4 transition-all duration-300 
                                        ${isCurrentUser ? "bg-primary/10 hover:bg-primary/15 border-l-4 border-primary" : "hover:bg-muted/50"}
                                        ${index === 0 ? "bg-yellow-50/50 dark:bg-yellow-900/10" : ""}
                                        ${isLast ? "bg-red-50/50 dark:bg-red-900/10" : ""}
                                    `}
                                >
                                    <div className="mr-4 flex-shrink-0 w-10 flex justify-center">
                                        {getRankIcon(index, users.length)}
                                    </div>
                                    <Avatar className={`h-10 w-10 mr-4 border-2 ${index === 0 ? "border-yellow-500 shadow-lg shadow-yellow-500/20" : "border-primary/10"}`}>
                                        <AvatarImage src={user.fotoPerfil} />
                                        <AvatarFallback>{user.nome?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <Link href={`/dashboard/profile/${user.id}`} className="hover:underline cursor-pointer">
                                            <p className="text-sm font-medium truncate leading-none flex items-center gap-2">
                                                {user.nickname || user.nome}
                                                {isCurrentUser && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold">VOCÊ</span>}
                                                {index === 0 && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-bold border border-yellow-200">LÍDER</span>}
                                            </p>
                                        </Link>
                                        <p className="text-xs text-muted-foreground truncate mt-1">{user.nome}</p>
                                    </div>
                                    <div className="flex flex-col items-end ml-4">
                                        <div className="font-bold text-lg">
                                            {user.totalPoints || 0} <span className="text-xs font-normal text-muted-foreground">pts</span>
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
