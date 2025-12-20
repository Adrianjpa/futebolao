export type LegacyHistoryRecord = {
    id?: string; // Firestore Doc ID
    year: number;
    championshipName: string; // "Copa do Mundo 2022"

    // Ghost User Identifiers
    legacyUserName: string; // The name in the XLS "Juca Bala"
    legacyEmail?: string | null; // Optional email for auto-linking

    // Performance Data
    rank: number; // 1st, 2nd, 3rd...
    points: number;
    exactScores?: number; // "Buchas" - Primary Tiebreaker
    championPick?: string; // "Brazil" (The team they picked as champion)
    scoringVariant: 'v1_3-1-0' | 'v2_modern'; // To distinguish legacy rules

    // Linking Status
    linkedUserId: string | null; // If null, it's a "Ghost". If set, it belongs to a real user.
    linkedAt?: Date; // When it was claimed

    // Metadata
    importedAt: Date;
    originalSourceLine?: number; // Line number in CSV for debugging
};

export type LegacyTeamMapping = {
    originalName: string; // "Alemanha"
    mappedTeamId: number; // API ID: 759
    mappedTeamName: string; // "Germany"
    confirmedBy: string; // Admin ID
};

export type ImportJobStatus = {
    id: string;
    status: 'processing' | 'completed' | 'failed' | 'waiting_mapping'
    totalRecords: number;
    processedRecords: number;
    unknownTeams: string[]; // List of teams needing mapping
    startedAt: Date;
};
