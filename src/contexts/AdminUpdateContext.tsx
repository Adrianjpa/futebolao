"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { collection, query, where, orderBy, getDocs, doc, writeBatch, serverTimestamp, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface AdminUpdateContextType {
    isUpdating: boolean;
    logs: string[];
    progress: number;
    intervalMinutes: number;
    runUpdate: () => Promise<void>;
}

const AdminUpdateContext = createContext<AdminUpdateContextType | undefined>(undefined);

export function AdminUpdateProvider({ children }: { children: ReactNode }) {
    const { profile } = useAuth();
    const isAdmin = profile?.funcao === 'admin';

    const [isUpdating, setIsUpdating] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);
    const [intervalMinutes, setIntervalMinutes] = useState(3);
    const [matchesToUpdate, setMatchesToUpdate] = useState<any[]>([]);
    const [championshipsMap, setChampionshipsMap] = useState<Record<string, any>>({});

    const activeMatchesRef = useRef<any[]>([]);
    const championshipsMapRef = useRef<Record<string, any>>({});
    const isUpdatingRef = useRef(false);

    // 1. Listen for Config
    useEffect(() => {
        if (!isAdmin) return;
        const unsub = onSnapshot(doc(db, "system_settings", "config"), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setIntervalMinutes(data.apiUpdateInterval || 3);
            }
        });
        return () => unsub();
    }, [isAdmin]);

    // 2. Load Championships
    useEffect(() => {
        if (!isAdmin) return;
        const fetchChamps = async () => {
            const champsSnap = await getDocs(collection(db, "championships"));
            const champMap: Record<string, any> = {};
            champsSnap.forEach(doc => {
                champMap[doc.id] = { id: doc.id, ...doc.data() };
            });
            setChampionshipsMap(champMap);
            championshipsMapRef.current = champMap;
        };
        fetchChamps();
    }, [isAdmin]);

    // 3. Listen for Matches
    useEffect(() => {
        if (!isAdmin) return;
        // if (Object.keys(championshipsMap).length === 0) return; // Removed forcing map dependency to start listener earlier

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const activeQ = query(
            collection(db, "matches"),
            where("date", ">=", todayStart),
            orderBy("date", "asc")
        );

        const unsubscribe = onSnapshot(activeQ, (snapshot) => {
            const active: any[] = [];
            snapshot.forEach(doc => {
                active.push({ id: doc.id, ...doc.data() });
            });
            activeMatchesRef.current = active;
            setMatchesToUpdate(active);
        });

        return () => unsubscribe();
    }, [isAdmin]);

    // 4. Core Update Logic
    const runUpdate = async () => {
        if (isUpdatingRef.current) return;
        isUpdatingRef.current = true;
        setIsUpdating(true);
        setLogs([]); // Clear logs on new run

        const addLog = (msg: string) => {
            console.log(`[AutoUpdate] ${msg}`);
            setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
        };

        try {
            addLog("Iniciando ciclo de atualização...");
            const currentActiveMatches = activeMatchesRef.current;
            const currentChamps = championshipsMapRef.current;

            // Check if we need to run
            const hasLiveMatches = currentActiveMatches.some(m => ['live', 'IN_PLAY', 'PAUSED'].includes(m.status));
            const hasPotentialStarts = currentActiveMatches.some(m => {
                const matchDate = m.date?.toDate();
                return m.status === 'scheduled' && matchDate && matchDate <= new Date();
            });

            if (!hasLiveMatches && !hasPotentialStarts) {
                addLog("Nenhum jogo ao vivo ou prestes a começar.");
                setIsUpdating(false);
                isUpdatingRef.current = false;
                setProgress(0); // Reset visual progress
                return;
            }

            // Prepare Fetch
            let dateFromStr = "";
            let dateToStr = "";

            if (currentActiveMatches.length > 0) {
                const oldestMatchDate = currentActiveMatches.reduce((min, match) => {
                    const d = match.date.toDate();
                    return d < min ? d : min;
                }, new Date());
                const safeFromDate = new Date(oldestMatchDate);
                safeFromDate.setDate(safeFromDate.getDate() - 1);
                dateFromStr = `&dateFrom=${format(safeFromDate, 'yyyy-MM-dd')}`;
                dateToStr = `&dateTo=${format(new Date(), 'yyyy-MM-dd')}`;
            }

            const competitionCodes = Object.values(currentChamps)
                .map(c => c.apiCode || c.externalId)
                .filter(code => code && typeof code === 'string' && code.length < 5);

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
                        return [];
                    }
                });
                const results = await Promise.all(promises);
                apiMatches = results.flat();
            } else {
                addLog("Buscando globalmente (Sem filtros de liga)");
                const apiUrl = `/api/football-data/matches?status=IN_PLAY,PAUSED,FINISHED${dateFromStr}${dateToStr}`;
                const res = await fetch(apiUrl);
                if (res.ok) {
                    const data = await res.json();
                    apiMatches = data.matches || [];
                }
            }

            addLog(`Total Jogos API: ${apiMatches.length}`);

            if (apiMatches.length > 0) {
                const batch = writeBatch(db);
                let updatesCount = 0;
                const apiMatchesMap = new Map(apiMatches.map((m: any) => [m.id, m]));

                let scorePriority: 'regular' | 'full' = 'regular';
                try {
                    const settingsSnap = await getDoc(doc(db, "system_settings", "config"));
                    if (settingsSnap.exists()) {
                        scorePriority = settingsSnap.data().scorePriority || 'regular';
                    }
                } catch (e) { }

                for (const localMatch of currentActiveMatches) {
                    let apiMatch = apiMatchesMap.get(localMatch.apiId || localMatch.externalId);

                    if (!apiMatch) {
                        apiMatch = apiMatches.find((m: any) =>
                            m.homeTeam.name === localMatch.homeTeamName &&
                            m.awayTeam.name === localMatch.awayTeamName
                        );
                        if (apiMatch) {
                            addLog(`Link Inteligente: ${localMatch.homeTeamName} -> ID ${(apiMatch as any).id}`);
                            const matchRef = doc(db, "matches", localMatch.id);
                            batch.update(matchRef, { apiId: (apiMatch as any).id });
                        }
                    }

                    if (apiMatch) {
                        let newStatus = 'scheduled';
                        const liveStatuses = ['IN_PLAY', 'PAUSED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'];
                        const finishedStatuses = ['FINISHED', 'AWARDED', 'CANCELLED', 'POSTPONED', 'SUSPENDED'];

                        if (liveStatuses.includes(apiMatch.status)) newStatus = 'live';
                        if (finishedStatuses.includes(apiMatch.status)) newStatus = 'finished';

                        let apiHomeScore = 0;
                        let apiAwayScore = 0;

                        if (liveStatuses.includes(apiMatch.status)) {
                            apiHomeScore = apiMatch.score.fullTime?.home ?? 0;
                            apiAwayScore = apiMatch.score.fullTime?.away ?? 0;
                        } else {
                            if (apiMatch.score.duration === 'REGULAR') {
                                apiHomeScore = apiMatch.score.fullTime?.home ?? 0;
                                apiAwayScore = apiMatch.score.fullTime?.away ?? 0;
                            } else if (scorePriority === 'regular') {
                                apiHomeScore = apiMatch.score.regularTime?.home ?? apiMatch.score.fullTime?.home ?? 0;
                                apiAwayScore = apiMatch.score.regularTime?.away ?? apiMatch.score.fullTime?.away ?? 0;
                            } else {
                                apiHomeScore = apiMatch.score.fullTime?.home ?? 0;
                                apiAwayScore = apiMatch.score.fullTime?.away ?? 0;
                            }
                        }

                        if (localMatch.homeScore !== apiHomeScore ||
                            localMatch.awayScore !== apiAwayScore ||
                            localMatch.status !== newStatus) {

                            addLog(`Atualizando: ${localMatch.homeTeamName} (${apiHomeScore}x${apiAwayScore}) [${newStatus}]`);
                            const matchRef = doc(db, "matches", localMatch.id);
                            batch.update(matchRef, {
                                homeScore: apiHomeScore,
                                awayScore: apiAwayScore,
                                status: newStatus,
                                lastUpdated: serverTimestamp()
                            });
                            updatesCount++;
                        }
                    }
                }

                if (updatesCount > 0) {
                    await batch.commit();
                    addLog(`SUCESSO: ${updatesCount} jogos atualizados no banco.`);
                } else {
                    addLog("Nenhuma alteração de placar necessária.");
                }
            } else {
                addLog("Nenhum dado relevante retornado da API.");
            }

        } catch (error) {
            console.error(error);
            addLog(`ERRO: ${error}`);
        } finally {
            setIsUpdating(false);
            isUpdatingRef.current = false;
            setProgress(0); // Reset progress bar
        }
    };

    // 5. Timer Logic (Smoothed Time-Based Progress)
    const lastRunPeriodRef = useRef<number>(0);

    useEffect(() => {
        if (!isAdmin) return;

        const updateFreq = 100; // ms
        const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;

        // Initialize period to avoid immediate run on mount
        lastRunPeriodRef.current = Math.floor(Date.now() / intervalMs);

        const timer = setInterval(() => {
            const now = Date.now();
            const currentPeriod = Math.floor(now / intervalMs);

            // Calculate progress based on absolute time
            const rawProgress = (now % intervalMs) / intervalMs;
            setProgress(rawProgress * 100);

            // Check boundary crossing
            if (currentPeriod > lastRunPeriodRef.current) {
                lastRunPeriodRef.current = currentPeriod;
                runUpdate();
            }

        }, updateFreq);

        return () => clearInterval(timer);
    }, [isAdmin, intervalMinutes]);

    return (
        <AdminUpdateContext.Provider value={{ isUpdating, logs, progress, intervalMinutes, runUpdate }}>
            {children}
        </AdminUpdateContext.Provider>
    );
}

export function useAdminUpdate() {
    const context = useContext(AdminUpdateContext);
    if (context === undefined) {
        throw new Error("useAdminUpdate must be used within an AdminUpdateProvider");
    }
    return context;
}
