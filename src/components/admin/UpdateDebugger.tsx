"use client";

import { useState, useRef, useEffect } from "react";
import { collection, query, where, orderBy, limit, getDocs, doc, writeBatch, serverTimestamp, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Fix import path
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Activity, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { BannerConfigForm } from "@/components/banner/BannerConfigForm";
import { ChampionBanner } from "@/components/banner/ChampionBanner";
import { BannerConfig, BannerWinner } from "@/types/banner";

export function UpdateDebugger() {
    const [loading, setLoading] = useState(true);
    const [liveMatches, setLiveMatches] = useState<any[]>([]);
    const [championshipsMap, setChampionshipsMap] = useState<Record<string, any>>({});
    const [updating, setUpdating] = useState(false);
    const [autoUpdate, setAutoUpdate] = useState(true);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);

    const activeMatchesRef = useRef<any[]>([]);
    const championshipsMapRef = useRef<Record<string, any>>({});
    const [lastSystemUpdate, setLastSystemUpdate] = useState<Date | null>(null);

    const [legacyBannerMode, setLegacyBannerMode] = useState(false);
    const [legacyWinners, setLegacyWinners] = useState<BannerWinner[]>([]);
    const [bannerConfig, setBannerConfig] = useState<BannerConfig>({
        active: true,
        titleColor: "#FFFFFF",
        subtitleColor: "#FBBF24",
        namesColor: "#FFFFFF",
        displayMode: "photo_and_names",
        layoutStyle: "modern"
    });

    const handleLoadLegacyForBanner = async () => {
        try {
            // Simplified for this tool: Hardcoded known winners from the JSON we just processed
            const winners: BannerWinner[] = [
                {
                    userId: "adriano_legacy",
                    displayName: "Adriano",
                    photoUrl: "",
                    position: "champion"
                },
                {
                    userId: "elisson_legacy",
                    displayName: "Elisson",
                    photoUrl: "",
                    position: "gold_winner"
                },
                {
                    userId: "anderson_legacy",
                    displayName: "Anderson",
                    photoUrl: "",
                    position: "gold_winner"
                }
            ];

            setLegacyWinners(winners);
            setLegacyBannerMode(!legacyBannerMode);
            setDebugLogs(prev => [...prev, "Dados da Euro 2012 carregados para o Banner!"]);

        } catch (e) {
            console.error(e);
        }
    };

    // 1. Fetch Static Data & Listeners
    useEffect(() => {
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

        // Check last system update (proven by DB)
        const fetchLastUpdate = async () => {
            const q = query(collection(db, "matches"), orderBy("lastUpdated", "desc"), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const date = snap.docs[0].data().lastUpdated?.toDate();
                if (date) setLastSystemUpdate(date);
            }
        };
        fetchLastUpdate();

        // Poll for last update every minute to show cron activity
        const pollInterval = setInterval(fetchLastUpdate, 60000);
        return () => clearInterval(pollInterval);
    }, []);

    useEffect(() => {
        if (Object.keys(championshipsMap).length === 0) return;

        setLoading(true);
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
                const data = doc.data();
                // Filter specifically for "Live-ish" matches for the debugger list
                if (data.status === 'live' || data.status === 'IN_PLAY' || data.status === 'PAUSED') {
                    const match = {
                        id: doc.id,
                        ...data,
                        championshipName: championshipsMap[data.championshipId]?.name,
                        apiId: data.apiId
                    };
                    active.push(match);
                }
            });
            setLiveMatches(active);

            // For update logic, we need ALL active matches (including scheduled for today)
            const allActive: any[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                allActive.push({ id: doc.id, ...data });
            });
            activeMatchesRef.current = allActive;

            setLoading(false);
        });

        return () => unsubscribe();
    }, [championshipsMap]);


    // 2. Update Logic (Copied from DashboardClient)
    const handleUpdateScores = async () => {
        setUpdating(true);
        setDebugLogs([]);
        const addLog = (msg: string) => setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

        try {
            addLog("Iniciando atualização...");
            const currentActiveMatches = activeMatchesRef.current;

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

            const currentChamps = championshipsMapRef.current;
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
                        addLog(`Erro Liga ${code}: ${err}`);
                        return [];
                    }
                });
                const results = await Promise.all(promises);
                apiMatches = results.flat();
            } else {
                addLog(`Sem códigos de liga, buscando global...`);
                const apiUrl = `/api/football-data/matches?status=IN_PLAY,PAUSED,FINISHED${dateFromStr}${dateToStr}`;
                const res = await fetch(apiUrl);
                if (!res.ok) throw new Error("Failed to fetch live matches");
                const data = await res.json();
                apiMatches = data.matches || [];
            }

            addLog(`Total Jogos encontrados na API: ${apiMatches.length}`);

            if (apiMatches.length === 0) {
                if (!autoUpdate) alert("Nenhum jogo ao vivo ou finalizado recentemente na API.");
                setUpdating(false);
                return;
            }

            let updatesCount = 0;
            const batch = writeBatch(db);
            const apiMatchesMap = new Map(apiMatches.map((m: any) => [m.id, m]));

            // Helper to check and update match
            const updateMatchIfChanged = (localMatch: any, apiMatch: any, scorePriority: 'regular' | 'full' = 'regular') => {
                let changed = false;
                let newStatus = 'scheduled';
                const liveStatuses = ['IN_PLAY', 'PAUSED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'];
                const finishedStatuses = ['FINISHED', 'AWARDED', 'CANCELLED', 'POSTPONED', 'SUSPENDED'];

                if (liveStatuses.includes(apiMatch.status)) newStatus = 'live';
                if (finishedStatuses.includes(apiMatch.status)) newStatus = 'finished';

                let apiHomeScore = 0;
                let apiAwayScore = 0;

                addLog(`RAW SCORE [${localMatch.homeTeamName}]: ${JSON.stringify(apiMatch.score)}`);

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

                const logMsg = `[${localMatch.homeTeamName}] API: ${apiMatch.status} -> Resolved: ${apiHomeScore}x${apiAwayScore}`;
                addLog(logMsg);

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

            let scorePriority: 'regular' | 'full' = 'regular';
            try {
                const settingsSnap = await getDoc(doc(db, "system_settings", "config"));
                if (settingsSnap.exists()) {
                    scorePriority = settingsSnap.data().scorePriority || 'regular';
                }
            } catch (e) {
                console.error("Error fetching settings priority", e);
            }

            for (const localMatch of currentActiveMatches) {
                let apiMatch = apiMatchesMap.get(localMatch.apiId || localMatch.externalId);

                if (!apiMatch) {
                    apiMatch = apiMatches.find((m: any) =>
                        m.homeTeam.name === localMatch.homeTeamName &&
                        m.awayTeam.name === localMatch.awayTeamName
                    );
                    if (apiMatch) {
                        addLog(`SMART LINK: Vinculado ${localMatch.homeTeamName} ao ID ${(apiMatch as any).id}`);
                        const matchRef = doc(db, "matches", localMatch.id);
                        batch.update(matchRef, { apiId: (apiMatch as any).id });
                    }
                }

                if (apiMatch) {
                    if (updateMatchIfChanged(localMatch, apiMatch, scorePriority)) {
                        updatesCount++;
                    }
                } else if (localMatch.status !== 'scheduled') {
                    addLog(`SEM DADOS NA API: ${localMatch.homeTeamName} x ${localMatch.awayTeamName}`);
                }
            }

            if (updatesCount > 0) {
                await batch.commit();
                if (!autoUpdate) alert(`${updatesCount} partidas atualizadas!`);
            } else {
                if (!autoUpdate) alert("Tudo atualizado! Nenhuma mudança.");
            }

        } catch (error) {
            console.error("Error updating scores:", error);
            addLog(`ERRO CRÍTICO: ${error}`);
            if (!autoUpdate) alert("Erro ao atualizar placares.");
        } finally {
            setUpdating(false);
        }
    };

    return (
        <Card className="bg-slate-950 text-slate-200 border-slate-800">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-sm font-mono flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-400" />
                        Debug de Atualização
                    </CardTitle>
                    {lastSystemUpdate && (
                        <p className="text-[10px] text-muted-foreground font-mono mt-1 ml-6">
                            Última atualização do sistema: <span className="text-green-400 font-bold">{lastSystemUpdate.toLocaleTimeString()}</span>
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleUpdateScores}
                        disabled={updating}
                        className="h-8 bg-slate-900 border-slate-700 hover:bg-slate-800 text-xs"
                    >
                        {updating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                        Forçar Atualização
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="text-xs font-mono space-y-4">
                <div>
                    <p className="mb-2 font-bold text-slate-400">Jogos Monitorados (Ao Vivo/Hoje): {liveMatches.length}</p>
                    <div className="max-h-40 overflow-y-auto bg-slate-900 p-2 rounded border border-slate-800">
                        {liveMatches.length > 0 ? liveMatches.map(m => {
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
                        }) : <p className="text-slate-600">Nenhum jogo ao vivo encontrado.</p>}
                    </div>
                </div>

                <div className="border-t border-slate-800 pt-2">
                    <p className="font-bold text-blue-400 mb-1">Logs de Execução:</p>
                    <div className="h-64 overflow-y-auto bg-black p-2 rounded border border-slate-800 text-[10px] text-green-500 font-mono leading-tight">
                        {debugLogs.length > 0 ? (
                            debugLogs.map((log, i) => (
                                <div key={i} className="whitespace-nowrap">{log}</div>
                            ))
                        ) : (
                            <span className="text-slate-500">Aguardando execução...</span>
                        )}
                    </div>
                </div>

                <div className="border-t border-slate-800 pt-4 mt-4">
                    <h3 className="text-sm font-bold text-amber-500 mb-2">Ferramentas de Migração (Legacy)</h3>
                    <div className="flex gap-2 mb-4">
                        <Button
                            onClick={async () => {
                                if (!confirm("Importar dados da Euro 2012?")) return;
                                setDebugLogs(prev => [...prev, "Iniciando importação Euro 2012..."]);
                                try {
                                    const res = await fetch("/api/admin/import-legacy", { method: "POST" });
                                    const data = await res.json();
                                    setDebugLogs(prev => [...prev, `Importação: ${data.message}`]);
                                } catch (e) {
                                    setDebugLogs(prev => [...prev, `Erro Importação: ${e}`]);
                                }
                            }}
                            size="sm"
                            className="bg-amber-900 border-amber-700 hover:bg-amber-800 text-amber-100"
                        >
                            Importar Euro 2012 (Teste)
                        </Button>

                        <Button
                            onClick={handleLoadLegacyForBanner}
                            size="sm"
                            variant="outline"
                            className="border-amber-700 text-amber-500 hover:bg-amber-950"
                        >
                            {legacyBannerMode ? "Fechar Gerador" : "Gerar Banner Euro 2012"}
                        </Button>
                    </div>

                    {legacyBannerMode && (
                        <div className="bg-slate-900 p-4 rounded border border-slate-700 animate-in slide-in-from-top-2">
                            <h4 className="font-bold text-white mb-4">Configurar Banner Euro 2012</h4>

                            <div className="mb-6 flex justify-center">
                                <div className="w-full max-w-[500px] shadow-2xl">
                                    <ChampionBanner
                                        championshipName="Eurocopa 2012"
                                        config={bannerConfig}
                                        winners={legacyWinners}
                                        teamMode="selecoes"
                                    />
                                </div>
                            </div>

                            <BannerConfigForm
                                config={bannerConfig}
                                onChange={setBannerConfig}
                                hasTies={legacyWinners.filter(w => w.position === 'champion').length > 1 || legacyWinners.filter(w => w.position === 'gold_winner').length > 1}
                            />

                            <div className="mt-4 flex justify-end border-t border-slate-800 pt-4">
                                <Button
                                    onClick={async () => {
                                        if (!confirm("Salvar e publicar banner na página Hall da Fama?")) return;
                                        try {
                                            const { setDoc, doc, Timestamp } = await import("firebase/firestore");

                                            // Euro 2012 ID hardcoded for this tool
                                            const champId = "uefa_euro_2012";
                                            const champRef = doc(db, "championships", champId);

                                            await setDoc(champRef, {
                                                name: "Eurocopa 2012",
                                                status: "finished", // Important for Archive logic
                                                endDate: Timestamp.now(), // Use now or a fixed date
                                                bannerEnabled: true,
                                                bannerConfig: bannerConfig,
                                                manualWinners: legacyWinners,
                                                teamMode: "selecoes",
                                                // Minimal fields for app compatibility
                                                admins: ["adriano"],
                                                participants: ["adriano", "elisson", "anderson"],
                                                rules: {},
                                                category: "euro"
                                            }, { merge: true });

                                            console.log("Banner salvo com sucesso!");
                                            setDebugLogs(prev => [...prev, "Banner da Euro 2012 salvo e publicado no Hall da Fama!"]);
                                            alert("Banner Salvo! Verifique na página Hall da Fama.");

                                        } catch (e) {
                                            console.error("Erro ao salvar banner", e);
                                            alert("Erro ao salvar: " + e);
                                        }
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold"
                                >
                                    Salvar (Publicar no Hall)
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                        <h4 className="text-xs font-bold text-slate-500 uppercase">Ações de Banco de Dados</h4>
                        <Button
                            onClick={async () => {
                                if (!confirm("Importar tabela de jogos da Euro 2012?")) return;
                                setDebugLogs(prev => [...prev, "Iniciando importação de partidas..."]);
                                try {
                                    const res = await fetch("/api/admin/import-legacy?mode=matches", { method: "POST" });
                                    const data = await res.json();
                                    setDebugLogs(prev => [...prev, `Jogos: ${data.message}`]);
                                    alert(data.message);
                                } catch (e) {
                                    setDebugLogs(prev => [...prev, `Erro: ${e}`]);
                                    alert("Erro ao importar jogos");
                                }
                            }}
                            size="sm"
                            variant="secondary"
                            className="w-full border-slate-700 hover:bg-slate-800"
                        >
                            Importar Jogos Euro 2012 (Histórico)
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
