export interface BannerConfig {
    active: boolean;
    championshipLogoUrl?: string; // URL for the championship logo (e.g. World Cup logo)
    backgroundUrl?: string; // Custom background image
    displayMode: 'photo_and_names' | 'names_only';
    layoutStyle?: 'modern' | 'classic'; // [NEW] Style variant
    titleColor: string; // Hex color for "GANHADORES"
    subtitleColor: string; // Hex color for subtitles
    namesColor: string; // Hex color for user names
    backgroundScale?: number; // Zoom level (100 = 100%, 200 = 200%)
    backgroundPosX?: number; // 0 to 100%
    backgroundPosY?: number; // 0 to 100%
    customFontSizeOffset?: number; // Additional size in cqw (default 0)
    selectionMode?: 'auto' | 'manual'; // [NEW] Winner selection mode
}

export interface ChampionPredictionSettings {
    active: boolean;
    numberOfPicks: number; // Default: 3
}

export interface FinalRanking {
    pos1?: string;
    pos2?: string;
    pos3?: string;
    // Add more if needed based on numberOfPicks
    [key: string]: string | undefined;
}

export interface BannerWinner {
    userId: string;
    displayName: string; // Nickname or Name
    photoUrl?: string;
    position: 'champion' | 'gold_winner' | 'silver_winner' | 'bronze_winner';
}

// Data structure stored in Firestore (championships collection)
export interface ChampionshipBannerData {
    banner: BannerConfig;
    championPredictionSettings: ChampionPredictionSettings;
    finalRanking?: FinalRanking;
    manualWinners?: BannerWinner[]; // [NEW] Manual override list
    teamMode?: 'clubes' | 'selecoes' | 'mista'; // [NEW] Team mode for banner text
}
