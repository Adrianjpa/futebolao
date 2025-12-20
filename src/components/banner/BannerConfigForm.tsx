import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { BannerConfig } from "@/types/banner";

interface BannerConfigFormProps {
    config: BannerConfig;
    onChange: (newConfig: BannerConfig) => void;
    hasTies: boolean;
}

export function BannerConfigForm({ config, onChange, hasTies }: BannerConfigFormProps) {
    const update = (key: keyof BannerConfig, value: any) => {
        onChange({ ...config, [key]: value });
    };

    return (
        <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div className="grid gap-2">
                <Label>Estilo do Banner</Label>
                <Select
                    onValueChange={(val) => update("layoutStyle", val as "modern" | "classic")}
                    value={hasTies ? "classic" : (config.layoutStyle || "modern")}
                    disabled={hasTies}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="modern">Moderno (Cards)</SelectItem>
                        <SelectItem value="classic">Clássico (Texto/Lista)</SelectItem>
                    </SelectContent>
                </Select>
                {hasTies && (
                    <p className="text-[10px] text-amber-600 font-medium mt-1">
                        Forçado para Clássico (Múltiplos Vencedores)
                    </p>
                )}
            </div>
            <div className="grid gap-2">
                <Label>Modo de Exibição</Label>
                <Select
                    onValueChange={(val) => update("displayMode", val as "photo_and_names" | "names_only")}
                    value={hasTies ? "names_only" : (config.displayMode || "photo_and_names")}
                    disabled={config.layoutStyle === "modern" || hasTies}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="photo_and_names">Foto + Nome</SelectItem>
                        <SelectItem value="names_only">Apenas Nomes</SelectItem>
                    </SelectContent>
                </Select>
                {config.layoutStyle === "modern" && (
                    <p className="text-[10px] text-muted-foreground mt-1">Fixo em Foto + Nome</p>
                )}
                {hasTies && (
                    <p className="text-[10px] text-amber-600 font-medium mt-1">Forçado para Apenas Nomes (Empate)</p>
                )}
            </div>
            <div className="grid gap-2">
                <Label>Cor do Título (Ex: #FFFFFF)</Label>
                <Input
                    value={config.titleColor}
                    onChange={(e) => update("titleColor", e.target.value)}
                    placeholder="#FFFFFF"
                />
            </div>
            <div className="grid gap-2">
                <Label>Cor do Subtítulo (Ex: #FBBF24)</Label>
                <Input
                    value={config.subtitleColor}
                    onChange={(e) => update("subtitleColor", e.target.value)}
                    placeholder="#FBBF24"
                />
            </div>
            <div className="grid gap-2">
                <Label>Cor dos Nomes</Label>
                <Input
                    value={config.namesColor}
                    onChange={(e) => update("namesColor", e.target.value)}
                    placeholder="#FFFFFF"
                />
            </div>
            <div className="grid gap-2">
                <Label>Logo do Campeonato (URL)</Label>
                <Input
                    value={config.championshipLogoUrl || ""}
                    onChange={(e) => update("championshipLogoUrl", e.target.value)}
                    placeholder="https://..."
                />
            </div>
            <div className="grid gap-2 col-span-2">
                <Label>Background (URL)</Label>
                <Input
                    value={config.backgroundUrl || ""}
                    onChange={(e) => update("backgroundUrl", e.target.value)}
                    placeholder="https://..."
                />
            </div>

            {/* Background Controls */}
            <div className="col-span-2 grid grid-cols-3 gap-4 border-t pt-4 mt-2">
                <div className="grid gap-2">
                    <div className="flex justify-between">
                        <Label>Zoom ({config.backgroundScale ?? 100}%)</Label>
                    </div>
                    <Slider
                        defaultValue={[config.backgroundScale ?? 100]}
                        min={100}
                        max={300}
                        step={10}
                        onValueChange={(vals) => update("backgroundScale", vals[0])}
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Posição X ({config.backgroundPosX ?? 50}%)</Label>
                    <Slider
                        defaultValue={[config.backgroundPosX ?? 50]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(vals) => update("backgroundPosX", vals[0])}
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Posição Y ({config.backgroundPosY ?? 50}%)</Label>
                    <Slider
                        defaultValue={[config.backgroundPosY ?? 50]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(vals) => update("backgroundPosY", vals[0])}
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Tamanho Texto ({config.customFontSizeOffset ?? 0}%)</Label>
                    <Slider
                        defaultValue={[config.customFontSizeOffset ?? 0]}
                        min={-5}
                        max={5}
                        step={0.5}
                        onValueChange={(vals) => update("customFontSizeOffset", vals[0])}
                    />
                </div>
            </div>
        </div>
    );
}
