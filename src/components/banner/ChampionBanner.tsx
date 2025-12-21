"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BannerConfig, BannerWinner } from "@/types/banner";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Star } from "lucide-react";

interface ChampionBannerProps {
    championshipName: string;
    config: BannerConfig;
    winners: BannerWinner[];
    className?: string;
    teamMode?: 'clubes' | 'selecoes' | 'mista';
}

export function ChampionBanner({ championshipName, config, winners, className, teamMode = 'clubes' }: ChampionBannerProps) {
    // defaults
    const titleColor = config.titleColor || "#FFFFFF";
    const subtitleColor = config.subtitleColor || "#FBBF24"; // Amber-400
    const namesColor = config.namesColor || "#FFFFFF";
    const bgUrl = config.backgroundUrl || "/images/banner-default-bg.jpg"; // Fallback needed
    const champions = winners.filter(w => w.position === 'champion');
    const goldWinners = winners.filter(w => w.position === 'gold_winner');

    // Rule: Force classic layout if there are ties (more than 1 winner in any category)
    const hasTies = champions.length > 1 || goldWinners.length > 1;
    const layout = hasTies ? 'classic' : (config.layoutStyle || "modern");
    const displayMode = hasTies ? 'names_only' : (config.displayMode || 'photo_and_names');

    // Determine subtitle based on teamMode
    const goldSubtitle = teamMode === 'selecoes' ? "PALPITES DA SELEÇÃO" : "PALPITES DA EQUIPE";

    // Container Query wrapper style
    const containerStyle = {
        containerType: "inline-size",
        aspectRatio: "857 / 828",
        backgroundImage: `url(${bgUrl})`,
        backgroundSize: config.backgroundScale ? `${config.backgroundScale}%` : "cover",
        backgroundPosition: `${config.backgroundPosX ?? 50}% ${config.backgroundPosY ?? 50}%`,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)"
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

    // Font sizing helper
    const sizeOffset = config.customFontSizeOffset || 0;
    const getFontSize = (base: number) => `${Math.max(1, base + sizeOffset)}cqw`;

    // --- CLASSIC LAYOUT RENDERER ---
    if (layout === 'classic') {
        return (
            <div className={cn("w-full relative rounded-xl overflow-hidden shadow-2xl isolate font-sans", className)} style={containerStyle}>
                {/* Dark Overlay for contrast */}
                <div className="absolute inset-0 bg-black/50 pointer-events-none" />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col p-[5cqw]">
                    {/* Top Header */}
                    <div className="flex justify-between items-start mb-[4cqw]">
                        {/* Logo */}
                        {config.championshipLogoUrl ? (
                            <img src={config.championshipLogoUrl} alt="Logo" className="w-[18cqw] h-[18cqw] object-contain drop-shadow-lg" />
                        ) : (
                            <Trophy className="w-[12cqw] h-[12cqw] text-yellow-500" />
                        )}

                        {/* Title */}
                        <div className="text-right">
                            <h1 className="font-black uppercase italic tracking-tighter leading-none drop-shadow-lg"
                                style={{ color: titleColor, fontSize: "10cqw" }}>
                                GANHADORES
                            </h1>
                            <p className="uppercase font-bold tracking-widest opacity-90"
                                style={{ color: "white", fontSize: "3cqw" }}>
                                {championshipName}
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-start pt-[4cqw] gap-[6cqw]">
                        {/* Champion Section */}
                        <div className="flex flex-col items-center">
                            <h2 className="uppercase font-black italic tracking-wide mb-[1cqw] drop-shadow-md"
                                style={{ color: subtitleColor, fontSize: getFontSize(6) }}>
                                CAMPEÃO GERAL
                            </h2>
                            {/* Winners Grid */}
                            {/* Champions Names Flow */}
                            <div className="flex flex-wrap justify-center items-center w-full px-[5cqw] text-center leading-none">
                                {champions.length > 0 ? champions.map((winner, idx) => (
                                    <div key={idx} className="inline-flex items-center hover:opacity-100 transition-opacity cursor-default">
                                        {displayMode === 'photo_and_names' && (
                                            <div className="mr-[1cqw]">
                                                {renderAvatar(winner.photoUrl, 12, subtitleColor)}
                                            </div>
                                        )}
                                        <span className="font-extrabold uppercase drop-shadow-md"
                                            style={{ color: namesColor, fontSize: champions.length > 1 ? "6cqw" : "8cqw" }}>
                                            {winner.displayName}
                                        </span>
                                        {/* Graphic Separator - Only if not last */}
                                        {idx < champions.length - 1 && (
                                            <span
                                                className="mx-[1.5cqw] rounded-full inline-block bg-current opacity-80"
                                                style={{
                                                    width: "1.5cqw",
                                                    height: "1.5cqw",
                                                    color: subtitleColor,
                                                    marginBottom: "0.2em" // Optical alignment
                                                }}
                                            />
                                        )}
                                    </div>
                                )) : (
                                    <span style={{ color: namesColor, fontSize: "5cqw" }}>A DEFINIR</span>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col items-center">
                            <h3 className="uppercase font-bold italic tracking-wide mb-[1cqw] drop-shadow-md"
                                style={{ color: subtitleColor, fontSize: getFontSize(4.5) }}>
                                {goldSubtitle}
                            </h3>
                            <div className="flex flex-wrap justify-center items-center w-full px-[5cqw] text-center leading-none">
                                {goldWinners.length > 0 ? goldWinners.map((winner, idx) => (
                                    <div key={idx} className="inline-flex items-center hover:opacity-100 transition-opacity cursor-default">
                                        {displayMode === 'photo_and_names' && (
                                            <div className="mr-[0.8cqw]">
                                                {renderAvatar(winner.photoUrl, 9, subtitleColor)}
                                            </div>
                                        )}
                                        <span className="font-bold uppercase drop-shadow-md"
                                            style={{ color: namesColor, fontSize: goldWinners.length > 1 ? "4cqw" : "5cqw" }}>
                                            {winner.displayName}
                                        </span>
                                        {/* Graphic Separator - Only if not last */}
                                        {idx < goldWinners.length - 1 && (
                                            <span
                                                className="mx-[1.2cqw] rounded-full inline-block bg-current opacity-80"
                                                style={{
                                                    width: "1.2cqw",
                                                    height: "1.2cqw",
                                                    color: subtitleColor,
                                                    marginBottom: "0.2em"
                                                }}
                                            />
                                        )}
                                    </div>
                                )) : (
                                    <span style={{ color: namesColor, fontSize: "4cqw" }}>EM BREVE</span>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="w-full text-center mt-auto pt-[4cqw] opacity-60">
                        <p style={{ color: "white", fontSize: "2cqw", letterSpacing: "0.2em" }}>
                            FUTEBOLÃO • HALL DA FAMA
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // --- MODERN LAYOUT RENDERER ---
    return (
        <div
            className={cn("w-full relative rounded-xl overflow-hidden shadow-2xl isolate", className)}
            style={containerStyle}
        >
            {/* Overlay */}
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

                    {/* Left: General Champions */}
                    <div className="flex flex-col items-center justify-start relative w-full">
                        {/* Wrapper for multiple winners */}
                        <div className="flex flex-wrap justify-center gap-[2cqw] w-full">
                            {champions.length > 0 ? champions.map((winner, idx) => (
                                <div key={idx} className="flex flex-col items-center relative group hover:scale-105 transition-transform duration-300 cursor-default">
                                    <div className="mb-[2cqw] relative">
                                        {/* Icons Removed as requested */}
                                        {renderAvatar(winner.photoUrl, champions.length > 1 ? 22 : 32, "#EAB308")}
                                        <div className="absolute -bottom-[1.5cqw] left-1/2 -translate-x-1/2 bg-yellow-500 text-yellow-950 px-[3cqw] py-[0.5cqw] rounded-full font-bold uppercase whitespace-nowrap shadow-lg flex items-center gap-1 z-20" style={{ fontSize: champions.length > 1 ? "1.8cqw" : "2.5cqw" }}>
                                            <Trophy className="w-[3cqw] h-[3cqw]" /> {champions.length > 1 ? `#${idx + 1}` : "Campeão Geral"}
                                        </div>
                                    </div>
                                    <div className="mt-[4.5cqw] text-center px-1">
                                        <h2 className="font-bold drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis max-w-[35cqw] leading-tight"
                                            style={{ color: namesColor, fontSize: champions.length > 1 ? "3cqw" : "4.5cqw" }}>
                                            {winner.displayName}
                                        </h2>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center mt-[5cqw]">
                                    <h2 className="font-bold opacity-50" style={{ color: namesColor, fontSize: "4cqw" }}>A Definir</h2>
                                </div>
                            )}
                        </div>
                        {champions.length > 0 && (
                            <p className="text-white/80 font-medium mt-[0.5cqw] text-center w-full uppercase tracking-wide" style={{ fontSize: "2cqw" }}>
                                Maior Pontuação
                            </p>
                        )}
                    </div>

                    {/* Right: Gold Winner (Palpiteiro) */}
                    <div className="flex flex-col items-center justify-start relative w-full">
                        <div className="flex flex-wrap justify-center gap-[2cqw] w-full">
                            {goldWinners.length > 0 ? goldWinners.map((winner, idx) => (
                                <div key={idx} className="flex flex-col items-center relative group hover:scale-105 transition-transform duration-300 cursor-default">
                                    <div className="mb-[2cqw] relative">
                                        {/* Icons Removed as requested */}
                                        {renderAvatar(winner.photoUrl, goldWinners.length > 1 ? 22 : 32, "#F59E0B")}
                                        <div className="absolute -bottom-[1.5cqw] left-1/2 -translate-x-1/2 bg-amber-500 text-amber-950 px-[3cqw] py-[0.5cqw] rounded-full font-bold uppercase whitespace-nowrap shadow-lg flex items-center gap-1 z-20" style={{ fontSize: goldWinners.length > 1 ? "1.8cqw" : "2.5cqw" }}>
                                            <Star className="w-[3cqw] h-[3cqw]" /> Escolha Certa
                                        </div>
                                    </div>
                                    <div className="mt-[4.5cqw] text-center px-1">
                                        <h2 className="font-bold drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis max-w-[35cqw] leading-tight"
                                            style={{ color: namesColor, fontSize: goldWinners.length > 1 ? "3cqw" : "4.5cqw" }}>
                                            {winner.displayName}
                                        </h2>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center mt-[5cqw]">
                                    <h2 className="font-bold opacity-50" style={{ color: namesColor, fontSize: "4cqw" }}>Em Breve</h2>
                                </div>
                            )}
                        </div>
                        {goldWinners.length > 0 && (
                            <p className="text-white/80 font-medium mt-[0.5cqw] text-center w-full uppercase tracking-wide" style={{ fontSize: "2cqw" }}>
                                {goldSubtitle}
                            </p>
                        )}
                    </div>

                </div>

                {/* Footer */}
                <div className="w-full text-center mt-auto pt-[4cqw] opacity-60">
                    <p style={{ color: "white", fontSize: "2cqw", letterSpacing: "0.2em" }}>
                        FUTEBOLÃO • HALL DA FAMA
                    </p>
                </div>
            </div>
        </div>
    );
}
