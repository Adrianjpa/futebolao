"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { format, isToday, isTomorrow, isYesterday, differenceInMinutes, differenceInHours } from "date-fns";
import { Calendar, ChevronDown, ChevronUp, CheckCircle2, Edit, Loader2, Trophy } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs, writeBatch, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { calculatePoints } from "@/lib/scoring";
import Link from "next/link";
import { Countdown } from "@/components/ui/countdown";

interface Match {
    id: string;
    homeTeamName: string;
    awayTeamName: string;
    homeTeamCrest?: string;
    awayTeamCrest?: string;
    homeScore: number;
    awayScore: number;
    date: any;
    round?: string;
    status: string;
    championshipName?: string;
    championshipType?: string;
    apiId?: string;
    apiStatus?: string; // New field for raw status
    isManual?: boolean; // New field for manual override
    betsOpen?: boolean; // New field for betting override
}

interface UnifiedMatchCardProps {
    match: Match;
    showChampionshipName?: boolean; // Controls specific layout logic
    onClick?: () => void;
    live?: boolean;
    finished?: boolean;
    showBetButton?: boolean;
    hasPrediction?: boolean;
    isAdmin?: boolean;
    onUpdate?: () => void;
    users?: any[];
}

export function UnifiedMatchCard({
    match,
    showChampionshipName = false,
    live,
    finished,
    showBetButton = false,
    hasPrediction,
    isAdmin,
    onUpdate,
    users = []
}: UnifiedMatchCardProps) {
    const matchDate = match.date?.seconds ? new Date(match.date.seconds * 1000) : new Date(match.date);
    const now = new Date();
    const hoursDiff = differenceInHours(matchDate, now);

    const isLive = live ?? (match.status === 'live' || match.status === 'IN_PLAY' || match.status === 'PAUSED');
    const isFinished = finished ?? (match.status === 'finished' || match.status === 'FINISHED');

    // Urgency & Locking
    // Urgency & Locking
    const isUrgent = !isAdmin && hoursDiff < 2 && hoursDiff >= 0 && !isFinished && !isLive;

    // NEW: Locking Logic with Override
    // Default Lock: Time passed OR Game Live/Finished
    const defaultLocked = now >= matchDate || isLive || isFinished;
    // Final Lock: Default Lock UNLESS Admin manually opened bets
    const isLocked = defaultLocked && !match.betsOpen;

    const canEdit = isAdmin && (isLive || isFinished || match.isManual) && match.championshipType !== 'AUTO'; // Allow edit if Manual
    const canFinish = isAdmin && (isLive || match.isManual);



    // States
    const [isEditing, setIsEditing] = useState(false);
    const [homeScore, setHomeScore] = useState(match.homeScore?.toString() || "0");
    const [awayScore, setAwayScore] = useState(match.awayScore?.toString() || "0");
    const [saving, setSaving] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [predictions, setPredictions] = useState<any[]>([]);
    const [loadingPreds, setLoadingPreds] = useState(false);
    const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);

    // Helpers
    const handleSaveScore = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setSaving(true);
        try {
            await updateDoc(doc(db, "matches", match.id), {
                homeScore: parseInt(homeScore),
                awayScore: parseInt(awayScore),
                lastUpdated: serverTimestamp()
            });
            setIsEditing(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Error updating score:", error);
            alert("Erro ao atualizar placar.");
        } finally {
            setSaving(false);
        }
    };

    const handleFinishMatch = async () => {
        setSaving(true);
        try {
            const home = parseInt(homeScore);
            const away = parseInt(awayScore);
            const matchRef = doc(db, "matches", match.id);
            await updateDoc(matchRef, {
                status: "finished",
                homeScore: home,
                awayScore: away,
                lastUpdated: serverTimestamp()
            });

            // Calculate Points
            const qPreds = query(collection(db, "predictions"), where("matchId", "==", match.id));
            const predsSnap = await getDocs(qPreds);
            const batch = writeBatch(db);

            predsSnap.forEach((docSnap) => {
                const pred = docSnap.data();
                const points = calculatePoints(pred.homeScore, pred.awayScore, home, away);
                batch.update(doc(db, "predictions", docSnap.id), { points });
                batch.update(doc(db, "users", pred.userId), { totalPoints: increment(points) });
            });

            await batch.commit();
            alert("Partida finalizada e pontos calculados!");
            setShowFinalizeDialog(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Error finishing match:", error);
            alert("Erro ao finalizar partida.");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleExpand = async () => {
        if (!expanded && predictions.length === 0) {
            setLoadingPreds(true);
            try {
                const snap = await getDocs(query(collection(db, "predictions"), where("matchId", "==", match.id)));
                setPredictions(snap.docs.map(d => d.data()));
            } catch (e) { console.error(e); } finally { setLoadingPreds(false); }
        }
        setExpanded(!expanded);
    };

    // Unified Status Badge Component
    const StatusBadge = () => {
        // 1. Check for specific API statuses first (Postponed, etc)
        const rawStatus = match.apiStatus || match.status;
        switch (rawStatus) {
            case 'POSTPONED': return <span className="bg-gray-500 text-white text-[10px] px-2 py-0.5 rounded font-bold">ADIADO</span>;
            case 'SUSPENDED': return <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded font-bold">SUSPENSO</span>;
            case 'CANCELLED': return <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded font-bold">CANCELADO</span>;
        }

        // 2. Standard Logic
        const minutesToStart = differenceInMinutes(matchDate, now);
        const showCountdown = minutesToStart < 60 && minutesToStart > 0 && !isLive && !isFinished;
        const isSoon = minutesToStart < 180 && minutesToStart >= 60 && !isLive && !isFinished;

        if (isLive) return <span className="text-[10px] font-bold text-red-600 animate-pulse bg-red-100 px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 bg-red-600 rounded-full" />AO VIVO</span>;
        if (isFinished) return <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">FINAL</span>;
        if (showCountdown) return <div onClick={(e) => e.stopPropagation()}><Countdown targetDate={matchDate} /></div>;
        if (isSoon) return <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">EM BREVE</span>;

        return null;
    };

    const TeamDisplay = ({ name, crest, align }: { name: string, crest?: string, align: 'left' | 'right' }) => (
        <>
            {/* Desktop: Name and Crest */}
            <div className={`hidden md:flex items-center gap-3 flex-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
                {align === 'right' && <span className="font-bold text-sm lg:text-base text-right truncate">{name}</span>}
                <div className="h-10 w-10 relative flex items-center justify-center">
                    {crest ? (
                        <img src={crest} alt={name} className="max-h-full max-w-full object-contain" />
                    ) : (
                        <div className="h-full w-full bg-muted rounded flex items-center justify-center text-[10px] font-bold">{(name || "").substring(0, 2)}</div>
                    )}
                </div>
                {align === 'left' && <span className="font-bold text-sm lg:text-base text-left truncate">{name}</span>}
            </div>

            {/* Mobile: Crest Only with Popover for Name */}
            <div className={`md:hidden flex items-center ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
                <Popover>
                    <PopoverTrigger asChild>
                        <div className="cursor-pointer active:scale-95 transition-transform relative h-12 w-12 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                            {crest ? (
                                <img src={crest} alt={name} className="max-h-full max-w-full object-contain" />
                            ) : (
                                <div className="h-8 w-8 bg-muted rounded flex items-center justify-center text-[10px] font-bold">{(name || "").substring(0, 2)}</div>
                            )}
                        </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2 text-xs font-bold text-center z-50 shadow-md border-primary/20" side="top">
                        {name}
                    </PopoverContent>
                </Popover>
            </div>
        </>
    );

    return (
        <Card className={`group relative overflow-hidden transition-colors duration-300 border hover:bg-accent/5 cursor-pointer`} onClick={handleToggleExpand}>
            <CardContent className="p-0">

                {/* 
                    LAYOUT STRUCTURE:
                    Row 1 (Header): [Round/Phase] --- [Championship (if needed)] --- [Status]
                    Row 2 (Main): [Team A] -- [Score] -- [Team B]
                    Row 3 (Footer - Center): [Date/Time]
                */}

                {/* HEADER ROW - Desktop & Mobile adapted */}
                <div className="flex items-center justify-between px-3 pt-2 pb-1 text-xs text-muted-foreground w-full relative">

                    {/* Top Left: Round or Championship Icon (Mobile) */}
                    <div className="flex items-center gap-2 flex-1">
                        {/* Mobile: Show Championship Icon if enabled */}
                        {showChampionshipName && (
                            <div className="md:hidden">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <Trophy className="h-4 w-4 text-primary" />
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-2 text-xs font-bold z-50">
                                        {match.championshipName || "Campeonato"}
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}

                        {/* Desktop: Round ALWAYS Left. Mobile: Hidden here (moves to center) */}
                        <span className="hidden md:inline-block font-mono bg-muted/50 px-2 py-0.5 rounded border">
                            {match.round || "Rodada --"}
                        </span>
                    </div>

                    {/* Top Center: Championship Name (Desktop only if enabled) */}
                    {showChampionshipName && match.championshipName && (
                        <div className="hidden md:flex flex-1 justify-center">
                            <span className="font-bold text-primary uppercase tracking-widest text-[10px]">{match.championshipName}</span>
                        </div>
                    )}
                    {!showChampionshipName && <div className="hidden md:flex flex-1" />}

                    {/* Top Right: Status */}
                    <div className="flex items-center justify-end flex-1 gap-1">
                        <StatusBadge />
                    </div>
                </div>

                {/* MAIN CONTENT */}
                <div className="flex flex-col items-center justify-center py-2 relative">

                    {/* Mobile Only: Round above score */}
                    <span className="md:hidden text-[10px] text-muted-foreground font-mono mb-1">
                        {match.round || "Rodada --"}
                    </span>

                    <div className="flex items-center justify-between w-full px-4 sm:px-8 gap-2 sm:gap-4">

                        {/* HOME TEAM */}
                        <TeamDisplay name={match.homeTeamName} crest={match.homeTeamCrest} align="right" />

                        {/* SCORE STACK */}
                        <div className="flex flex-col items-center min-w-[100px] z-10">

                            {/* Score Box */}
                            {isEditing ? (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="number"
                                        value={homeScore}
                                        onChange={(e) => setHomeScore(e.target.value)}
                                        className="w-10 h-9 text-center bg-background border rounded font-bold text-lg"
                                    />
                                    <span className="font-bold">:</span>
                                    <input
                                        type="number"
                                        value={awayScore}
                                        onChange={(e) => setAwayScore(e.target.value)}
                                        className="w-10 h-9 text-center bg-background border rounded font-bold text-lg"
                                    />
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 rounded-full hover:bg-green-100" onClick={handleSaveScore} disabled={saving}>
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                                    </Button>
                                </div>
                            ) : (
                                <div className="relative group/score">
                                    {(isLive || isFinished) ? (
                                        <div className="px-4 py-2 bg-muted/30 rounded-xl border flex items-center justify-center gap-3 shadow-inner min-w-[100px]">
                                            <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tighter">{match.homeScore}</span>
                                            <span className="text-muted-foreground/40 text-lg">-</span>
                                            <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tighter">{match.awayScore}</span>
                                        </div>
                                    ) : (
                                        <div className="px-4 py-2 flex items-center justify-center min-w-[100px]">
                                            <span className="text-2xl sm:text-3xl font-bold font-mono text-muted-foreground/30">vs</span>
                                        </div>
                                    )}

                                    {canEdit && (
                                        <div className="absolute -top-3 -right-3 opacity-0 group-hover/score:opacity-100 transition-opacity">
                                            <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full shadow border" onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>

                        {/* AWAY TEAM */}
                        <TeamDisplay name={match.awayTeamName} crest={match.awayTeamCrest} align="left" />
                    </div>

                    {/* Date/Time - Centered Below Score */}
                    {(!isLive || isFinished) && (
                        <div className="mt-2 text-xs text-muted-foreground font-medium flex items-center gap-1 bg-background/50 px-2 py-0.5 rounded-full border border-transparent hover:border-border transition-colors">
                            <Calendar className="h-3 w-3" />
                            {isToday(matchDate) ? "Hoje" : isTomorrow(matchDate) ? "Amanhã" : isYesterday(matchDate) ? "Ontem" : format(matchDate, "dd/MM")}
                            <span className="mx-0.5">•</span>
                            {format(matchDate, "HH:mm")}
                        </div>
                    )}

                    {/* Actions Area (Bet Button) */}
                    {showBetButton && !isLocked && !isEditing && (
                        <div className="mt-3">
                            <Button
                                size="sm"
                                className={`h-8 rounded-full px-6 text-xs font-bold transition-all shadow-sm ${hasPrediction ? 'bg-green-600 hover:bg-green-700 text-white' : isUrgent ? 'bg-yellow-500 hover:bg-yellow-600 text-white animate-pulse' : 'bg-primary/90 hover:bg-primary'}`}
                                asChild
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Link href={`/dashboard/matches/${match.id}`}>
                                    {hasPrediction ? "Palpite Feito" : "Palpitar Agora"}
                                </Link>
                            </Button>
                        </div>
                    )}

                    {/* Admin Finish Button */}
                    {canFinish && !isEditing && (
                        <div className="mt-3">
                            <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-[10px] uppercase font-bold tracking-widest"
                                onClick={(e) => { e.stopPropagation(); setShowFinalizeDialog(true); }}
                            >
                                Finalizar Jogo
                            </Button>
                        </div>
                    )}

                </div>

                {/* EXPANDER INDICATOR */}
                <div className="w-full flex justify-center pb-1">
                    {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground/30" /> : <ChevronDown className="h-3 w-3 text-muted-foreground/30" />}
                </div>

                {/* EXPANDED PREDICTIONS AREA */}
                {expanded && (
                    <div className="border-t bg-muted/10 p-4 animate-in slide-in-from-top-1 cursor-default" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-xs uppercase text-muted-foreground tracking-wider">Palpites da Galera</h4>

                            {/* ADMIN CONTROLS IN EXPANDED VIEW */}
                            {isAdmin && (
                                <div className="flex gap-2 ml-auto">
                                    <Button
                                        size="sm"
                                        variant={match.isManual ? "destructive" : "outline"}
                                        className="h-6 text-[10px]"
                                        onClick={async () => {
                                            await updateDoc(doc(db, "matches", match.id), { isManual: !match.isManual });
                                        }}
                                    >
                                        {match.isManual ? "Destravar Cron" : "Travar (Manual)"}
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant={match.betsOpen ? "default" : "secondary"}
                                        className={`h-6 text-[10px] ${match.betsOpen ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                        onClick={async () => {
                                            await updateDoc(doc(db, "matches", match.id), { betsOpen: !match.betsOpen });
                                        }}
                                    >
                                        {match.betsOpen ? "Apostas Abertas" : "Reabrir Apostas"}
                                    </Button>
                                </div>
                            )}

                            <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{predictions.length} palpites</span>
                        </div>

                        {loadingPreds ? (
                            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary/50" /></div>
                        ) : predictions.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                {predictions.map(pred => {
                                    const user = users.find(u => u.id === pred.userId);
                                    const isExact = pred.homeScore === match.homeScore && pred.awayScore === match.awayScore;

                                    return (
                                        <div key={pred.matchId + pred.userId} className={`flex items-center p-2 rounded-lg border text-xs gap-2 transition-colors ${isExact ? 'bg-green-500/10 border-green-500/30' : 'bg-background hover:bg-muted'}`}>
                                            <Avatar className="h-6 w-6 border">
                                                <AvatarImage src={user?.photoURL} />
                                                <AvatarFallback className="text-[8px]">{user?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold truncate w-20 leading-tight">{user?.name || "..."}</span>
                                                <span className="font-mono text-[10px] opacity-80">{pred.homeScore} - {pred.awayScore}</span>
                                            </div>
                                            {pred.points > 0 && <span className={`ml-auto font-bold ${isExact ? 'text-green-600' : 'text-blue-500'}`}>+{pred.points}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-xs text-muted-foreground italic">
                                Ninguém palpitou neste jogo ainda.
                            </div>
                        )}
                    </div>
                )}
            </CardContent>

            {/* CONFIRMATION DIALOG */}
            <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Confirmar Placar Final</DialogTitle>
                        <DialogDescription>
                            Ao finalizar, os pontos serão calculados para todos os palpites.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center py-4">
                        <div className="flex items-center gap-4 text-2xl font-bold font-mono">
                            <span>{match.homeTeamName}</span>
                            <span className="bg-muted px-3 py-1 rounded border">{homeScore}</span>
                            <span>x</span>
                            <span className="bg-muted px-3 py-1 rounded border">{awayScore}</span>
                            <span>{match.awayTeamName}</span>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setShowFinalizeDialog(false)}>Cancelar</Button>
                        <Button onClick={handleFinishMatch} disabled={saving} className="bg-green-600 hover:bg-green-700">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
