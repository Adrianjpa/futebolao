"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";

interface SystemSettings {
    maintenanceMode: boolean;
    announcement: string;
    apiKey?: string;
    apiUpdateInterval?: number; // Minutes
    scorePriority?: 'regular' | 'full'; // 'regular' = 90min, 'full' = Final (inc. ET/Pen)
}

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<SystemSettings>({
        maintenanceMode: false,
        announcement: "",
        apiKey: "",
        apiUpdateInterval: 3,
        scorePriority: 'regular'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "system_settings", "config");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setSettings(docSnap.data() as SystemSettings);
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, "system_settings", "config"), settings, { merge: true });
            alert("Configurações salvas com sucesso!");
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Erro ao salvar configurações.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Configurações do Sistema</h1>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Geral</CardTitle>
                        <CardDescription>Configurações globais da aplicação.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">Modo de Manutenção</Label>
                                <p className="text-sm text-muted-foreground">
                                    Desativa o acesso dos usuários à plataforma.
                                </p>
                            </div>
                            <Switch
                                checked={settings.maintenanceMode}
                                onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Anúncios</CardTitle>
                        <CardDescription>Mensagem exibida no topo do dashboard para todos os usuários.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="announcement">Mensagem do Sistema</Label>
                            <Textarea
                                id="announcement"
                                placeholder="Ex: O sistema passará por manutenção às 22h."
                                value={settings.announcement}
                                onChange={(e) => setSettings({ ...settings, announcement: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Integrações</CardTitle>
                        <CardDescription>Chaves de API e configurações externas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">


                        <div className="space-y-2">
                            <Label htmlFor="apiUpdateInterval">Intervalo de Atualização Automática (minutos)</Label>
                            <Input
                                id="apiUpdateInterval"
                                type="number"
                                min="1"
                                placeholder="Ex: 3"
                                value={settings.apiUpdateInterval || 3}
                                onChange={(e) => setSettings({ ...settings, apiUpdateInterval: Math.max(1, parseInt(e.target.value) || 1) })}
                            />
                            <p className="text-xs text-muted-foreground">
                                Tempo entre as chamadas automáticas para atualizar placares (Mínimo: 1 minuto).
                            </p>
                        </div>

                        <div className="space-y-3 pt-2 border-t">
                            <Label>Prioridade de Placar</Label>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        id="score-regular"
                                        name="scorePriority"
                                        value="regular"
                                        checked={settings.scorePriority === 'regular' || !settings.scorePriority}
                                        onChange={() => setSettings({ ...settings, scorePriority: 'regular' })}
                                        className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <Label htmlFor="score-regular" className="font-normal">
                                        Tempo Regulamentar (90min) - <span className="text-muted-foreground text-xs">Ignora prorrogação e pênaltis</span>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        id="score-full"
                                        name="scorePriority"
                                        value="full"
                                        checked={settings.scorePriority === 'full'}
                                        onChange={() => setSettings({ ...settings, scorePriority: 'full' })}
                                        className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <Label htmlFor="score-full" className="font-normal">
                                        Tempo Total (Final) - <span className="text-muted-foreground text-xs">Inclui prorrogação e pênaltis</span>
                                    </Label>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Salvar Alterações
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
