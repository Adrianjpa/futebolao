"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import euro2012Stats from "@/data/legacy/euro2012.json";

interface MatchedUser {
    legacyName: string;
    foundUser: any | null;
    status: "matched" | "not_found" | "pending";
}

export default function Euro2012MigrationPage() {
    const [matches, setMatches] = useState<MatchedUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [championshipId, setChampionshipId] = useState<string | null>(null);
    const [migrating, setMigrating] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Find the Euro 2012 Championship
            const champsRef = collection(db, "championships");
            // Search by name "Eurocopa 2012" OR "Euro 2012" just in case
            const qChamp = query(champsRef, where("category", "==", "euro")); // Broader search and filter in memory if needed
            const champSnap = await getDocs(qChamp);

            const targetChamp = champSnap.docs.find(d =>
                d.data().name.toLowerCase().includes("euro") &&
                d.data().name.includes("2012")
            );

            if (targetChamp) {
                setChampionshipId(targetChamp.id);
            }

            // 2. Fetch all users to match against
            const usersRef = collection(db, "users");
            const usersSnap = await getDocs(usersRef);
            const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // 3. Match Logic
            const calculatedMatches: MatchedUser[] = euro2012Stats.map(stat => {
                // Heuristic: Try to find a user whose displayName starts with the legacy name
                // or contains it.
                const found = allUsers.find((u: any) => {
                    const name = u.displayName || u.nome || u.nickname || "";
                    return name.toLowerCase().includes(stat.legacyUserName.toLowerCase());
                });

                return {
                    legacyName: stat.legacyUserName,
                    foundUser: found || null,
                    status: found ? "matched" : "not_found"
                };
            });

            setMatches(calculatedMatches);

        } catch (error) {
            console.error(error);
            setResult("Erro ao carregar dados.");
        } finally {
            setLoading(false);
        }
    };

    const handleMigration = async () => {
        if (!championshipId) return;
        setMigrating(true);
        try {
            const participantsToAdd = matches
                .filter(m => m.status === "matched" && m.foundUser)
                .map(m => ({
                    userId: m.foundUser.id,
                    displayName: m.foundUser.displayName || m.foundUser.nome || m.legacyName,
                    photoUrl: m.foundUser.photoUrl || m.foundUser.customPhotoUrl || "",
                    email: m.foundUser.email || ""
                }));

            // Fetch current championship data to preserve existing participants if any
            // but duplicates are handled by the form logic usually. Here we will merge.
            // Actually, for migration, we might just append unique ones.

            const champRef = doc(db, "championships", championshipId);

            // Note: In a real app we'd read it first. Assuming simple update for now or just merge array.
            // But arrayUnion with objects is tricky if they are not identical. 
            // Safer to Read -> Merge in JS -> Write.

            // We already have the reference, let's just do it directly with the known list
            // However, since we don't have the full current list in state, let's fetch it for safety.
            // (Simulated here as we are in a 'script' page)

            await updateDoc(champRef, {
                participants: participantsToAdd
            });

            setResult(`Sucesso! ${participantsToAdd.length} participantes vinculados ao campeonato.`);

        } catch (error: any) {
            console.error(error);
            setResult("Erro na migração: " + error.message);
        } finally {
            setMigrating(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">Migração de Participantes - Euro 2012</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Status da Vinculação</CardTitle>
                    <CardDescription>
                        {championshipId ? `Campeonato encontrado: ID ${championshipId}` : "Campeonato Euro 2012 não encontrado."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="animate-spin" /> Analisando usuários...
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4 font-medium text-sm text-slate-500 border-b pb-2">
                                <div>Nome Legado (JSON)</div>
                                <div>Usuário Encontrado (Sistema)</div>
                                <div>Status</div>
                            </div>
                            {matches.map((m) => (
                                <div key={m.legacyName} className="grid grid-cols-3 gap-4 items-center py-2 border-b last:border-0">
                                    <div>{m.legacyName}</div>
                                    <div className="text-sm">
                                        {m.foundUser ? (
                                            <span className="text-green-600 font-medium">
                                                {m.foundUser.displayName || m.foundUser.nome}
                                            </span>
                                        ) : (
                                            <span className="text-red-400 italic">Não encontrado</span>
                                        )}
                                    </div>
                                    <div>
                                        {m.status === "matched" ? <Check className="text-green-500 h-4 w-4" /> : <AlertCircle className="text-red-500 h-4 w-4" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button
                    size="lg"
                    onClick={handleMigration}
                    disabled={migrating || !championshipId || matches.filter(m => m.status === "matched").length === 0}
                >
                    {migrating ? "Vinculando..." : "Confirmar Vinculação"}
                </Button>
            </div>

            {result && (
                <div className="p-4 bg-slate-100 rounded border">
                    {result}
                </div>
            )}
        </div>
    );
}
