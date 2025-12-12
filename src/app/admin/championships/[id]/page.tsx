"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, addDoc, query, where, getDocs, writeBatch, orderBy, onSnapshot, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Loader2, Calendar, Trophy, Edit, Trash2, AlertTriangle, Archive, RefreshCcw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Link from "next/link";
import { format } from "date-fns";

interface Championship {
    id: string;
    name: string;
    type: string;
    status: string;
    apiCode?: string;
    creationType?: string;
    startDate?: any;
    endDate?: any;
}

export default function ChampionshipDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [championship, setChampionship] = useState<Championship | null>(null);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const handleSyncSchedule = async () => {
        if (!championship) return;
        setSyncing(true);
        try {
            const response = await fetch("/api/admin/sync-schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ championshipId: championship.id })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Erro ao sincronizar");
            alert(data.message || "Sincronização concluída!");
        } catch (error: any) {
            console.error("Sync error:", error);
            alert(`Erro: ${error.message}`);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        const fetchChampionship = async () => {
            if (!params.id) return;
            try {
                const docRef = doc(db, "championships", params.id as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setChampionship({ id: docSnap.id, ...docSnap.data() } as Championship);
                } else {
                    alert("Campeonato não encontrado");
                    router.push("/admin/championships");
                }
            } catch (error) {
                console.error("Error fetching championship:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchChampionship();
    }, [params.id, router]);

    const handleDelete = async () => {
        if (!championship) return;

        setIsDeleting(true);
        try {
            // Helper to delete in batches
            const deleteInBatches = async (querySnapshot: any) => {
                const BATCH_SIZE = 500;
                let batch = writeBatch(db);
                let count = 0;

                for (const doc of querySnapshot.docs) {
                    batch.delete(doc.ref);
                    count++;

                    if (count >= BATCH_SIZE) {
                        await batch.commit();
                        batch = writeBatch(db);
                        count = 0;
                    }
                }

                if (count > 0) {
                    await batch.commit();
                }
            };

            // 1. Delete Predictions
            const predictionsQuery = query(collection(db, "predictions"), where("championshipId", "==", championship.id));
            const predictionsSnap = await getDocs(predictionsQuery);
            await deleteInBatches(predictionsSnap);

            // 2. Delete Matches
            const matchesQuery = query(collection(db, "matches"), where("championshipId", "==", championship.id));
            const matchesSnap = await getDocs(matchesQuery);
            await deleteInBatches(matchesSnap);

            // 3. Delete Championship
            await deleteDoc(doc(db, "championships", championship.id));

            alert("Campeonato excluído com sucesso!");
            router.push("/admin/championships");
        } catch (error: any) {
            console.error("Erro ao excluir:", error);
            alert(`Erro ao excluir campeonato: ${error.message}`);
        } finally {
            setIsDeleting(false);
            setIsDeleteOpen(false);
        }
    };

    const handleArchive = async () => {
        if (!championship) return;
        const newStatus = championship.status === "arquivado" ? "ativo" : "arquivado";
        const confirmMessage = newStatus === "arquivado"
            ? "Tem certeza que deseja arquivar este campeonato? Ele não aparecerá mais na lista principal."
            : "Tem certeza que deseja desarquivar este campeonato?";

        if (!confirm(confirmMessage)) return;

        try {
            const docRef = doc(db, "championships", championship.id);
            await updateDoc(docRef, { status: newStatus });
            setChampionship({ ...championship, status: newStatus });
            alert(`Campeonato ${newStatus === "arquivado" ? "arquivado" : "desarquivado"} com sucesso!`);
            router.push("/admin/championships");
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Erro ao atualizar status do campeonato.");
        }
    };

    const handleImportMatches = async () => {
        if (!championship?.apiCode) return;

        setImporting(true);
        try {
            // 1. Fetch matches from our API proxy
            const response = await fetch(`/api/football-data/matches?code=${championship.apiCode}`);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error(`Acesso negado (403). Verifique se o código "${championship.apiCode}" está no seu plano da API ou se a chave é válida.`);
                }
                throw new Error(data.error || "Falha ao buscar jogos na API.");
            }

            const apiMatches = data.matches;
            if (!apiMatches || apiMatches.length === 0) {
                alert("Nenhum jogo encontrado na API para este código.");
                return;
            }

            // 2. Fetch existing matches to prevent duplicates
            const q = query(collection(db, "matches"), where("championshipId", "==", championship.id));
            const querySnapshot = await getDocs(q);
            const existingMatchesMap = new Map();
            querySnapshot.forEach(doc => {
                const data = doc.data();
                if (data.externalId) {
                    existingMatchesMap.set(data.externalId, doc.id);
                }
            });

            // 3. Save matches to Firestore
            const batch = writeBatch(db);
            let count = 0;
            let updatedCount = 0;

            for (const match of apiMatches) {
                const externalId = match.id;
                let matchRef;

                if (existingMatchesMap.has(externalId)) {
                    // Update existing match
                    matchRef = doc(db, "matches", existingMatchesMap.get(externalId));
                    updatedCount++;
                } else {
                    // Create new match
                    matchRef = doc(collection(db, "matches"));
                    count++;
                }

                // Map API status to our internal status
                let status = "scheduled";
                if (match.status === "FINISHED") {
                    status = "finished";
                } else if (match.status === "IN_PLAY" || match.status === "PAUSED") {
                    status = "live";
                }

                // Extract scores if available
                let homeScore = match.score?.fullTime?.home ?? null;
                let awayScore = match.score?.fullTime?.away ?? null;

                // Hybrid Mode Logic: If live and scores are null, set to 0x0
                if (status === "live") {
                    if (homeScore === null) homeScore = 0;
                    if (awayScore === null) awayScore = 0;
                }

                const matchData: any = {
                    championshipId: championship.id,
                    externalId: externalId,
                    homeTeamName: match.homeTeam.name,
                    awayTeamName: match.awayTeam.name,
                    homeTeamId: match.homeTeam.id?.toString() || "unknown",
                    awayTeamId: match.awayTeam.id?.toString() || "unknown",
                    homeTeamCrest: match.homeTeam.crest,
                    awayTeamCrest: match.awayTeam.crest,
                    date: new Date(match.utcDate),
                    round: `Rodada ${match.matchday}`,
                    status: status,
                    homeScore: homeScore,
                    awayScore: awayScore,
                };

                // Only set createdAt on creation
                if (!existingMatchesMap.has(externalId)) {
                    matchData.createdAt = new Date();
                }

                // API Overwrite: Always merge/overwrite with API data
                batch.set(matchRef, matchData, { merge: true });
            }

            await batch.commit();
            alert(`${count} novos jogos importados e ${updatedCount} atualizados!`);

        } catch (error: any) {
            console.error("Error importing matches:", error);
            alert(`Erro ao importar jogos: ${error.message}`);
        } finally {
            setImporting(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!championship) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-3xl font-bold tracking-tight">{championship.name}</h1>
                <Badge variant={championship.status === "ativo" ? "default" : "secondary"}>
                    {championship.status}
                </Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Detalhes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Tipo:</span>
                            <span className="font-medium capitalize">{championship.type}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Modo de Criação:</span>
                            <span className="font-medium capitalize">{championship.creationType || "Manual"}</span>
                        </div>
                        {championship.apiCode && (
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Código API:</span>
                                <Badge variant="outline">{championship.apiCode}</Badge>
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Início:</span>
                            <span>{championship.startDate ? format(championship.startDate.toDate(), "dd/MM/yyyy") : "-"}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Ações</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Link href={`/admin/championships/${championship.id}/edit`} className="w-full">
                                <Button variant="outline" className="w-full">
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                </Button>
                            </Link>
                            <Button variant="secondary" className="w-full" onClick={handleArchive}>
                                {championship.status === "arquivado" ? (
                                    <>
                                        <RefreshCcw className="mr-2 h-4 w-4" />
                                        Desarquivar
                                    </>
                                ) : (
                                    <>
                                        <Archive className="mr-2 h-4 w-4" />
                                        Arquivar
                                    </>
                                )}
                            </Button>
                            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="destructive" className="w-full">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Excluir
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Excluir Campeonato</DialogTitle>
                                        <DialogDescription>
                                            Tem certeza que deseja excluir este campeonato? Esta ação não pode ser desfeita e apagará permanentemente todos os jogos e palpites associados.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
                                            Cancelar
                                        </Button>
                                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                                            {isDeleting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Excluindo...
                                                </>
                                            ) : (
                                                "Confirmar Exclusão"
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            {/* Sync Schedule Button */}
                            {championship.apiCode && (
                                <Button
                                    variant="outline"
                                    className="w-full border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                                    onClick={handleSyncSchedule}
                                    disabled={syncing}
                                >
                                    {syncing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Sincronizando...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCcw className="mr-2 h-4 w-4" />
                                            Sincronizar Calendário
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>

                        {championship.apiCode && (
                            <Button
                                onClick={handleImportMatches}
                                disabled={importing}
                                className="w-full"
                            >
                                {importing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Importando...
                                    </>
                                ) : (
                                    <>
                                        <Download className="mr-2 h-4 w-4" />
                                        Importar Jogos da API
                                    </>
                                )}
                            </Button>
                        )}
                        {!championship.apiCode && (
                            <p className="text-sm text-muted-foreground text-center">
                                Este campeonato não possui código de API vinculado.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Jogos Importados</CardTitle>
                </CardHeader>
                <CardContent>
                    <MatchList championshipId={championship.id} />
                </CardContent>
            </Card>
        </div>
    );
}

function MatchList({ championshipId }: { championshipId: string }) {
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        const q = query(collection(db, "matches"), where("championshipId", "==", championshipId), orderBy("date", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const matchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMatches(matchesData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [championshipId]);

    if (loading) return <div className="text-center p-4">Carregando jogos...</div>;

    if (matches.length === 0) {
        return <div className="text-center text-muted-foreground p-4">Nenhum jogo importado ainda.</div>;
    }

    const totalPages = Math.ceil(matches.length / ITEMS_PER_PAGE);
    const paginatedMatches = matches.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                {paginatedMatches.map((match) => (
                    <div key={match.id} className="p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                        {/* Mobile Layout (< sm) */}
                        <div className="flex flex-col items-center gap-2 sm:hidden">
                            {/* Row 1: Status */}
                            <Badge variant={match.status === "finished" ? "secondary" : match.status === "live" ? "destructive" : "outline"} className="capitalize text-[10px]">
                                {match.status === "live" ? "Ao Vivo" : match.status === "finished" ? "Finalizado" : "Agendado"}
                            </Badge>

                            {/* Row 2: Home Flag - Score - Away Flag */}
                            <div className="flex items-center justify-center gap-4 w-full">
                                {/* Home Team */}
                                <Popover>
                                    <PopoverTrigger>
                                        {match.homeTeamCrest ? (
                                            <img src={match.homeTeamCrest} alt={match.homeTeamName} className="h-10 w-10 object-contain" />
                                        ) : (
                                            <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center text-xs font-bold">
                                                {match.homeTeamName.substring(0, 2)}
                                            </div>
                                        )}
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-2 text-sm font-medium">
                                        {match.homeTeamName}
                                    </PopoverContent>
                                </Popover>

                                {/* Score */}
                                <div className="font-bold px-3 py-1 bg-muted rounded text-lg min-w-[60px] text-center whitespace-nowrap">
                                    {match.status === "finished" || match.status === "live" ? `${match.homeScore ?? 0} x ${match.awayScore ?? 0}` : "x"}
                                </div>

                                {/* Away Team */}
                                <Popover>
                                    <PopoverTrigger>
                                        {match.awayTeamCrest ? (
                                            <img src={match.awayTeamCrest} alt={match.awayTeamName} className="h-10 w-10 object-contain" />
                                        ) : (
                                            <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center text-xs font-bold">
                                                {match.awayTeamName.substring(0, 2)}
                                            </div>
                                        )}
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-2 text-sm font-medium">
                                        {match.awayTeamName}
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Row 3: Date/Time */}
                            <div className="text-xs text-muted-foreground">
                                {format(match.date.toDate(), "dd/MM HH:mm")}
                            </div>
                        </div>

                        {/* Desktop Layout (>= sm) - Original */}
                        <div className="hidden sm:flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1 justify-start w-full">
                                <div className="flex items-center gap-2 flex-1 justify-end">
                                    <span className="font-medium text-right text-base truncate">{match.homeTeamName}</span>
                                    {match.homeTeamCrest && <img src={match.homeTeamCrest} alt={match.homeTeamName} className="h-8 w-8 object-contain" />}
                                </div>
                                <div className="font-bold px-2 py-1 bg-muted rounded text-sm min-w-[50px] text-center whitespace-nowrap">
                                    {match.status === "finished" || match.status === "live" ? `${match.homeScore ?? 0} x ${match.awayScore ?? 0}` : "x"}
                                </div>
                                <div className="flex items-center gap-2 flex-1 justify-start">
                                    {match.awayTeamCrest && <img src={match.awayTeamCrest} alt={match.awayTeamName} className="h-8 w-8 object-contain" />}
                                    <span className="font-medium text-left text-base truncate">{match.awayTeamName}</span>
                                </div>
                            </div>
                            <div className="ml-4 flex flex-col items-end gap-1 min-w-[100px]">
                                <div className="text-xs text-muted-foreground">{format(match.date.toDate(), "dd/MM HH:mm")}</div>
                                <Badge variant={match.status === "finished" ? "secondary" : match.status === "live" ? "destructive" : "outline"} className="capitalize text-xs">
                                    {match.status === "live" ? "Ao Vivo" : match.status === "finished" ? "Finalizado" : "Agendado"}
                                </Badge>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

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
