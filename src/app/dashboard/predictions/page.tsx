"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { collection, getDocs, query, where, orderBy, doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import { Calendar, Clock, Save, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

interface Match {
    id: string;
    homeTeamName: string;
    awayTeamName: string;
    homeTeamCrest?: string;
    awayTeamCrest?: string;
    date: any;
    round: string;
    championshipId: string;
    homeTeamId: string;
    awayTeamId: string;
    status: "scheduled" | "live" | "finished";
}

interface Prediction {
    matchId: string;
    homeScore: number;
    awayScore: number;
}

export default function PredictionsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [matches, setMatches] = useState<Match[]>([]);
    const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        const checkRoleAndFetch = async () => {
            if (!user) return;

            // Check if user is admin
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const userData = userDoc.data();
            if (userData?.funcao === "admin" || userData?.funcao === "moderator") {
                router.push("/dashboard"); // Redirect admins away from predictions
                return;
            }

            fetchMatchesAndPredictions();
        };

        checkRoleAndFetch();
    }, [user, router]);

    const fetchMatchesAndPredictions = async () => {
        setLoading(true);
        try {
            // 1. Fetch active matches (scheduled)
            const qMatches = query(collection(db, "matches"), where("status", "==", "scheduled"), orderBy("date", "asc"));
            const matchesSnap = await getDocs(qMatches);
            const matchesData: Match[] = [];
            matchesSnap.forEach(doc => matchesData.push({ id: doc.id, ...doc.data() } as Match));
            setMatches(matchesData);

            // 2. Fetch user predictions for these matches
            if (user) {
                const preds: Record<string, Prediction> = {};
                const qPreds = query(collection(db, "predictions"), where("userId", "==", user.uid));
                const predsSnap = await getDocs(qPreds);
                predsSnap.forEach(doc => {
                    const data = doc.data();
                    preds[data.matchId] = {
                        matchId: data.matchId,
                        homeScore: data.homeScore,
                        awayScore: data.awayScore
                    };
                });
                setPredictions(preds);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleScoreChange = (matchId: string, type: 'home' | 'away', value: string) => {
        const numValue = parseInt(value);
        if (isNaN(numValue)) return;

        setPredictions(prev => ({
            ...prev,
            [matchId]: {
                ...prev[matchId],
                matchId,
                [type === 'home' ? 'homeScore' : 'awayScore']: numValue,
                // Preserve the other score if it exists, default to 0 if not
                [type === 'home' ? 'awayScore' : 'homeScore']: prev[matchId]?.[type === 'home' ? 'awayScore' : 'homeScore'] ?? 0
            }
        }));
    };

    const handleSavePrediction = async (matchId: string) => {
        if (!user) return;
        const pred = predictions[matchId];
        if (!pred) return;

        // Double check locking logic
        const match = matches.find(m => m.id === matchId);
        if (match) {
            const matchDate = match.date.toDate();
            const now = new Date();
            if (now >= matchDate || match.status !== 'scheduled') {
                alert("Tempo esgotado! Esta partida já começou.");
                return;
            }
        }

        setSaving(matchId);
        try {
            const predId = `${matchId}_${user.uid}`;
            await setDoc(doc(db, "predictions", predId), {
                userId: user.uid,
                matchId: matchId,
                homeScore: pred.homeScore,
                awayScore: pred.awayScore,
                updatedAt: serverTimestamp(),
                championshipId: matches.find(m => m.id === matchId)?.championshipId
            });
            // Optional: Add toast here
        } catch (error) {
            console.error("Error saving prediction:", error);
            alert("Erro ao salvar palpite.");
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return <div>Carregando jogos...</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Meus Palpites</h1>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {matches.length === 0 && (
                    <p className="text-muted-foreground col-span-full">Nenhum jogo disponível para palpite no momento.</p>
                )}
                {matches.map((match) => {
                    const pred = predictions[match.id] || { homeScore: '', awayScore: '' };
                    const isSaving = saving === match.id;

                    const matchDate = match.date.toDate();
                    const now = new Date();
                    const isLocked = now >= matchDate || match.status !== 'scheduled';

                    return (
                        <Card key={match.id} className={`overflow-hidden border-primary/10 ${isLocked ? 'opacity-75 bg-muted/10' : ''}`}>
                            <CardHeader className="bg-muted/30 pb-2 relative">
                                {isLocked && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px] z-10">
                                        <div className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-full shadow-sm">
                                            <Lock className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-xs font-bold text-muted-foreground">Fechado</span>
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                                    <span className="flex items-center"><Calendar className="mr-1 h-3 w-3" /> {match.date?.seconds ? format(new Date(match.date.seconds * 1000), "dd/MM") : ""}</span>
                                    <span className="flex items-center"><Clock className="mr-1 h-3 w-3" /> {match.date?.seconds ? format(new Date(match.date.seconds * 1000), "HH:mm") : ""}</span>
                                </div>
                                <CardTitle className="text-center text-sm font-medium text-muted-foreground">{match.round}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 relative">
                                <div className="flex items-center justify-between gap-4 mb-6">
                                    <div className="flex flex-col items-center gap-2 flex-1">
                                        {match.homeTeamCrest && <img src={match.homeTeamCrest} alt={match.homeTeamName} className="h-12 w-12 object-contain mb-1" />}
                                        <div className="font-bold text-center leading-tight h-10 flex items-center justify-center text-sm">{match.homeTeamName}</div>
                                        <Input
                                            type="number"
                                            min="0"
                                            className="w-16 h-14 text-center text-2xl font-bold border-2 border-muted-foreground/20 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all rounded-xl shadow-sm bg-background"
                                            value={pred.homeScore}
                                            onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                                            disabled={isLocked}
                                            placeholder="-"
                                        />
                                    </div>
                                    <div className="text-muted-foreground font-bold pt-12 text-xl">X</div>
                                    <div className="flex flex-col items-center gap-2 flex-1">
                                        {match.awayTeamCrest && <img src={match.awayTeamCrest} alt={match.awayTeamName} className="h-12 w-12 object-contain mb-1 drop-shadow-sm" />}
                                        <div className="font-bold text-center leading-tight h-10 flex items-center justify-center text-sm">{match.awayTeamName}</div>
                                        <Input
                                            type="number"
                                            min="0"
                                            className="w-16 h-14 text-center text-2xl font-bold border-2 border-muted-foreground/20 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all rounded-xl shadow-sm bg-background"
                                            value={pred.awayScore}
                                            onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                                            disabled={isLocked}
                                            placeholder="-"
                                        />
                                    </div>
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={() => handleSavePrediction(match.id)}
                                    disabled={isSaving || isLocked}
                                >
                                    {isSaving ? "Salvando..." : (
                                        <>
                                            {isLocked ? <Lock className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                            {isLocked ? "Palpites Encerrados" : "Salvar Palpite"}
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
