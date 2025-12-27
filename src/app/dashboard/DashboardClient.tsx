"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, orderBy, limit, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, ArrowRight, Loader2, Activity, History } from "lucide-react";
import Link from "next/link";
import { isPast } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UnifiedMatchCard } from "@/components/UnifiedMatchCard";

export default function DashboardClient() {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [liveMatches, setLiveMatches] = useState<any[]>([]);
    const [nextMatches, setNextMatches] = useState<any[]>([]);
    const [recentMatches, setRecentMatches] = useState<any[]>([]);
    const [topUsers, setTopUsers] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]); // Store all users for avatars
    const [userPredictions, setUserPredictions] = useState<Set<string>>(new Set());
    const [championshipsMap, setChampionshipsMap] = useState<Record<string, any>>({});

    const isAdmin = profile?.funcao === "admin";

    // 1. Initial Data Fetch (Static or less frequent)
    useEffect(() => {
        if (!user) return;

        const fetchStaticData = async () => {
            try {
                // Fetch Championships
                const champsSnap = await getDocs(collection(db, "championships"));
                const champMap: Record<string, any> = {};
                champsSnap.forEach(doc => {
                    champMap[doc.id] = { id: doc.id, ...doc.data() };
                });
                setChampionshipsMap(champMap);

                // Fetch User Predictions
                const predsQ = query(collection(db, "predictions"), where("userId", "==", user.uid));
                const predsSnap = await getDocs(predsQ);
                const predSet = new Set(predsSnap.docs.map(d => d.data().matchId));
                setUserPredictions(predSet);

                // Fetch All Users
                const usersQ = query(collection(db, "users"));
                const usersSnap = await getDocs(usersQ);
                const usersData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllUsers(usersData);

                // Fetch Top Users (Ranking) - Could also be real-time if needed, but keeping static for now to save reads
                const rankingQ = query(collection(db, "users"), orderBy("totalPoints", "desc"), limit(5));
                const rankingSnap = await getDocs(rankingQ);
                setTopUsers(rankingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            } catch (error) {
                console.error("Error fetching static data:", error);
            }
        };

        fetchStaticData();
    }, [user]);

    // 2. Real-time Listeners for Matches
    const [activeMatches, setActiveMatches] = useState<any[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update current time every 10 seconds
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 10000);
        return () => clearInterval(timer);
    }, []);

    // Filter matches based on time
    useEffect(() => {
        const live: any[] = [];
        const next: any[] = [];

        activeMatches.forEach(match => {
            const matchDate = match.date.toDate();
            // Optimistic Live: If status is live OR (scheduled AND past start time)
            if (match.status === 'live' || (match.status === 'scheduled' && isPast(matchDate))) {
                // Ensure optimistic score is 0x0 if not set
                const optimisticMatch = {
                    ...match,
                    homeScore: match.homeScore ?? 0,
                    awayScore: match.awayScore ?? 0
                };
                live.push(optimisticMatch);
            } else if (match.status !== 'finished') {
                next.push(match);
            }
        });

        setLiveMatches(live);
        setNextMatches(next.slice(0, 5));
    }, [activeMatches, currentTime]);

    // Firestore Listener
    useEffect(() => {
        if (!user || Object.keys(championshipsMap).length === 0) return;

        setLoading(true);

        // Active Matches Listener (Live, Scheduled, and recently Finished)
        // We include finished matches to ensure we catch the final score update
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const activeQ = query(
            collection(db, "matches"),
            where("date", ">=", todayStart), // Only fetch matches from today onwards
            orderBy("date", "asc")
        );

        const unsubscribeActive = onSnapshot(activeQ, (snapshot) => {
            const active: any[] = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                const match = {
                    id: doc.id,
                    ...data,
                    championshipName: championshipsMap[data.championshipId]?.name,
                    championshipType: championshipsMap[data.championshipId]?.type,
                    apiId: data.apiId
                };
                active.push(match);
            });

            setActiveMatches(active);
            setLoading(false);
        });

        // Recent Matches Listener (Finished)
        const recentQ = query(
            collection(db, "matches"),
            where("status", "==", "finished"),
            orderBy("date", "desc"),
            limit(5)
        );

        const unsubscribeRecent = onSnapshot(recentQ, (snapshot) => {
            setRecentMatches(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                championshipName: championshipsMap[doc.data().championshipId]?.name,
                championshipType: championshipsMap[doc.data().championshipId]?.type,
                apiId: doc.data().apiId
            })));
        });

        // Also listen for User Ranking updates if we want points to update in real-time
        const rankingQ = query(collection(db, "users"), orderBy("totalPoints", "desc"), limit(5));
        const unsubscribeRanking = onSnapshot(rankingQ, (snapshot) => {
            setTopUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubscribeActive();
            unsubscribeRecent();
            unsubscribeRanking();
        };
    }, [user, championshipsMap]); // Re-run when championshipsMap is loaded

    // Helper to refresh data manually if needed (mostly for predictions now)
    const fetchData = async () => {
        // We can keep this for manual refreshes of non-realtime data if any
        // But for now, matches are realtime.
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            </div>

            {/* Live Matches Section - HERO */}
            {liveMatches.length > 0 ? (
                <Card className="border-red-200 bg-red-50/10 w-full">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center text-red-600 text-xl">
                                <Activity className="mr-2 h-6 w-6 animate-pulse" />
                                AO VIVO
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        {liveMatches.map((match) => (
                            <UnifiedMatchCard
                                key={match.id}
                                match={match}
                                live
                                showBetButton={!isAdmin}
                                hasPrediction={userPredictions.has(match.id)}
                                isAdmin={isAdmin}
                                onUpdate={fetchData}
                                users={allUsers}
                                showChampionshipName={true}
                            />
                        ))}
                    </CardContent>
                </Card>
            ) : (
                <Card className="bg-muted/30 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Activity className="h-8 w-8 mb-2 opacity-20" />
                        <p>Nenhum jogo ao vivo no momento.</p>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
                <div className="lg:col-span-4 space-y-6">

                    {/* Next Matches Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Calendar className="mr-2 h-5 w-5" />
                                Próximos Jogos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            {nextMatches.length > 0 ? (
                                nextMatches.map((match) => (
                                    <UnifiedMatchCard
                                        key={match.id}
                                        match={match}
                                        showBetButton={!isAdmin}
                                        hasPrediction={userPredictions.has(match.id)}
                                        isAdmin={isAdmin}
                                        onUpdate={fetchData}
                                        users={allUsers}
                                        showChampionshipName={true}
                                    />
                                ))
                            ) : (
                                <p className="text-muted-foreground text-center py-4">Nenhum jogo agendado.</p>
                            )}
                            {nextMatches.length > 0 && (
                                <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
                                    <Link href="/dashboard/matches">
                                        Ver mais <ArrowRight className="ml-1 h-3 w-3" />
                                    </Link>
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Results Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <History className="mr-2 h-5 w-5" />
                                Resultados Recentes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            {recentMatches.length > 0 ? (
                                recentMatches.map((match) => (
                                    <UnifiedMatchCard
                                        key={match.id}
                                        match={match}
                                        finished
                                        showBetButton={false}
                                        hasPrediction={userPredictions.has(match.id)}
                                        isAdmin={isAdmin}
                                        onUpdate={fetchData}
                                        users={allUsers}
                                        showChampionshipName={true}
                                    />
                                ))
                            ) : (
                                <p className="text-muted-foreground text-center py-4">Nenhum resultado recente.</p>
                            )}
                            {recentMatches.length > 0 && (
                                <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
                                    <Link href="/dashboard/history">
                                        Ver mais <ArrowRight className="ml-1 h-3 w-3" />
                                    </Link>
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Ranking Section - Leaders per Championship */}
                <div className="lg:col-span-3 space-y-6 w-full flex flex-col">
                    <Card className="w-full h-full flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
                                Líderes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {Object.values(championshipsMap).filter((c: any) => c.status === 'ativo').map((champ: any) => {
                                    // Fallback: Use global top user as leader for now
                                    const leader = topUsers[0];

                                    return (
                                        <div key={champ.id} className="p-4 rounded-xl bg-accent/30 border flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden group hover:border-primary/50 transition-colors">
                                            {/* Championship Name Badge */}
                                            <div className="absolute top-0 left-0 w-full bg-primary/10 text-[10px] font-bold uppercase tracking-wider py-1 text-primary">
                                                {champ.name}
                                            </div>

                                            <div className="mt-4 relative">
                                                <div className="absolute -top-3 -right-3 bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-10">
                                                    1º
                                                </div>
                                                <Avatar className="h-14 w-14 border-2 border-yellow-500 shadow-md">
                                                    <AvatarImage src={leader?.fotoPerfil || leader?.photoURL} />
                                                    <AvatarFallback>{(leader?.nickname || leader?.nome || leader?.name || "?").substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                            </div>

                                            <div className="flex flex-col mb-2">
                                                <Link href={`/dashboard/profile/${leader?.id}`} className="hover:underline cursor-pointer">
                                                    <span className="font-bold text-sm truncate max-w-[120px]">{leader?.nickname || leader?.nome || leader?.name || "Sem Líder"}</span>
                                                </Link>
                                                <span className="text-xs text-muted-foreground font-mono font-bold">{leader?.totalPoints || 0} pts</span>
                                            </div>

                                            <Button variant="ghost" size="sm" className="w-full h-7 text-xs mt-auto" asChild>
                                                <Link href={`/dashboard/ranking?championship=${champ.id}`}>
                                                    Ver Ranking <ArrowRight className="ml-1 h-3 w-3" />
                                                </Link>
                                            </Button>
                                        </div>
                                    );
                                })}
                                {Object.values(championshipsMap).filter((c: any) => c.status === 'ativo').length === 0 && (
                                    <div className="w-full text-center text-muted-foreground text-sm py-4">
                                        Nenhum campeonato ativo.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
