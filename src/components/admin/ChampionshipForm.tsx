import { useRef, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { getDocs, query, collection, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

const formSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    iconUrl: z.string().url("URL inválida").optional().or(z.literal("")),
    startDate: z.date(),
    endDate: z.date(),
    type: z.enum(["liga", "copa", "avulso"]),
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
            // Simple search by nickname (can be improved with specialized search index)
            // Note: Firestore doesn't support partial text search natively well.
            // We'll search by exact match or startAt for nickname.
            // For now, let's fetch ALL users (not recommended for large apps) or 
            // relying on client-side filtering if user count is low.
            // BETTER APPROACH: Search by email or exact nickname match for admin tools.
            const q = query(collection(db, "users"), where("nickname", ">=", term), where("nickname", "<=", term + '\uf8ff'), limit(5));
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
    const addManualWinner = (user: any, position: 'champion' | 'gold_winner') => {
        const current = form.getValues("manualWinners") || [];
        // Remove existing for this position
        const filtered = current.filter(w => w.position !== position);
        form.setValue("manualWinners", [...filtered, {
            userId: user.id,
            displayName: user.nickname || user.nome,
            photoUrl: user.fotoPerfil || user.photoURL,
            position: position
        }]);
    };

    const removeManualWinner = (position: string) => {
        const current = form.getValues("manualWinners") || [];
        form.setValue("manualWinners", current.filter(w => w.position !== position));
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
                                <>
                                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                        <div className="grid gap-2">
                                            <Label>Cor do Título (Ex: #FFFFFF)</Label>
                                            <Input {...form.register("bannerConfig.titleColor")} placeholder="#FFFFFF" />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Cor do Subtítulo (Ex: #FBBF24)</Label>
                                            <Input {...form.register("bannerConfig.subtitleColor")} placeholder="#FBBF24" />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Cor dos Nomes</Label>
                                            <Input {...form.register("bannerConfig.namesColor")} placeholder="#FFFFFF" />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Logo do Campeonato (URL)</Label>
                                            <Input {...form.register("bannerConfig.championshipLogoUrl")} placeholder="https://..." />
                                        </div>
                                        <div className="grid gap-2 col-span-2">
                                            <Label>Background (URL)</Label>
                                            <Input {...form.register("bannerConfig.backgroundUrl")} placeholder="https://..." />
                                        </div>
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
                                            <div className="flex justify-between items-center">
                                                <Label className="text-base font-bold text-yellow-600">🏆 Campeão Geral</Label>
                                                {form.watch("manualWinners")?.find(w => w.position === 'champion') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeManualWinner('champion')}
                                                        className="text-red-500 h-6"
                                                    >
                                                        Remover
                                                    </Button>
                                                )}
                                            </div>

                                            {form.watch("manualWinners")?.find(w => w.position === 'champion') ? (
                                                <div className="flex items-center gap-3 bg-white p-2 rounded border">
                                                    <div className="h-8 w-8 bg-slate-200 rounded-full overflow-hidden">
                                                        {form.watch("manualWinners")?.find(w => w.position === 'champion')?.photoUrl && (
                                                            <img src={form.watch("manualWinners")?.find(w => w.position === 'champion')?.photoUrl} className="h-full w-full object-cover" />
                                                        )}
                                                    </div>
                                                    <span className="font-medium">{form.watch("manualWinners")?.find(w => w.position === 'champion')?.displayName}</span>
                                                </div>
                                            ) : (
                                                <UserSearch onSelect={(u) => addManualWinner(u, 'champion')} />
                                            )}
                                        </div>

                                        {/* Gold Winner Selector */}
                                        <div className="grid gap-2 p-4 bg-slate-50 border rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-base font-bold text-amber-600">🌟 Palpiteiro de Ouro</Label>
                                                {form.watch("manualWinners")?.find(w => w.position === 'gold_winner') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeManualWinner('gold_winner')}
                                                        className="text-red-500 h-6"
                                                    >
                                                        Remover
                                                    </Button>
                                                )}
                                            </div>

                                            {form.watch("manualWinners")?.find(w => w.position === 'gold_winner') ? (
                                                <div className="flex items-center gap-3 bg-white p-2 rounded border">
                                                    <div className="h-8 w-8 bg-slate-200 rounded-full overflow-hidden">
                                                        {form.watch("manualWinners")?.find(w => w.position === 'gold_winner')?.photoUrl && (
                                                            <img src={form.watch("manualWinners")?.find(w => w.position === 'gold_winner')?.photoUrl} className="h-full w-full object-cover" />
                                                        )}
                                                    </div>
                                                    <span className="font-medium">{form.watch("manualWinners")?.find(w => w.position === 'gold_winner')?.displayName}</span>
                                                </div>
                                            ) : (
                                                <UserSearch onSelect={(u) => addManualWinner(u, 'gold_winner')} />
                                            )}
                                        </div>

                                    </div>
                                </>
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
        </form>
    );
}
