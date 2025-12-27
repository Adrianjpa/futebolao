"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy, limit, startAfter, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { UnifiedMatchCard } from "@/components/UnifiedMatchCard";
import { Button } from "@/components/ui/button";

interface Championship {
    id: string;
    name: string;
    category?: string;
    teamMode?: string;
}

interface Match {
    id: string;
    homeTeamName: string;
    awayTeamName: string;
    homeTeamCrest?: string;
    awayTeamCrest?: string;
    homeScore: number;
    awayScore: number;
    date: any;
    round: string;
    status: "finished";
    championshipId: string;
    championshipName?: string;
}

const ITEMS_PER_PAGE = 10;

export default function HistoryClient() {
    const [championships, setChampionships] = useState<Championship[]>([]);
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [selectedChampionship, setSelectedChampionship] = useState<string>("all");
    const [matches, setMatches] = useState<Match[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination State
    const [pageStack, setPageStack] = useState<QueryDocumentSnapshot[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLastPage, setIsLastPage] = useState(false);

    // Computed
    const filteredChampionships = championships.filter(c => {
        if (categoryFilter === 'all') return true;
        return (c.category || 'other') === categoryFilter;
    });

    useEffect(() => {
        fetchChampionships();
        fetchUsers();
    }, []);

    useEffect(() => {
        // Debounce or just load when filters change
        loadPage(1);
    }, [selectedChampionship, categoryFilter, championships]);

    const fetchChampionships = async () => {
        const q = query(collection(db, "championships"));
        const snap = await getDocs(q);
        const data: Championship[] = [];
        snap.forEach(doc => {
            const d = doc.data();
            if (d.status !== 'arquivado') {
                data.push({ id: doc.id, ...d } as Championship);
            }
        });
        setChampionships(data);
    };

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

    const loadPage = async (page: number, stack = pageStack) => {
        setLoading(true);
        try {
            let baseQuery;

            if (selectedChampionship !== "all") {
                // Specific Championship selected
                baseQuery = query(
                    collection(db, "matches"),
                    where("championshipId", "==", selectedChampionship),
                    where("status", "==", "finished"),
                    orderBy("date", "desc")
                );
            } else if (categoryFilter !== "all") {
                // Category selected (get IDs of championships in this category)
                const categoryChampIds = filteredChampionships.map(c => c.id);

                if (categoryChampIds.length === 0) {
                    // No championships in this category, return empty
                    setMatches([]);
                    setLoading(false);
                    return;
                }

                // Firestore 'in' limit is 10. If > 10, we might need to batch or just filter client side after fetching by date.
                // For now, let's assume < 10 for specific categories or take top 10. 
                // A better approach for scalability is to duplicate 'category' on the match document.
                // PROPOSAL: Since we can't easily edit all matches now, take the first 10 IDs.
                const safeIds = categoryChampIds.slice(0, 10);

                baseQuery = query(
                    collection(db, "matches"),
                    where("championshipId", "in", safeIds),
                    where("status", "==", "finished"),
                    orderBy("date", "desc")
                );
            } else {
                // All Matches
                baseQuery = query(
                    collection(db, "matches"),
                    where("status", "==", "finished"),
                    orderBy("date", "desc")
                );
            }

            // Determine Start After Doc
            let startAfterDoc = null;
            if (page > 1 && stack[page - 2]) {
                startAfterDoc = stack[page - 2];
            }

            // Query
            let q = query(baseQuery, limit(ITEMS_PER_PAGE));
            if (startAfterDoc) {
                q = query(baseQuery, startAfter(startAfterDoc), limit(ITEMS_PER_PAGE));
            }

            const snap = await getDocs(q);

            // Map Results
            const champMap = new Map(championships.map(c => [c.id, c.name]));
            const newMatches: Match[] = [];
            snap.forEach(doc => {
                const matchData = doc.data();
                newMatches.push({
                    id: doc.id,
                    ...matchData,
                    championshipName: champMap.get(matchData.championshipId) || "Campeonato Desconhecido"
                } as Match);
            });

            setMatches(newMatches);
            setCurrentPage(page);
            setIsLastPage(snap.docs.length < ITEMS_PER_PAGE);

            // Update Stack
            if (snap.docs.length > 0) {
                const lastDoc = snap.docs[snap.docs.length - 1];
                setPageStack(prev => {
                    const newStack = [...prev];
                    newStack[page - 1] = lastDoc;
                    return newStack;
                });
            } else if (page > 1) {
                // If we got no results but page > 1, it means we reached empty end?
                setIsLastPage(true);
            }

        } catch (error) {
            console.error("Error loading page:", error);
        } finally {
            setLoading(false);
        }
    };

    const goNext = () => {
        if (!isLastPage) {
            loadPage(currentPage + 1);
        }
    };

    const goPrev = () => {
        if (currentPage > 1) {
            loadPage(currentPage - 1);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Histórico de Partidas</h1>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <Select value={categoryFilter} onValueChange={(val) => {
                        setCategoryFilter(val);
                        setSelectedChampionship("all"); // Reset specific championship which might not belong to new category
                        setPageStack([]);
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
                            <SelectItem value="champions_league">Champions League</SelectItem>
                            <SelectItem value="libertadores">Libertadores</SelectItem>
                            <SelectItem value="other">Outros</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={selectedChampionship} onValueChange={(val) => {
                        setSelectedChampionship(val);
                        setPageStack([]);
                    }}>
                        <SelectTrigger className="w-full sm:w-[260px]">
                            <SelectValue placeholder="Campeonato" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Campeonatos</SelectItem>
                            {filteredChampionships.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-4">
                {matches.length === 0 && !loading && (
                    <p className="text-muted-foreground text-center py-8">Nenhuma partida finalizada encontrada.</p>
                )}

                {loading && (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                )}

                {!loading && matches.map((match) => (
                    <UnifiedMatchCard
                        key={match.id}
                        match={match}
                        users={users}
                        finished
                        showBetButton={false}
                        showChampionshipName={selectedChampionship === 'all'}
                        teamMode={championships.find(c => c.id === match.championshipId)?.teamMode || "clubes"}
                    />
                ))}

                {!loading && (matches.length > 0 || currentPage > 1) && (
                    <div className="flex items-center justify-between pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={goPrev}
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
                            onClick={goNext}
                            disabled={isLastPage}
                            className="w-[120px]"
                        >
                            Próxima <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
