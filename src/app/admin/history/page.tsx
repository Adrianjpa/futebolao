"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy, limit, startAfter, endBefore, limitToLast, QueryDocumentSnapshot, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { UnifiedMatchCard } from "@/components/UnifiedMatchCard";
import { Button } from "@/components/ui/button";

interface Championship {
    id: string;
    name: string;
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

export default function AdminHistoryPage() {
    const [championships, setChampionships] = useState<Championship[]>([]);
    const [selectedChampionship, setSelectedChampionship] = useState<string>("all");
    const [matches, setMatches] = useState<Match[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination State
    const [lastDocs, setLastDocs] = useState<QueryDocumentSnapshot[]>([]); // Stack of last docs for each page
    const [currentPage, setCurrentPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(true);

    useEffect(() => {
        fetchChampionships();
        fetchUsers();
    }, []);

    useEffect(() => {
        if (championships.length > 0 || selectedChampionship === 'all') {
            resetAndFetch();
        }
    }, [selectedChampionship, championships]);

    const fetchChampionships = async () => {
        const q = query(collection(db, "championships"));
        const snap = await getDocs(q);
        const data: Championship[] = [];
        snap.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Championship));
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

    const resetAndFetch = () => {
        setLastDocs([]);
        setCurrentPage(1);
        setHasNextPage(true);
        fetchHistory(null);
    };

    const fetchHistory = async (startAfterDoc: QueryDocumentSnapshot | null) => {
        setLoading(true);
        try {
            let baseQuery;

            if (selectedChampionship === "all") {
                baseQuery = query(
                    collection(db, "matches"),
                    where("status", "==", "finished"),
                    orderBy("date", "desc")
                );
            } else {
                baseQuery = query(
                    collection(db, "matches"),
                    where("championshipId", "==", selectedChampionship),
                    where("status", "==", "finished"),
                    orderBy("date", "desc")
                );
            }

            // Apply pagination
            let q = query(baseQuery, limit(ITEMS_PER_PAGE));
            if (startAfterDoc) {
                q = query(baseQuery, startAfter(startAfterDoc), limit(ITEMS_PER_PAGE));
            }

            const snap = await getDocs(q);

            // Check next page availability (peek)
            setHasNextPage(snap.docs.length === ITEMS_PER_PAGE);

            // Create a lookup map for faster access
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

            setMatches(newMatches); // Replace matches instead of appending

        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleNextPage = () => {
        if (!hasNextPage || matches.length === 0) return;

        // Find the actual Firestore doc snapshot for the last item in the current View
        // We need to re-find it from the snapshot or store snapshots in state.
        // Better strategy: We can't easily get the snapshot from the plain object 'matches'.
        // We need the actual QueryDocumentSnapshot.
        // Correction: fetchHistory should store the actual snapshots if needed, or we just trust the last fetch.
        // Actually, we can just fetch the doc by ID? No, that's extra reads.
        // Let's modify fetchHistory to store the snapshots or the last snapshot.
    };

    // Refined implementation inside the component to handle snapshots correctly
    return <AdminHistoryPageImplementation />;
}

// Breaking out to keep clean logic / closure
function AdminHistoryPageImplementation() {
    const [championships, setChampionships] = useState<Championship[]>([]);
    const [selectedChampionship, setSelectedChampionship] = useState<string>("all");
    const [matches, setMatches] = useState<Match[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination: Stack of 'last visible' docs. 
    // Index 0 = End of Page 1. index 1 = End of Page 2.
    // To load Page 1: startAfter(null)
    // To load Page 2: startAfter(pageStack[0])
    // To load Page 3: startAfter(pageStack[1])
    const [pageStack, setPageStack] = useState<QueryDocumentSnapshot[]>([]);
    const [currentPage, setCurrentPage] = useState(1);

    // We determine 'hasNext' by checking if we got full page items. 
    // Ideally we peek +1 but limit is fine for simple Next button.
    const [isLastPage, setIsLastPage] = useState(false);

    useEffect(() => {
        fetchChampionships();
        fetchUsers();
    }, []);

    // When filter changes, reset everything
    useEffect(() => {
        if (championships.length > 0 || selectedChampionship === 'all') {
            loadPage(1);
        }
    }, [selectedChampionship, championships]);

    const fetchChampionships = async () => {
        const q = query(collection(db, "championships"));
        const snap = await getDocs(q);
        const data: Championship[] = [];
        snap.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Championship));
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
            if (selectedChampionship === "all") {
                baseQuery = query(collection(db, "matches"), where("status", "==", "finished"), orderBy("date", "desc"));
            } else {
                baseQuery = query(collection(db, "matches"), where("championshipId", "==", selectedChampionship), where("status", "==", "finished"), orderBy("date", "desc"));
            }

            // Determine Start After Doc
            let startAfterDoc = null;
            if (page > 1) {
                // To load Page X, we need the last doc of Page X-1.
                // Stack index for Page 1 end is 0. 
                // So for Page 2 start, we need stack[0].
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

            // Update Stack if we just loaded a new page that we haven't tracked yet
            // If we are on Page 1, we save its last doc to index 0.
            if (snap.docs.length > 0) {
                const lastDoc = snap.docs[snap.docs.length - 1];
                setPageStack(prev => {
                    const newStack = [...prev];
                    // Ensure we set the stack at the correct index for this page
                    newStack[page - 1] = lastDoc;
                    // Trim stack if we went back and changed filters (handled by reset)
                    return newStack;
                });
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

                <div className="w-full md:w-1/3">
                    <Select value={selectedChampionship} onValueChange={(val) => {
                        setSelectedChampionship(val);
                        setPageStack([]); // Reset stack on filter change
                        // loadPage(1) will trigger via useEffect
                    }}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filtrar por Campeonato" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Campeonatos</SelectItem>
                            {championships.map(c => (
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
