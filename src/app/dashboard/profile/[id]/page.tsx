"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, query, collection, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, Trophy, Users, Gamepad2, Clock, Target, CheckCircle, Gem, XCircle, Goal, ArrowLeft, UserX } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function PublicProfilePage() {
    const { id } = useParams();
    const { user: currentUser, profile: currentProfile } = useAuth();
    const [loading, setLoading] = useState(true);

    // Profile Data
    const [profileData, setProfileData] = useState<any>(null);

    // Stats State
    const [stats, setStats] = useState({
        totalPoints: 0,
        ranking: "-",
        totalPredictions: 0,
        championshipsDisputed: 0,
        titlesWon: 0
    });
    const [championships, setChampionships] = useState<any[]>([]);
    const [selectedChampionship, setSelectedChampionship] = useState("all");
    const [userPredictions, setUserPredictions] = useState<any[]>([]);

    const isAdmin = currentProfile?.funcao === "admin";

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (!id) return;
            try {
                // 1. Fetch User Profile
                const docRef = doc(db, "users", id as string);
                const docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    setLoading(false);
                    return;
                }

                const data = docSnap.data();
                setProfileData(data);

                // 2. Fetch User Predictions
                const predsQuery = query(collection(db, "predictions"), where("userId", "==", id));
                const predsSnap = await getDocs(predsQuery);
                const predictions = predsSnap.docs.map(d => d.data());
                setUserPredictions(predictions);

                const uniqueChampionshipIds = Array.from(new Set(predictions.map((p: any) => p.championshipId)));

                // 3. Fetch Championships Details
                if (uniqueChampionshipIds.length > 0) {
                    const champsQuery = query(collection(db, "championships"));
                    const champsSnap = await getDocs(champsQuery);
                    const champsData = champsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                    setChampionships(champsData.filter((c: any) => uniqueChampionshipIds.includes(c.id)));
                }

                setStats({
                    totalPoints: data.totalPoints || 0,
                    ranking: "-", // Calculating ranking dynamically is heavy, skipping for now or could be stored
                    totalPredictions: predictions.length,
                    championshipsDisputed: uniqueChampionshipIds.length,
                    titlesWon: 0 // This would need a separate "titles" collection or field
                });

            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [id]);

    // Calculate Stats based on selection
    const getFilteredStats = () => {
        let filteredPreds = userPredictions;
        if (selectedChampionship !== "all") {
            filteredPreds = userPredictions.filter((p: any) => p.championshipId === selectedChampionship);
        }

        const points = filteredPreds.reduce((acc, curr) => acc + (curr.points || 0), 0);
        const buchas = filteredPreds.filter((p: any) => p.points === 3).length;
        const situacao = filteredPreds.filter((p: any) => p.points === 1).length;

        const finishedPreds = filteredPreds.filter((p: any) => p.points !== undefined);
        const erros = finishedPreds.filter((p: any) => p.points === 0).length;

        return {
            points,
            buchas,
            situacao,
            combo: 0,
            bonus: 0,
            gols: 0,
            erros
        };
    };

    const filteredStats = getFilteredStats();

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!profileData) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                <UserX className="h-12 w-12 mb-4" />
                <p>Usuário não encontrado.</p>
                <Button variant="link" asChild className="mt-4">
                    <Link href="/dashboard">Voltar ao Início</Link>
                </Button>
            </div>
        );
    }

    const displayName = profileData.nickname || profileData.nome || profileData.name || "Usuário sem nome";
    const displayPhoto = profileData.fotoPerfil || profileData.photoURL;

    return (
        <div className="space-y-8">
            {/* Back Button */}
            <div>
                <Button variant="ghost" asChild className="pl-0 hover:bg-transparent hover:text-primary">
                    <Link href="/dashboard/ranking">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                    </Link>
                </Button>
            </div>

            {/* Header Section */}
            <Card className="bg-slate-950 border-slate-800 text-slate-100 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Trophy className="h-64 w-64 text-slate-700" />
                </div>
                <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
                    <div className="relative">
                        <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-slate-800 shadow-xl">
                            <AvatarImage src={displayPhoto} />
                            <AvatarFallback className="bg-slate-800 text-2xl font-bold">
                                {displayName.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-2">
                        <h1 className="text-3xl font-bold">{displayName}</h1>
                        {profileData.nickname && <p className="text-slate-400 text-sm">({profileData.nome || profileData.name})</p>}

                        {/* Email - ONLY VISIBLE TO ADMIN */}
                        {isAdmin && (
                            <p className="text-red-400 flex items-center justify-center sm:justify-start gap-2 text-sm bg-red-950/30 w-fit px-2 py-1 rounded border border-red-900/50 mx-auto sm:mx-0">
                                <User className="h-3 w-3" /> {profileData.email} (Admin View)
                            </p>
                        )}

                        <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 mt-4">
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Membro desde {profileData.createdAt?.toDate().toLocaleDateString() || "N/A"}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* General Info Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    Informações Gerais
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Titles Card */}
                    <Card className="bg-card/50 hover:bg-card transition-colors">
                        <CardContent className="p-6 flex items-start justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Títulos Conquistados</p>
                                <p className="text-3xl font-bold">{stats.titlesWon}</p>
                                <p className="text-xs text-muted-foreground">Total de campeonatos vencidos</p>
                            </div>
                            <Trophy className="h-8 w-8 text-yellow-500 opacity-80" />
                        </CardContent>
                    </Card>

                    {/* Championships Card */}
                    <Card className="bg-card/50 hover:bg-card transition-colors">
                        <CardContent className="p-6 flex items-start justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Campeonatos Disputados</p>
                                <p className="text-3xl font-bold">{stats.championshipsDisputed}</p>
                                <p className="text-xs text-muted-foreground">Campeonatos com palpites</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-500 opacity-80" />
                        </CardContent>
                    </Card>

                    {/* Predictions Card */}
                    <Card className="bg-card/50 hover:bg-card transition-colors">
                        <CardContent className="p-6 flex items-start justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Total de Palpites</p>
                                <p className="text-3xl font-bold">{stats.totalPredictions}</p>
                                <p className="text-xs text-muted-foreground">Jogos com palpites enviados</p>
                            </div>
                            <Gamepad2 className="h-8 w-8 text-purple-500 opacity-80" />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Stats by Championship Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Estatísticas por Campeonato</h2>
                    <div className="w-[250px]">
                        <Select value={selectedChampionship} onValueChange={setSelectedChampionship}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione um campeonato" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Campeonatos</SelectItem>
                                {championships.map((champ) => (
                                    <SelectItem key={champ.id} value={champ.id}>
                                        {champ.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {/* Pontos */}
                    <Card className="bg-slate-950 border-slate-800 text-white">
                        <CardContent className="p-4 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start">
                                <span className="text-sm font-medium text-slate-400">Pontos</span>
                                <Gamepad2 className="h-4 w-4 text-slate-400" />
                            </div>
                            <div>
                                <span className="text-3xl font-bold">{filteredStats.points}</span>
                                <p className="text-[10px] text-slate-500 mt-1">Total de pontos no campeonato</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Buchas */}
                    <Card className="bg-green-600 border-green-500 text-white">
                        <CardContent className="p-4 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start">
                                <span className="text-sm font-medium text-green-100">Buchas</span>
                                <Target className="h-4 w-4 text-green-100" />
                            </div>
                            <div>
                                <span className="text-3xl font-bold">{filteredStats.buchas}</span>
                                <p className="text-[10px] text-green-100 mt-1">Placares cravados</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Situação */}
                    <Card className="bg-blue-600 border-blue-500 text-white">
                        <CardContent className="p-4 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start">
                                <span className="text-sm font-medium text-blue-100">Situação</span>
                                <CheckCircle className="h-4 w-4 text-blue-100" />
                            </div>
                            <div>
                                <span className="text-3xl font-bold">{filteredStats.situacao}</span>
                                <p className="text-[10px] text-blue-100 mt-1">Vencedor/empate corretos</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Combo (Stand by) */}
                    <Card className="bg-yellow-500 border-yellow-400 text-yellow-950 opacity-80">
                        <CardContent className="p-4 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start">
                                <span className="text-sm font-bold text-yellow-900">Combo</span>
                                <Gem className="h-4 w-4 text-yellow-900" />
                            </div>
                            <div>
                                <span className="text-3xl font-bold">{filteredStats.combo}</span>
                                <p className="text-[10px] text-yellow-900 font-medium mt-1">Bucha + Gols</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Bônus (Stand by) */}
                    <Card className="bg-slate-300 border-slate-400 text-slate-900 opacity-80">
                        <CardContent className="p-4 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start">
                                <span className="text-sm font-medium text-slate-700">Bônus</span>
                                <Trophy className="h-4 w-4 text-slate-700" />
                            </div>
                            <div>
                                <span className="text-3xl font-bold">{filteredStats.bonus}</span>
                                <p className="text-[10px] text-slate-700 mt-1">Situação + Gols</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Gols (Stand by) */}
                    <Card className="bg-purple-600 border-purple-500 text-white opacity-80">
                        <CardContent className="p-4 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start">
                                <span className="text-sm font-medium text-purple-100">Gols</span>
                                <Goal className="h-4 w-4 text-purple-100" />
                            </div>
                            <div>
                                <span className="text-3xl font-bold">{filteredStats.gols}</span>
                                <p className="text-[10px] text-purple-100 mt-1">Acerto apenas nos gols</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Erros */}
                    <Card className="bg-red-600 border-red-500 text-white">
                        <CardContent className="p-4 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start">
                                <span className="text-sm font-medium text-red-100">Erros</span>
                                <XCircle className="h-4 w-4 text-red-100" />
                            </div>
                            <div>
                                <span className="text-3xl font-bold">{filteredStats.erros}</span>
                                <p className="text-[10px] text-red-100 mt-1">Palpites sem pontuação</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
