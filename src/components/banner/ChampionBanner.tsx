"use client";

import { useMemo } from "react";
import { BannerConfig, BannerWinner } from "@/types/banner";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Star } from "lucide-react";

interface ChampionBannerProps {
    championshipName: string;
    config: BannerConfig;
    winners: BannerWinner[];
    className?: string;
}

export function ChampionBanner({ championshipName, config, winners, className }: ChampionBannerProps) {
    // defaults
    const titleColor = config.titleColor || "#FFFFFF";
    const subtitleColor = config.subtitleColor || "#FBBF24"; // Amber-400
    const namesColor = config.namesColor || "#FFFFFF";
    const bgUrl = config.backgroundUrl || "/images/banner-default-bg.jpg"; // Fallback needed

    const champion = winners.find(w => w.position === 'champion');
    const goldWinner = winners.find(w => w.position === 'gold_winner');

    // Container Query wrapper style
    const containerStyle = {
        containerType: "inline-size",
        aspectRatio: "857 / 828",
        backgroundImage: `url(${bgUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
    } as React.CSSProperties;

    // Helper to render user avatar or fallback
    const renderAvatar = (url: string | undefined, sizePercent: number, border: string) => (
        <div
            className="rounded-full overflow-hidden bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-xl relative z-10"
            style={{
                width: `${sizePercent}cqw`,
                height: `${sizePercent}cqw`,
                border: `${0.6}cqw solid ${border}`
            }}
        >
            {url ? (
                <img src={url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white font-bold" style={{ fontSize: `${sizePercent * 0.4}cqw` }}>
                    ?
                </div>
            )}
        </div>
    );

    return (
        <div
            className={cn("w-full relative rounded-xl overflow-hidden shadow-2xl isolate", className)}
            style={containerStyle}
        >
            {/* Overlay to ensure text readability */}
            <div className="absolute inset-0 bg-black/40 mix-blend-multiply pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

            {/* Content Container */}
            <div className="absolute inset-0 flex flex-col items-center justify-between py-[5cqw] px-[4cqw]">

                {/* Header Section */}
                <div className="flex flex-col items-center gap-[1cqw] w-full mt-[2cqw]">
                    {config.championshipLogoUrl ? (
                        <img
                            src={config.championshipLogoUrl}
                            alt="Logo"
                            className="w-[15cqw] h-[15cqw] object-contain drop-shadow-lg mb-[1cqw]"
                        />
                    ) : (
                        <Trophy className="w-[12cqw] h-[12cqw] text-yellow-500 drop-shadow-lg mb-[1cqw]" />
                    )}

                    <h1
                        className="font-black uppercase tracking-wider text-center drop-shadow-md leading-none"
                        style={{ color: titleColor, fontSize: "8cqw", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}
                    >
                        Ganhadores
                    </h1>
                    <div
                        className="uppercase tracking-widest font-bold opacity-90 text-center"
                        style={{ color: "white", fontSize: "3cqw" }}
                    >
                        {championshipName}
                    </div>
                </div>

                {/* Main Content - Two Columns */}
                <div className="flex-1 w-full grid grid-cols-2 mt-[4cqw] gap-[2cqw]">

                    {/* Left: General Champion */}
                    <div className="flex flex-col items-center justify-start relative">
                        {/* Crown/Trophy Decoration */}
                        <div className="mb-[2cqw] relative">
                            <Star className="absolute -top-[6cqw] left-1/2 -translate-x-1/2 w-[8cqw] h-[8cqw] text-yellow-400 fill-yellow-400 animate-pulse drop-shadow-lg" />
                            {renderAvatar(champion?.photoUrl, 32, "#EAB308")}
                            <div className="absolute -bottom-[2cqw] left-1/2 -translate-x-1/2 bg-yellow-500 text-yellow-950 px-[3cqw] py-[0.5cqw] rounded-full font-bold uppercase whitespace-nowrap shadow-lg flex items-center gap-1" style={{ fontSize: "2.5cqw" }}>
                                <Trophy className="w-[3cqw] h-[3cqw]" /> Campeão Geral
                            </div>
                        </div>

                        <div className="mt-[4cqw] text-center">
                            <h2
                                className="font-bold drop-shadow-md"
                                style={{ color: namesColor, fontSize: "4.5cqw" }}
                            >
                                {champion?.displayName || "A Definir"}
                            </h2>
                            <p className="text-white/80 font-medium mt-[0.5cqw]" style={{ fontSize: "2.5cqw" }}>
                                Maior Pontuação
                            </p>
                        </div>
                    </div>

                    {/* Right: Gold Winner (Palpiteiro) */}
                    <div className="flex flex-col items-center justify-start relative">
                        {/* Medal Decoration */}
                        <div className="mb-[2cqw] relative">
                            <Medal className="absolute -top-[6cqw] left-1/2 -translate-x-1/2 w-[8cqw] h-[8cqw] text-amber-400 fill-amber-400 drop-shadow-lg" />
                            {renderAvatar(goldWinner?.photoUrl, 32, "#F59E0B")}
                            <div className="absolute -bottom-[2cqw] left-1/2 -translate-x-1/2 bg-amber-500 text-amber-950 px-[3cqw] py-[0.5cqw] rounded-full font-bold uppercase whitespace-nowrap shadow-lg flex items-center gap-1" style={{ fontSize: "2.5cqw" }}>
                                <Star className="w-[3cqw] h-[3cqw]" /> Palpiteiro
                            </div>
                        </div>

                        <div className="mt-[4cqw] text-center">
                            <h2
                                className="font-bold drop-shadow-md"
                                style={{ color: namesColor, fontSize: "4.5cqw" }}
                            >
                                {goldWinner?.displayName || "A Definir"}
                            </h2>
                            <p className="text-white/80 font-medium mt-[0.5cqw]" style={{ fontSize: "2.5cqw" }}>
                                Desafio do Campeão
                            </p>
                        </div>
                    </div>

                </div>

                {/* Footer / Branding */}
                <div className="w-full text-center mt-auto pt-[4cqw] opacity-60">
                    <p style={{ color: "white", fontSize: "2cqw", letterSpacing: "0.2em" }}>
                        FUTBOLEIROS • HALL DA FAMA
                    </p>
                </div>
            </div>
        </div>
    );
}
