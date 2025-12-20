import { useRef, useState, useEffect } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { getDocs, query, collection, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChampionBanner } from "@/components/banner/ChampionBanner";
import { BannerConfigForm } from "@/components/banner/BannerConfigForm";
import { BannerConfig, BannerWinner } from "@/types/banner";

const formSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    iconUrl: z.string().url("URL inválida").optional().or(z.literal("")),
    startDate: z.date(),
    endDate: z.date(),
    type: z.enum(["liga", "copa", "avulso"]),
    category: z.string().default("other"),
    teamMode: z.enum(["clubes", "selecoes", "mista"]),
    // Rules
    ghostPlayer: z.boolean().default(false),
    // Scoring
    exactScorePoints: z.coerce.number().min(0),
    winnerPoints: z.coerce.number().min(0),
    comboEnabled: z.boolean().default(false),
    // Banner
    bannerEnabled: z.boolean().default(false),
    bannerConfig: z.object({
        championshipLogoUrl: z.string().optional(),
        backgroundUrl: z.string().optional(),
        titleColor: z.string().default("#FFFFFF"),
        subtitleColor: z.string().default("#FBBF24"),
        namesColor: z.string().default("#FFFFFF"),
        displayMode: z.enum(["photo_and_names", "names_only"]).default("photo_and_names"),
        layoutStyle: z.enum(["modern", "classic"]).default("modern"),
    }).optional(),
    manualWinners: z.array(z.object({
        userId: z.string(),
        displayName: z.string(),
        photoUrl: z.string().optional(),
        position: z.enum(['champion', 'gold_winner', 'silver_winner', 'bronze_winner']),
    })).optional(),
    // API Integration
    creationType: z.enum(["manual", "hybrid", "auto"]),
    apiCode: z.string().optional(),
});

export type ChampionshipFormData = z.infer<typeof formSchema>;

interface ChampionshipFormProps {
    initialData?: Partial<ChampionshipFormData>;
    onSubmit: (values: ChampionshipFormData) => Promise<void>;
    isSubmitting?: boolean;
    submitLabel?: string;
}

// User Search Component
function UserSearch({ onSelect }: { onSelect: (user: any) => void }) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [foundUsers, setFoundUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Search users in Firestore
    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        if (term.length < 3) return;

        setLoading(true);
        try {
            // Improved Search: Search by simple startAt on displayName (since nickname might be missing)
            // Note: In production, consider Algolia or a specialized search collection.
            const usersRef = collection(db, "users");
            // Create two queries to try finding by nickname OR displayName (workaround for no OR in client SDK easily combined)
            // For this admin tool, searching by displayName is safer.

            const q = query(
                usersRef,
                where("displayName", ">=", term),
                where("displayName", "<=", term + '\uf8ff'),
                limit(10)
            );

            const snap = await getDocs(q);
            setFoundUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                    {"Pesquisar usuário..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command shouldFilter={false}>
                    <CommandInput placeholder="Digite o nickname..." value={searchTerm} onValueChange={handleSearch} />
                    <CommandList>
                        {loading && <CommandItem disabled>Carregando...</CommandItem>}
                        <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                        <CommandGroup>
                            {foundUsers.map((user) => (
                                <CommandItem
                                    key={user.id}
                                    onSelect={() => {
                                        onSelect(user);
                                        setOpen(false);
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        {/* Avatar logic simplified */}
                                        <span>{user.nickname || user.nome}</span>
                                        <span className="text-xs text-muted-foreground">({user.email})</span>
                                    </div>
                                    <Check className={cn("ml-auto h-4 w-4", "hidden")} />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export function ChampionshipForm({ initialData, onSubmit, isSubmitting = false, submitLabel = "Salvar" }: ChampionshipFormProps) {
    const form = useForm<ChampionshipFormData>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: initialData?.name || "",
            iconUrl: initialData?.iconUrl || "",
            startDate: initialData?.startDate ? new Date(initialData.startDate) : undefined,
            endDate: initialData?.endDate ? new Date(initialData.endDate) : undefined,
            type: initialData?.type || "liga",
            category: initialData?.category || "other",
            teamMode: initialData?.teamMode || "clubes",
            ghostPlayer: initialData?.ghostPlayer ?? false,
            exactScorePoints: initialData?.exactScorePoints ?? 10,
            winnerPoints: initialData?.winnerPoints ?? 5,
            comboEnabled: initialData?.comboEnabled ?? false,
            bannerEnabled: initialData?.bannerEnabled ?? false,
            bannerConfig: initialData?.bannerConfig || {
                titleColor: "#FFFFFF",
                subtitleColor: "#FBBF24",
                namesColor: "#FFFFFF",
                displayMode: "photo_and_names",
            },
            manualWinners: initialData?.manualWinners || [],
            creationType: initialData?.creationType || "manual",
            apiCode: initialData?.apiCode || "",
        } as any,
    });

    // Helper to add manual winner
    const addManualWinner = (user: any, position: 'champion' | 'gold_winner' | 'silver_winner' | 'bronze_winner') => {
        const current = form.getValues("manualWinners") || [];
        // Prevent duplicates
        if (current.some(w => w.userId === user.id && w.position === position)) return;

        const newWinner = {
            userId: user.id || user.uid,
            displayName: user.nickname || user.nome,
            photoUrl: user.photoUrl || user.customPhotoUrl || "",
            position
        };
        form.setValue("manualWinners", [...current, newWinner]);
    };

    const removeManualWinner = (userId: string, position: string) => {
        const current = form.getValues("manualWinners") || [];
        form.setValue("manualWinners", current.filter(w => !(w.userId === userId && w.position === position)));
    };

    const manualWinners = form.watch("manualWinners") || [];
    const bannerLayout = form.watch("bannerConfig.layoutStyle");

    // Check for ties to enforce classic layout
    const championsCount = manualWinners.filter(w => w.position === 'champion').length;
    const goldCount = manualWinners.filter(w => w.position === 'gold_winner').length;
    const hasTies = championsCount > 1 || goldCount > 1;

    useEffect(() => {
        if (hasTies && bannerLayout !== 'classic') {
            form.setValue("bannerConfig.layoutStyle", "classic");
        }
    }, [hasTies, bannerLayout, form]);


    const getPositionLabel = (position: string) => {
        switch (position) {
            case 'champion': return 'Campeão';
            case 'gold_winner': return 'Vencedor Ouro';
            case 'silver_winner': return 'Vencedor Prata';
            case 'bronze_winner': return 'Vencedor Bronze';
            default: return position;
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="general">Gerais</TabsTrigger>
                    <TabsTrigger value="rules">Regras</TabsTrigger>
                    <TabsTrigger value="teams">Equipes</TabsTrigger>
                    <TabsTrigger value="participants">Participantes</TabsTrigger>
                    <TabsTrigger value="scoring">Pontuação</TabsTrigger>
                    <TabsTrigger value="banner">Banner</TabsTrigger>
                </TabsList>

                {/* ABA GERAIS */}
                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informações Básicas</CardTitle>
                            <CardDescription>Defina os detalhes principais do campeonato.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nome do Campeonato</Label>
                                <Input id="name" {...form.register("name")} placeholder="Ex: Brasileirão 2024" />
                                {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="iconUrl">URL do Ícone (Logo)</Label>
                                <Input id="iconUrl" {...form.register("iconUrl")} placeholder="https://..." />
                                {form.formState.errors.iconUrl && <p className="text-sm text-destructive">{form.formState.errors.iconUrl.message}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Tipo de Cadastro</Label>
                                    <Select
                                        onValueChange={(val) => form.setValue("creationType", val as "manual" | "hybrid" | "auto")}
                                        defaultValue={form.watch("creationType")}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="manual">Manual (Criar jogos na mão)</SelectItem>
                                            <SelectItem value="hybrid">Híbrido (Manual + API)</SelectItem>
                                            <SelectItem value="auto">Automático (Só API)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Código da API (Ex: PL, WC)</Label>
                                    <Input
                                        {...form.register("apiCode")}
                                        placeholder="Código da competição na API"
                                        disabled={form.watch("creationType") === "manual"}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Data de Início</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !form.watch("startDate") && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {form.watch("startDate") ? format(form.watch("startDate"), "dd/MM/yyyy") : <span>Selecione a data</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={form.watch("startDate")}
                                                onSelect={(date) => form.setValue("startDate", date as Date)}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    {form.formState.errors.startDate && <p className="text-sm text-destructive">{form.formState.errors.startDate.message}</p>}
                                </div>

                                <div className="grid gap-2">
                                    <Label>Data de Fim</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !form.watch("endDate") && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {form.watch("endDate") ? format(form.watch("endDate"), "dd/MM/yyyy") : <span>Selecione a data</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={form.watch("endDate")}
                                                onSelect={(date) => form.setValue("endDate", date as Date)}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    {form.formState.errors.endDate && <p className="text-sm text-destructive">{form.formState.errors.endDate.message}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Tipo do Campeonato</Label>
                                    <Select
                                        onValueChange={(val) => form.setValue("type", val as "liga" | "copa" | "avulso")}
                                        defaultValue={form.watch("type")}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="liga">Liga (Pontos Corridos)</SelectItem>
                                            <SelectItem value="copa">Copa (Mata-mata)</SelectItem>
                                            <SelectItem value="avulso">Jogos Avulsos</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label>Agrupamento (Histórico)</Label>
                                    <Select
                                        onValueChange={(val) => form.setValue("category", val)}
                                        defaultValue={form.watch("category") || "other"}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="world_cup">Copa do Mundo</SelectItem>
                                            <SelectItem value="euro">Eurocopa</SelectItem>
                                            <SelectItem value="copa_america">Copa América</SelectItem>
                                            <SelectItem value="brasileirao">Brasileirão</SelectItem>
                                            <SelectItem value="libertadores">Libertadores</SelectItem>
                                            <SelectItem value="champions_league">Champions League</SelectItem>
                                            <SelectItem value="nacional">Nacional</SelectItem>
                                            <SelectItem value="other">Outros</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label>Modo de Equipes</Label>
                                    <Select
                                        onValueChange={(val) => form.setValue("teamMode", val as "clubes" | "selecoes" | "mista")}
                                        defaultValue={form.watch("teamMode")}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="clubes">Times (Clubes)</SelectItem>
                                            <SelectItem value="selecoes">Seleções Nacionais</SelectItem>
                                            <SelectItem value="mista">Mista</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA REGRAS */}
                <TabsContent value="rules">
                    <Card>
                        <CardHeader>
                            <CardTitle>Regras de Competição</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Jogador Fantasma (IA)</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Adicionar o "Lóia" (IA) como competidor no campeonato.
                                    </p>
                                </div>
                                <Switch
                                    checked={form.watch("ghostPlayer")}
                                    onCheckedChange={(checked) => form.setValue("ghostPlayer", checked)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA EQUIPES (Placeholder) */}
                <TabsContent value="teams">
                    <Card>
                        <CardHeader>
                            <CardTitle>Seleção de Equipes</CardTitle>
                            <CardDescription>Selecione os times que participarão.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-sm">Funcionalidade de seleção de times será implementada na próxima etapa.</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA PARTICIPANTES (Placeholder) */}
                <TabsContent value="participants">
                    <Card>
                        <CardHeader>
                            <CardTitle>Participantes</CardTitle>
                            <CardDescription>Convide usuários para o bolão.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-sm">Funcionalidade de convite será implementada na próxima etapa.</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA PONTUAÇÃO */}
                <TabsContent value="scoring">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sistema de Pontuação</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Placar Exato (Bucha)</Label>
                                    <Input type="number" {...form.register("exactScorePoints")} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Vencedor/Empate (Situação)</Label>
                                    <Input type="number" {...form.register("winnerPoints")} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4 mt-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Sistema de Combo</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Habilitar aposta extra em número de gols.
                                    </p>
                                </div>
                                <Switch
                                    checked={form.watch("comboEnabled")}
                                    onCheckedChange={(checked) => form.setValue("comboEnabled", checked)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA BANNER EDITADA */}
                <TabsContent value="banner">
                    <Card>
                        <CardHeader>
                            <CardTitle>Banner do Campeão (Hall da Fama)</CardTitle>
                            <CardDescription>Configure a aparência e os vencedores do banner final.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            {/* Toggle Ativo */}
                            <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Gerar Banner ao Final</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Se ativo, o banner aparecerá automaticamente no Hall da Fama.
                                    </p>
                                </div>
                                <Switch
                                    checked={form.watch("bannerEnabled")}
                                    onCheckedChange={(checked) => form.setValue("bannerEnabled", checked)}
                                />
                            </div>

                            {form.watch("bannerEnabled") && (
                                <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                                    <div className="rounded-xl overflow-hidden border-2 border-dashed border-slate-300 bg-slate-100 p-4 flex justify-center items-center">
                                        <div className="w-full max-w-[500px] shadow-2xl skew-x-1 hover:skew-x-0 transition-transform duration-500">
                                            <ChampionBanner
                                                championshipName={form.watch("name") || "Nome do Campeonato"}
                                                config={form.watch("bannerConfig") as BannerConfig}
                                                winners={form.watch("manualWinners") as BannerWinner[] || []}
                                                teamMode={form.watch("teamMode") || "clubes"}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-center text-xs text-muted-foreground">Pré-visualização em tempo real</p>

                                    <div className="pt-4">
                                        <BannerConfigForm
                                            config={{
                                                active: true,
                                                titleColor: "#FFFFFF",
                                                subtitleColor: "#FBBF24",
                                                namesColor: "#FFFFFF",
                                                displayMode: "photo_and_names",
                                                layoutStyle: "modern",
                                                ...form.watch("bannerConfig")
                                            }}
                                            onChange={(newConfig) => form.setValue("bannerConfig", newConfig as any, { shouldDirty: true })}
                                            hasTies={hasTies}
                                        />
                                    </div>

                                    {/* SECTION: MANUAL OVERRIDE (DEDO DE DEUS) */}
                                    <div className="border-t pt-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-bold text-lg">Vencedores (Seleção Manual)</h3>
                                            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                                Sobejuga o cálculo automático
                                            </div>
                                        </div>

                                        {/* General Champion Selector */}
                                        <div className="grid gap-2 p-4 bg-slate-50 border rounded-lg">
                                            <Label className="text-base font-bold text-yellow-600">🏆 Campeão Geral</Label>

                                            {/* List of current champions */}
                                            <div className="space-y-2">
                                                {form.watch("manualWinners")?.filter(w => w.position === 'champion').map((winner) => (
                                                    <div key={winner.userId} className="flex items-center justify-between gap-3 bg-white p-2 rounded border">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-8 w-8 bg-slate-200 rounded-full overflow-hidden">
                                                                {winner.photoUrl && <img src={winner.photoUrl} className="h-full w-full object-cover" />}
                                                            </div>
                                                            <span className="font-medium">{winner.displayName}</span>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            type="button"
                                                            onClick={() => removeManualWinner(winner.userId, 'champion')}
                                                            className="text-red-500 h-8 w-8 p-0"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-2">
                                                <UserSearch onSelect={(u) => addManualWinner(u, 'champion')} />
                                            </div>
                                        </div>

                                        {/* Gold Winner Selector */}
                                        <div className="grid gap-2 p-4 bg-slate-50 border rounded-lg">
                                            <Label className="text-base font-bold text-amber-600">🌟 Palpiteiro de Ouro</Label>

                                            {/* List of current gold winners */}
                                            <div className="space-y-2">
                                                {form.watch("manualWinners")?.filter(w => w.position === 'gold_winner').map((winner) => (
                                                    <div key={winner.userId} className="flex items-center justify-between gap-3 bg-white p-2 rounded border">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-8 w-8 bg-slate-200 rounded-full overflow-hidden">
                                                                {winner.photoUrl && <img src={winner.photoUrl} className="h-full w-full object-cover" />}
                                                            </div>
                                                            <span className="font-medium">{winner.displayName}</span>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            type="button"
                                                            onClick={() => removeManualWinner(winner.userId, 'gold_winner')}
                                                            className="text-red-500 h-8 w-8 p-0"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-2">
                                                <UserSearch onSelect={(u) => addManualWinner(u, 'gold_winner')} />
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="flex justify-end">
                <Button type="submit" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            {submitLabel}
                        </>
                    )}
                </Button>
            </div>
        </form >
    );
}
