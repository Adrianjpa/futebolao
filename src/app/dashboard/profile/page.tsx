"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, updateDoc, query, collection, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, Trophy, Users, Gamepad2, Edit, Clock, Target, CheckCircle, Gem, XCircle, Goal, Upload, Trash2, X, Camera, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ReactCrop, { centerCrop, makeAspectCrop, Crop, PixelCrop, convertToPixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// Helper to center the crop
function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
    return centerCrop(
        makeAspectCrop(
            {
                unit: '%',
                width: 90,
            },
            aspect,
            mediaWidth,
            mediaHeight,
        ),
        mediaWidth,
        mediaHeight,
    )
}

export default function ProfilePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Profile State
    const [fullName, setFullName] = useState(""); // Nome Completo (Read-only if Google)
    const [nickname, setNickname] = useState(""); // Apelido (Editable)
    const [photoURL, setPhotoURL] = useState("");
    const [isGoogleUser, setIsGoogleUser] = useState(false);

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
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Image Cropping State
    const [imgSrc, setImgSrc] = useState('');
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const imgRef = useRef<HTMLImageElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const [showCropModal, setShowCropModal] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            if (!user) return;
            try {
                // Check provider
                const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
                setIsGoogleUser(isGoogle);

                // 1. Fetch User Profile
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);
                let currentPoints = 0;

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    // Logic: nickname takes priority for display, but we store both
                    setFullName(data.nome || data.name || user.displayName || "");
                    setNickname(data.nickname || "");
                    setPhotoURL(data.fotoPerfil || data.photoURL || user.photoURL || "");
                    currentPoints = data.totalPoints || 0;
                } else {
                    setFullName(user.displayName || "");
                    setPhotoURL(user.photoURL || "");
                }

                // 2. Fetch User Predictions
                const predsQuery = query(collection(db, "predictions"), where("userId", "==", user.uid));
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
                    totalPoints: currentPoints,
                    ranking: "-",
                    totalPredictions: predictions.length,
                    championshipsDisputed: uniqueChampionshipIds.length,
                    titlesWon: 0
                });

            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [user]);

    // Image Selection
    function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files && e.target.files.length > 0) {
            setCrop(undefined); // Makes crop preview update between images.
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImgSrc(reader.result?.toString() || '');
                setShowCropModal(true);
            });
            reader.readAsDataURL(e.target.files[0]);
        }
    }

    function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
        const { width, height } = e.currentTarget;
        setCrop(centerAspectCrop(width, height, 1));
    }

    // Generate Cropped Image
    async function getCroppedImg(image: HTMLImageElement, crop: PixelCrop): Promise<string> {
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        canvas.width = crop.width;
        canvas.height = crop.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('No 2d context');
        }

        ctx.drawImage(
            image,
            crop.x * scaleX,
            crop.y * scaleY,
            crop.width * scaleX,
            crop.height * scaleY,
            0,
            0,
            crop.width,
            crop.height,
        );

        return canvas.toDataURL('image/jpeg');
    }

    const handleCropConfirm = async () => {
        if (completedCrop && imgRef.current) {
            const base64 = await getCroppedImg(imgRef.current, completedCrop);
            setPhotoURL(base64);
            setShowCropModal(false);
            setImgSrc(''); // Clear source to save memory
        }
    };

    const handleRemoveImage = () => {
        setPhotoURL(user?.photoURL || ""); // Revert to Google photo or empty
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const docRef = doc(db, "users", user.uid);
            await updateDoc(docRef, {
                nome: fullName, // Keep fullName synced or updated
                nickname: nickname,
                fotoPerfil: photoURL
            });
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Erro ao atualizar perfil.");
        } finally {
            setSaving(false);
        }
    };

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
    const displayName = nickname || fullName || "Usuário sem nome";

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <Card className="bg-slate-950 border-slate-800 text-slate-100 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Trophy className="h-64 w-64 text-slate-700" />
                </div>
                <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
                    <div className="relative">
                        <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-slate-800 shadow-xl">
                            <AvatarImage src={photoURL || undefined} />
                            <AvatarFallback className="bg-slate-800 text-2xl font-bold">
                                {displayName?.substring(0, 2).toUpperCase() || <User />}
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-1 right-1 h-6 w-6 bg-green-500 rounded-full border-4 border-slate-950" title="Online"></div>
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-2">
                        <h1 className="text-3xl font-bold">{displayName}</h1>
                        {nickname && <p className="text-slate-400 text-sm">({fullName})</p>}
                        <p className="text-slate-400 flex items-center justify-center sm:justify-start gap-2">
                            <User className="h-4 w-4" /> {user?.email}
                        </p>
                        <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 mt-4">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Último login: Agora</span>
                        </div>
                    </div>

                    <div className="mt-4 sm:mt-0">
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="bg-transparent border-slate-700 hover:bg-slate-800 text-slate-200">
                                    <Edit className="mr-2 h-4 w-4" /> Editar Perfil
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px] bg-slate-950 text-slate-100 border-slate-800">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-bold">Suas Informações</DialogTitle>
                                    <DialogDescription className="text-slate-400">
                                        Suas alterações serão refletidas em todo o site.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="grid gap-6 py-4">
                                    {/* Nome Completo */}
                                    <div className="space-y-2">
                                        <Label htmlFor="fullName" className="text-slate-200">Nome Completo</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                            <Input
                                                id="fullName"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                disabled={isGoogleUser}
                                                className="pl-9 bg-slate-900 border-slate-800 text-slate-100 focus:ring-slate-700"
                                            />
                                        </div>
                                        {isGoogleUser && (
                                            <p className="text-xs text-slate-500">
                                                Seu nome é sincronizado com sua conta Google e não pode ser alterado aqui.
                                            </p>
                                        )}
                                    </div>

                                    {/* Apelido */}
                                    <div className="space-y-2">
                                        <Label htmlFor="nickname" className="text-slate-200">Apelido</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-slate-500 text-sm">@</span>
                                            <Input
                                                id="nickname"
                                                value={nickname}
                                                onChange={(e) => setNickname(e.target.value)}
                                                placeholder="Como você quer ser chamado"
                                                className="pl-9 bg-slate-900 border-slate-800 text-slate-100 focus:ring-slate-700"
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Este será seu nome de exibição nos rankings.
                                        </p>
                                    </div>

                                    {/* Time do Coração (Placeholder) */}
                                    <div className="space-y-2 opacity-50 pointer-events-none">
                                        <Label className="text-slate-200">Time do Coração</Label>
                                        <Select disabled>
                                            <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100">
                                                <SelectValue placeholder="Em breve..." />
                                            </SelectTrigger>
                                        </Select>
                                    </div>

                                    {/* Imagem de Perfil */}
                                    <div className="space-y-4">
                                        <Label className="text-slate-200">Imagem de Perfil</Label>
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-16 w-16 border-2 border-slate-700">
                                                <AvatarImage src={photoURL || undefined} />
                                                <AvatarFallback className="bg-slate-800 text-slate-400">
                                                    {displayName?.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>

                                            <div className="flex gap-2">
                                                <div className="relative">
                                                    {/* Hidden Inputs */}
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={onSelectFile}
                                                        className="hidden"
                                                    />
                                                    <input
                                                        ref={cameraInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        capture="user"
                                                        onChange={onSelectFile}
                                                        className="hidden"
                                                    />

                                                    {/* Mobile Dropdown */}
                                                    <div className="md:hidden">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="outline" className="bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-200">
                                                                    <Upload className="mr-2 h-4 w-4" /> Escolher Imagem
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent className="bg-slate-950 border-slate-800 text-slate-200">
                                                                <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer hover:bg-slate-900 focus:bg-slate-900">
                                                                    <ImageIcon className="mr-2 h-4 w-4" /> Galeria
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => cameraInputRef.current?.click()} className="cursor-pointer hover:bg-slate-900 focus:bg-slate-900">
                                                                    <Camera className="mr-2 h-4 w-4" /> Câmera
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>

                                                    {/* Desktop Direct Button */}
                                                    <Button
                                                        variant="outline"
                                                        className="hidden md:flex bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-200"
                                                        onClick={() => fileInputRef.current?.click()}
                                                    >
                                                        <Upload className="mr-2 h-4 w-4" /> Escolher Imagem
                                                    </Button>
                                                </div>

                                                {photoURL && photoURL !== user?.photoURL && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={handleRemoveImage}
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Envie um arquivo de imagem (PNG, JPG, WEBP).
                                        </p>
                                    </div>
                                </div>

                                <DialogFooter className="gap-2 sm:gap-0">
                                    <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-slate-400 hover:text-slate-200 hover:bg-slate-900">
                                        Cancelar
                                    </Button>
                                    <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar Alterações"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* Crop Modal */}
                        <Dialog open={showCropModal} onOpenChange={setShowCropModal}>
                            <DialogContent className="sm:max-w-[600px] bg-slate-950 border-slate-800">
                                <DialogHeader>
                                    <DialogTitle className="text-slate-100">Recortar Imagem</DialogTitle>
                                    <DialogDescription className="text-slate-400">
                                        Ajuste o recorte da sua foto de perfil.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="flex justify-center p-4 bg-slate-900 rounded-lg overflow-hidden">
                                    {imgSrc && (
                                        <ReactCrop
                                            crop={crop}
                                            onChange={(_, percentCrop) => setCrop(percentCrop)}
                                            onComplete={(c) => setCompletedCrop(c)}
                                            aspect={1}
                                            circularCrop
                                        >
                                            <img
                                                ref={imgRef}
                                                alt="Crop me"
                                                src={imgSrc}
                                                onLoad={onImageLoad}
                                                style={{ maxHeight: '60vh' }}
                                            />
                                        </ReactCrop>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setShowCropModal(false)} className="text-slate-400">
                                        Cancelar
                                    </Button>
                                    <Button onClick={handleCropConfirm} className="bg-blue-600 hover:bg-blue-700 text-white">
                                        Confirmar Recorte
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
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
                    <Card className="bg-yellow-500 border-yellow-400 text-yellow-950 animate-pulse ring-2 ring-yellow-300/50">
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
                    <Card className="bg-slate-300 border-slate-400 text-slate-900">
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
                    <Card className="bg-purple-600 border-purple-500 text-white">
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
