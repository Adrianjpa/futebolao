"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, orderBy, limit, getDocs, doc, writeBatch, serverTimestamp, updateDoc, onSnapshot, increment, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, ArrowRight, Loader2, Activity, History, CloudLightning, RefreshCw, CheckCircle2, UserX, AlertTriangle, Edit } from "lucide-react";
import Link from "next/link";
import { format, differenceInHours, isPast, isToday, differenceInMinutes, isTomorrow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Countdown } from "@/components/ui/countdown";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { calculatePoints } from "@/lib/scoring";
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
    const [updating, setUpdating] = useState(false);
    const [autoUpdate, setAutoUpdate] = useState(true);

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

    // Refs for Stale Closure Fix
    const liveMatchesRef = useRef(liveMatches);
    const nextMatchesRef = useRef(nextMatches);

    useEffect(() => {
        liveMatchesRef.current = liveMatches;
    }, [liveMatches]);

    useEffect(() => {
        nextMatchesRef.current = nextMatches;
    }, [nextMatches]);

    const activeMatchesRef = useRef(activeMatches);
    useEffect(() => {
        activeMatchesRef.current = activeMatches;
    }, [activeMatches]);

    const championshipsMapRef = useRef(championshipsMap);
    useEffect(() => {
        championshipsMapRef.current = championshipsMap;
    }, [championshipsMap]);

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

    // Auto-Update Effect
    useEffect(() => {
        let interval: NodeJS.Timeout;

        const startAutoUpdate = async () => {
            if (autoUpdate && isAdmin) {
                // Fetch configured interval
                let updateIntervalMs = 180000; // Default 3 mins
                try {
                    const settingsSnap = await getDoc(doc(db, "system_settings", "config"));
                    if (settingsSnap.exists()) {
                        const settings = settingsSnap.data();
                        if (settings.apiUpdateInterval) {
                            updateIntervalMs = settings.apiUpdateInterval * 60 * 1000;
                        }
                    }
                } catch (e) {
                    console.error("Error fetching settings for interval", e);
                }

                handleUpdateScores(); // Run immediately
                interval = setInterval(handleUpdateScores, updateIntervalMs);
            }
        };

        startAutoUpdate();

        return () => clearInterval(interval);
    }, [autoUpdate, isAdmin]);

    // Debug Logs State
    const [debugLogs, setDebugLogs] = useState<string[]>([]);

    // ... (existing code) ...

    const handleUpdateScores = async () => {
        if (!isAdmin) return;
        setUpdating(true);
        setDebugLogs([]); // Clear previous logs
        const addLog = (msg: string) => setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

        try {
            addLog("Iniciando atualização...");

            // Use Refs to avoid stale closures
            const currentActiveMatches = activeMatchesRef.current;

            // Determine date range based on oldest live match to catch stuck matches
            let dateFromStr = "";
            let dateToStr = "";

            if (currentActiveMatches.length > 0) {
                const oldestMatchDate = currentActiveMatches.reduce((min, match) => {
                    const d = match.date.toDate();
                    return d < min ? d : min;
                }, new Date());

                // Go back 1 extra day just to be safe
                const safeFromDate = new Date(oldestMatchDate);
                safeFromDate.setDate(safeFromDate.getDate() - 1);

                dateFromStr = `&dateFrom=${format(safeFromDate, 'yyyy-MM-dd')}`;
                dateToStr = `&dateTo=${format(new Date(), 'yyyy-MM-dd')}`;
            }

            // Filter by Competitions
            const currentChamps = championshipsMapRef.current;
            const competitionCodes = Object.values(currentChamps)
                .map(c => c.apiCode || c.externalId) // Assume apiCode or externalId holds the API competition code (e.g. "PL")
                .filter(code => code && typeof code === 'string' && code.length < 5); // Basic validation for code

            const uniqueCodes = Array.from(new Set(competitionCodes));

            let apiMatches: any[] = [];

            if (uniqueCodes.length > 0) {
                addLog(`Buscando por Ligas: ${uniqueCodes.join(', ')}`);

                const promises = uniqueCodes.map(async (code) => {
                    const url = `/api/football-data/matches?code=${code}&status=IN_PLAY,PAUSED,FINISHED${dateFromStr}${dateToStr}`;
                    try {
                        const res = await fetch(url);
                        if (!res.ok) {
                            addLog(`Erro Liga ${code}: ${res.statusText}`);
                            return [];
                        }
                        const data = await res.json();
                        return data.matches || [];
                    } catch (err) {
                        addLog(`Erro Liga ${code}: ${err}`);
                        return [];
                    }
                });

                const results = await Promise.all(promises);
                apiMatches = results.flat();
            } else {
                // Fallback to global if no codes found (or if user has no active championships with codes)
                addLog(`Sem códigos de liga, buscando global...`);
                const apiUrl = `/api/football-data/matches?status=IN_PLAY,PAUSED,FINISHED${dateFromStr}${dateToStr}`;
                const res = await fetch(apiUrl);
                if (!res.ok) throw new Error("Failed to fetch live matches");
                const data = await res.json();
                apiMatches = data.matches || [];
            }

            addLog(`Total Jogos encontrados: ${apiMatches.length}`);

            if (apiMatches.length === 0) {
                if (!autoUpdate) alert("Nenhum jogo ao vivo ou finalizado recentemente na API.");
                setUpdating(false);
                return;
            }

            let updatesCount = 0;
            const batch = writeBatch(db);

            // Create a map of API matches for faster lookup
            const apiMatchesMap = new Map(apiMatches.map((m: any) => [m.id, m]));

            // Helper to check and update match
            const updateMatchIfChanged = (localMatch: any, apiMatch: any, scorePriority: 'regular' | 'full' = 'regular') => {
                let changed = false;

                // Map API status to local status
                let newStatus = 'scheduled';
                const liveStatuses = ['IN_PLAY', 'PAUSED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'];
                const finishedStatuses = ['FINISHED', 'AWARDED', 'CANCELLED', 'POSTPONED', 'SUSPENDED']; // Treat others as finished/stopped for now

                if (liveStatuses.includes(apiMatch.status)) newStatus = 'live';
                if (finishedStatuses.includes(apiMatch.status)) newStatus = 'finished';

                // Determine Score based on Priority
                let apiHomeScore = 0;
                let apiAwayScore = 0;

                // DEBUG: Log raw score object
                addLog(`RAW SCORE [${localMatch.homeTeamName}]: ${JSON.stringify(apiMatch.score)}`);

                if (liveStatuses.includes(apiMatch.status)) {
                    // LIVE MATCHES: Always use fullTime (current score)
                    apiHomeScore = apiMatch.score.fullTime?.home ?? 0;
                    apiAwayScore = apiMatch.score.fullTime?.away ?? 0;
                } else {
                    // FINISHED MATCHES
                    if (apiMatch.score.duration === 'REGULAR') {
                        // If ended in regular time, fullTime IS the regular time score
                        apiHomeScore = apiMatch.score.fullTime?.home ?? 0;
                        apiAwayScore = apiMatch.score.fullTime?.away ?? 0;
                    } else if (scorePriority === 'regular') {
                        // If Extra Time/Penalties AND we want Regular time (90min)
                        // Try regularTime, fallback to fullTime if missing (though regularTime should be there)
                        apiHomeScore = apiMatch.score.regularTime?.home ?? apiMatch.score.fullTime?.home ?? 0;
                        apiAwayScore = apiMatch.score.regularTime?.away ?? apiMatch.score.fullTime?.away ?? 0;
                    } else {
                        // If Extra Time/Penalties AND we want Full Result
                        apiHomeScore = apiMatch.score.fullTime?.home ?? 0;
                        apiAwayScore = apiMatch.score.fullTime?.away ?? 0;
                    }
                }

                const logMsg = `[${localMatch.homeTeamName}] API: ${apiMatch.status} (Reg:${apiMatch.score.regularTime?.home}x${apiMatch.score.regularTime?.away} | Full:${apiMatch.score.fullTime?.home}x${apiMatch.score.fullTime?.away}) -> Resolved: ${apiHomeScore}x${apiAwayScore}`;
                addLog(logMsg);
                console.log(logMsg);

                if (localMatch.homeScore !== apiHomeScore ||
                    localMatch.awayScore !== apiAwayScore ||
                    localMatch.status !== newStatus) {

                    addLog(`>>> ATUALIZANDO: ${localMatch.homeTeamName}`);
                    const matchRef = doc(db, "matches", localMatch.id);
                    batch.update(matchRef, {
                        homeScore: apiHomeScore,
                        awayScore: apiAwayScore,
                        status: newStatus,
                        lastUpdated: serverTimestamp()
                    });
                    changed = true;
                }
                return changed;
            };

            // Fetch Settings for Priority
            let scorePriority: 'regular' | 'full' = 'regular';
            try {
                const settingsSnap = await getDoc(doc(db, "system_settings", "config"));
                if (settingsSnap.exists()) {
                    scorePriority = settingsSnap.data().scorePriority || 'regular';
                }
            } catch (e) {
                console.error("Error fetching settings for priority", e);
            }

            // 1. Check ALL Active Matches (Live, Scheduled, Finished Today)
            for (const localMatch of currentActiveMatches) {
                let apiMatch = apiMatchesMap.get(localMatch.apiId || localMatch.externalId);

                // SMART LINK: If no ID match, try to find by Team Names
                if (!apiMatch) {
                    apiMatch = apiMatches.find((m: any) =>
                        m.homeTeam.name === localMatch.homeTeamName &&
                        m.awayTeam.name === localMatch.awayTeamName
                    );

                    if (apiMatch) {
                        // Found a match! Auto-heal the link
                        addLog(`SMART LINK: Vinculado ${localMatch.homeTeamName} ao ID ${(apiMatch as any).id}`);
                        const matchRef = doc(db, "matches", localMatch.id);
                        batch.update(matchRef, { apiId: (apiMatch as any).id }); // Save the link for future
                    }
                }

                if (apiMatch) {
                    if (updateMatchIfChanged(localMatch, apiMatch, scorePriority)) {
                        updatesCount++;
                    }
                } else if (localMatch.status !== 'scheduled') {
                    addLog(`SEM DADOS NA API: ${localMatch.homeTeamName} x ${localMatch.awayTeamName} (ID: ${localMatch.apiId || 'N/A'})`);
                }
            }





            if (updatesCount > 0) {
                await batch.commit();
                if (!autoUpdate) alert(`${updatesCount} partidas atualizadas!`);
                fetchData(); // Refresh UI
            } else {
                if (!autoUpdate) alert("Tudo atualizado! Nenhuma mudança nos placares.");
            }

        } catch (error) {
            console.error("Error updating scores:", error);
            if (!autoUpdate) alert("Erro ao atualizar placares.");
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            </div>

            {/* Debug Section for Admin */}
            {isAdmin && (
                <Card className="bg-slate-950 text-slate-200 border-slate-800 mb-6">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-mono flex items-center gap-2">
                            <Activity className="h-4 w-4 text-blue-400" />
                            Debug de Atualização
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs font-mono space-y-1">
                        <p>Total Jogos "Ao Vivo" (Local): {liveMatches.length}</p>

                        {/* Live Matches List */}
                        <div className="max-h-40 overflow-y-auto bg-slate-900 p-2 rounded border border-slate-800 mb-2">
                            {liveMatches.map(m => {
                                const hasId = m.apiId || m.externalId;
                                return (
                                    <div key={m.id} className="flex flex-col border-b border-slate-800 py-1 last:border-0 gap-1">
                                        <div className="flex justify-between">
                                            <span className="truncate max-w-[200px] font-bold text-white">{m.homeTeamName} x {m.awayTeamName}</span>
                                            <span className={hasId ? "text-green-400" : "text-red-400"}>
                                                {hasId ? `ID: ${m.apiId || m.externalId}` : "SEM VÍNCULO"}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Logs Section */}
                        <div className="border-t border-slate-800 pt-2">
                            <p className="font-bold text-blue-400 mb-1">Logs de Execução:</p>
                            <div className="h-40 overflow-y-auto bg-black p-2 rounded border border-slate-800 text-[10px] text-green-500 font-mono">
                                {debugLogs.length > 0 ? (
                                    debugLogs.map((log, i) => (
                                        <div key={i} className="whitespace-nowrap">{log}</div>
                                    ))
                                ) : (
                                    <span className="text-slate-500">Clique em "Atualizar" para ver os logs...</span>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
            {/* Live Matches Section - HERO */}
            {liveMatches.length > 0 ? (
                <Card className="border-red-200 bg-red-50/10 w-full">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center text-red-600 text-xl">
                                <Activity className="mr-2 h-6 w-6 animate-pulse" />
                                AO VIVO
                            </CardTitle>
                            {isAdmin && (
                                <div className="flex items-center">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleUpdateScores}
                                        disabled={updating}
                                        className="bg-background hover:bg-accent"
                                    >
                                        {updating ? <Loader2 className="h-4 w-4 animate-spin sm:mr-2" /> : <RefreshCw className="h-4 w-4 sm:mr-2" />}
                                        <span className="hidden sm:inline">Atualizar</span>
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={autoUpdate ? "default" : "outline"}
                                        onClick={() => setAutoUpdate(!autoUpdate)}
                                        className={`ml-2 ${autoUpdate ? "bg-green-600 hover:bg-green-700" : ""}`}
                                    >
                                        <span className="hidden sm:inline">{autoUpdate ? "Auto: ON" : "Auto: OFF"}</span>
                                        <span className="sm:hidden">{autoUpdate ? "ON" : "OFF"}</span>
                                    </Button>
                                </div>
                            )}
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
                                {Object.values(championshipsMap).filter((c: any) => c.status !== 'arquivado').map((champ: any) => {
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
                                {Object.values(championshipsMap).filter((c: any) => c.status !== 'arquivado').length === 0 && (
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
