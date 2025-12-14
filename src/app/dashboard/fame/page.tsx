"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ChampionBanner } from "@/components/banner/ChampionBanner";
import { BannerConfig, BannerWinner, ChampionshipBannerData } from "@/types/banner";
import { Loader2, Calendar } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";

// Extended type for fetched data
interface ArchivedChampionship extends ChampionshipBannerData {
    id: string;
    name: string;
    endDate: any;
    status: string;
    bannerEnabled?: boolean;
    bannerConfig?: BannerConfig;
    teamMode?: 'clubes' | 'selecoes' | 'mista';
}

export default function HallOfFamePage() {
    const [championships, setChampionships] = useState<ArchivedChampionship[]>([]);
    const [loading, setLoading] = useState(true);
    const [emblaRef] = useEmblaCarousel({ loop: true, align: "center", containScroll: "trimSnaps" }, [Autoplay({ delay: 4000, stopOnInteraction: false })]);

    useEffect(() => {
        const fetchFame = async () => {
            try {
                // Fetch archived championships with banner enabled
                // Note: Firestore requires an index for 'status' == 'arquivado' AND 'bannerConfig.enabled' == true
                // For now, let's fetch 'arquivado' and filter client-side to avoid index block
                // Fetch ALL championships with banner enabled (for now, to allow testing/migration)
                // We filter client-side for `bannerEnabled` to avoid complex composite indexes during dev.
                const q = query(
                    collection(db, "championships"),
                    orderBy("endDate", "desc")
                );

                const snap = await getDocs(q);
                const list = snap.docs
                    .map(d => ({ id: d.id, ...d.data() } as ArchivedChampionship))
                    .filter(c => c.bannerEnabled === true); // Client-side filter

                setChampionships(list);
            } catch (error) {
                console.error("Error loading Hall of Fame:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFame();
    }, []);

    if (loading) {
        return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    if (championships.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed">
                <div className="bg-yellow-100 p-4 rounded-full mb-4">
                    <Calendar className="h-8 w-8 text-yellow-600" />
                </div>
                <h2 className="text-xl font-bold mb-2">Salão Vazio</h2>
                <p className="text-muted-foreground max-w-md">
                    Ainda não temos campeonatos finalizados no Hall da Fama.
                    Participe e seja o primeiro a colocar seu nome aqui!
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">🏆 Hall da Fama</h1>
                <p className="text-muted-foreground">
                    A glória eterna dos campeões do Futboleiros.
                </p>
            </div>

            {/* Embla Carousel Viewport */}
            <div className="overflow-hidden p-1 -m-1" ref={emblaRef}>
                <div className="flex gap-6 touch-pan-y pl-4">
                    {championships.map((champ) => {
                        // Prepare winners list (Manual Override OR Automatic Logic placeholder)
                        // Currently logic only supports MANUAL override as requested for legacy
                        const winners = champ.manualWinners || [];

                        // Defensive Check: ensure we have rudimentary config object
                        const config = champ.bannerConfig || {
                            active: true,
                            displayMode: 'photo_and_names',
                            titleColor: '#fff',
                            subtitleColor: '#fbbf24',
                            namesColor: '#fff'
                        };

                        return (
                            <div key={champ.id} className="flex-[0_0_85%] min-w-0 sm:flex-[0_0_50%] lg:flex-[0_0_33.33%] xl:flex-[0_0_25%]">
                                <Dialog>
                                    <DialogTrigger className="w-full transition-transform hover:scale-[1.02] active:scale-[0.98] outline-none">
                                        <ChampionBanner
                                            championshipName={champ.name}
                                            config={config as BannerConfig}
                                            winners={winners as BannerWinner[]}
                                            teamMode={champ.teamMode}
                                            className="w-full shadow-lg"
                                        />
                                    </DialogTrigger>
                                    <DialogContent className="max-w-[95vw] md:max-w-[85vw] w-full lg:max-w-[750px] p-0 border-none bg-transparent shadow-none" aria-describedby={undefined}>
                                        <DialogTitle className="sr-only">
                                            Banner do Campeonato: {champ.name}
                                        </DialogTitle>
                                        <ChampionBanner
                                            championshipName={champ.name}
                                            config={config as BannerConfig}
                                            winners={winners as BannerWinner[]}
                                            className="w-full shadow-2xl"
                                        />
                                    </DialogContent>
                                </Dialog>
                                <div className="text-center mt-3">
                                    <p className="font-semibold text-sm">{champ.name}</p>
                                    <p className="text-xs text-muted-foreground">Encerrado em {new Date(champ.endDate?.seconds * 1000).toLocaleDateString()}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
