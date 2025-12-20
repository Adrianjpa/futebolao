export interface LegacyMatch {
    round: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    date?: string; // Approximate date
}

export const euro2012Matches: LegacyMatch[] = [
    // FASE DE GRUPOS
    { round: "Fase de Grupos", homeTeam: "Polônia", awayTeam: "Grécia", homeScore: 1, awayScore: 1 }, // POL 1 - 1 GRE
    { round: "Fase de Grupos", homeTeam: "Rússia", awayTeam: "República Tcheca", homeScore: 4, awayScore: 1 }, // RUS 4 - 1 THE
    { round: "Fase de Grupos", homeTeam: "Holanda", awayTeam: "Dinamarca", homeScore: 0, awayScore: 1 }, // HOL 0 - 1 DIN
    { round: "Fase de Grupos", homeTeam: "Alemanha", awayTeam: "Portugal", homeScore: 1, awayScore: 0 }, // ALE 1 - 0 POR
    { round: "Fase de Grupos", homeTeam: "Espanha", awayTeam: "Itália", homeScore: 1, awayScore: 1 }, // ESP 1 - 1 ITA
    { round: "Fase de Grupos", homeTeam: "Irlanda", awayTeam: "Croácia", homeScore: 1, awayScore: 3 }, // IRL 1 - 3 CRO
    { round: "Fase de Grupos", homeTeam: "França", awayTeam: "Inglaterra", homeScore: 1, awayScore: 1 }, // FRA 1 - 1 ING
    { round: "Fase de Grupos", homeTeam: "Ucrânia", awayTeam: "Suécia", homeScore: 2, awayScore: 1 }, // UCR 2 - 1 SUE
    { round: "Fase de Grupos", homeTeam: "Grécia", awayTeam: "República Tcheca", homeScore: 1, awayScore: 2 }, // GRE 1 - 2 THE
    { round: "Fase de Grupos", homeTeam: "Polônia", awayTeam: "Rússia", homeScore: 1, awayScore: 1 }, // POL 1 - 1 RUS
    { round: "Fase de Grupos", homeTeam: "Dinamarca", awayTeam: "Portugal", homeScore: 2, awayScore: 3 }, // DIN 2 - 3 POR
    { round: "Fase de Grupos", homeTeam: "Holanda", awayTeam: "Alemanha", homeScore: 1, awayScore: 2 }, // HOL 1 - 2 ALE
    { round: "Fase de Grupos", homeTeam: "Itália", awayTeam: "Croácia", homeScore: 1, awayScore: 1 }, // ITA 1 - 1 CRO
    { round: "Fase de Grupos", homeTeam: "Espanha", awayTeam: "Irlanda", homeScore: 4, awayScore: 0 }, // ESP 4 - 0 IRL
    { round: "Fase de Grupos", homeTeam: "Ucrânia", awayTeam: "França", homeScore: 0, awayScore: 2 }, // UCR 0 - 2 FRA
    { round: "Fase de Grupos", homeTeam: "Suécia", awayTeam: "Inglaterra", homeScore: 2, awayScore: 3 }, // SUE 2 - 3 ING
    { round: "Fase de Grupos", homeTeam: "Grécia", awayTeam: "Rússia", homeScore: 1, awayScore: 0 }, // GRE 1 - 0 RUS
    { round: "Fase de Grupos", homeTeam: "República Tcheca", awayTeam: "Polônia", homeScore: 1, awayScore: 0 }, // THE 1 - 0 POL
    { round: "Fase de Grupos", homeTeam: "Portugal", awayTeam: "Holanda", homeScore: 2, awayScore: 1 }, // POR 2 - 1 HOL
    { round: "Fase de Grupos", homeTeam: "Dinamarca", awayTeam: "Alemanha", homeScore: 1, awayScore: 2 }, // DIN 1 - 2 ALE
    { round: "Fase de Grupos", homeTeam: "Croácia", awayTeam: "Espanha", homeScore: 0, awayScore: 1 }, // CRO 0 - 1 ESP
    { round: "Fase de Grupos", homeTeam: "Itália", awayTeam: "Irlanda", homeScore: 2, awayScore: 0 }, // ITA 2 - 0 IRL
    { round: "Fase de Grupos", homeTeam: "Suécia", awayTeam: "França", homeScore: 2, awayScore: 0 }, // SUE 2 - 0 FRA
    { round: "Fase de Grupos", homeTeam: "Inglaterra", awayTeam: "Ucrânia", homeScore: 1, awayScore: 0 }, // ING 1 - 0 UCR

    // QUARTAS DE FINAL
    { round: "Quartas de Final", homeTeam: "República Tcheca", awayTeam: "Portugal", homeScore: 0, awayScore: 1 }, // THE 0 - 1 POR
    { round: "Quartas de Final", homeTeam: "Alemanha", awayTeam: "Grécia", homeScore: 4, awayScore: 2 }, // ALE 4 - 2 GRE
    { round: "Quartas de Final", homeTeam: "Espanha", awayTeam: "França", homeScore: 2, awayScore: 0 }, // ESP 2 - 0 FRA
    { round: "Quartas de Final", homeTeam: "Inglaterra", awayTeam: "Itália", homeScore: 0, awayScore: 0 }, // ING 0 - 0 ITA (Pênaltis)

    // SEMIFINAL
    { round: "Semifinal", homeTeam: "Portugal", awayTeam: "Espanha", homeScore: 0, awayScore: 0 }, // POR 0 - 0 ESP (Pênaltis)
    { round: "Semifinal", homeTeam: "Alemanha", awayTeam: "Itália", homeScore: 1, awayScore: 2 }, // ALE 1 - 2 ITA

    // FINAL
    { round: "Final", homeTeam: "Espanha", awayTeam: "Itália", homeScore: 4, awayScore: 0 }, // ESP 4 - 0 ITA
];

export interface LegacyUserBets {
    userName: string;
    teamPicks: string[]; // 1st, 2nd, 3rd
    bets: { home: number, away: number }[];
}

// Order must match euro2012Matches array exactly
export const euro2012Bets: LegacyUserBets[] = [
    {
        userName: "Adriano",
        teamPicks: ["França", "Itália", "Grécia"],
        bets: [
            // FASE DE GRUPOS (24 Jogos)
            { home: 1, away: 0 }, // J1
            { home: 1, away: 1 }, // J2
            { home: 2, away: 0 }, // J3
            { home: 2, away: 1 }, // J4
            { home: 1, away: 0 }, // J5
            { home: 0, away: 0 }, // J6
            { home: 1, away: 0 }, // J7
            { home: 1, away: 1 }, // J8
            { home: 1, away: 1 }, // J9
            { home: 1, away: 1 }, // J10
            { home: 0, away: 1 }, // J11
            { home: 0, away: 0 }, // J12
            { home: 1, away: 0 }, // J13
            { home: 2, away: 0 }, // J14
            { home: 1, away: 1 }, // J15
            { home: 0, away: 1 }, // J16
            { home: 1, away: 0 }, // J17
            { home: 1, away: 0 }, // J18
            { home: 1, away: 2 }, // J19
            { home: 0, away: 2 }, // J20
            { home: 0, away: 1 }, // J21
            { home: 1, away: 1 }, // J22
            { home: 0, away: 1 }, // J23
            { home: 1, away: 0 }, // J24

            // QUARTAS (4 Jogos) - Separator in image handling
            { home: 0, away: 1 }, // Q1
            { home: 1, away: 0 }, // Q2
            { home: 1, away: 0 }, // Q3
            { home: 1, away: 0 }, // Q4

            // SEMIS (2 Jogos)
            { home: 0, away: 1 }, // S1
            { home: 1, away: 0 }, // S2

            // FINAL (1 Jogo)
            { home: 1, away: 0 }  // F1
        ]
    },
    {
        userName: "Alan",
        teamPicks: ["Alemanha", "Portugal", "Holanda"],
        bets: [
            // FASE DE GRUPOS (24 Jogos)
            { home: 1, away: 1 }, // J1 (POL 1-1 GRE)
            { home: 0, away: 1 }, // J2 (RUS AZE)
            { home: 2, away: 0 }, // J3 (HOL DIN)
            { home: 1, away: 1 }, // J4 (ALE POR)
            { home: 2, away: 0 }, // J5 (ESP ITA)
            { home: 0, away: 1 }, // J6 (IRL CRO)
            { home: 2, away: 1 }, // J7 (FRA ING)
            { home: 0, away: 1 }, // J8 (UCR SUE)
            { home: 2, away: 1 }, // J9 (GRE CHE)
            { home: 0, away: 1 }, // J10 (POL RUS)
            { home: 2, away: 1 }, // J11 (DIN POR)
            { home: 0, away: 1 }, // J12 (HOL ALE)
            { home: 2, away: 1 }, // J13 (ITA CRO)
            { home: 3, away: 0 }, // J14 (ESP IRL)
            { home: 0, away: 2 }, // J15 (SUE ING)
            { home: 0, away: 1 }, // J16 (UCR FRA)
            { home: 1, away: 1 }, // J17 (CHE POL)
            { home: 1, away: 0 }, // J18 (GRE RUS)
            { home: 2, away: 2 }, // J19 (POR HOL)
            { home: 1, away: 2 }, // J20 (DIN ALE)
            { home: 1, away: 3 }, // J21 (CRO ESP)
            { home: 1, away: 1 }, // J22 (ITA IRL)
            { home: 1, away: 2 }, // J23 (ING UCR)
            { home: 1, away: 0 }, // J24 (SUE FRA)

            // QUARTAS (4 Jogos)
            { home: 0, away: 2 }, // Q1
            { home: 2, away: 0 }, // Q2
            { home: 2, away: 1 }, // Q3
            { home: 0, away: 1 }, // Q4

            // SEMIS (2 Jogos)
            { home: 1, away: 0 }, // S1
            { home: 2, away: 0 }, // S2

            // FINAL (1 Jogo)
            { home: 1, away: 1 }  // F1
        ]
    },
    {
        userName: "Elisson",
        teamPicks: ["Espanha", "Alemanha", "Holanda"],
        bets: [
            // FASE DE GRUPOS (24 Jogos)
            { home: 1, away: 1 }, // J1
            { home: 2, away: 1 }, // J2
            { home: 1, away: 0 }, // J3
            { home: 2, away: 1 }, // J4
            { home: 0, away: 0 }, // J5
            { home: 1, away: 2 }, // J6
            { home: 0, away: 0 }, // J7
            { home: 1, away: 2 }, // J8
            { home: 0, away: 0 }, // J9
            { home: 1, away: 1 }, // J10
            { home: 0, away: 1 }, // J11
            { home: 0, away: 1 }, // J12
            { home: 1, away: 0 }, // J13
            { home: 3, away: 0 }, // J14
            { home: 1, away: 2 }, // J15
            { home: 0, away: 1 }, // J16
            { home: 1, away: 2 }, // J17
            { home: 1, away: 1 }, // J18
            { home: 2, away: 2 }, // J19
            { home: 1, away: 3 }, // J20
            { home: 1, away: 2 }, // J21
            { home: 1, away: 0 }, // J22
            { home: 1, away: 2 }, // J23
            { home: 2, away: 0 }, // J24

            // QUARTAS (4 Jogos)
            { home: 0, away: 2 }, // Q1
            { home: 2, away: 0 }, // Q2
            { home: 1, away: 0 }, // Q3
            { home: 0, away: 1 }, // Q4

            // SEMIS (2 Jogos)
            { home: 0, away: 2 }, // S1
            { home: 2, away: 0 }, // S2

            // FINAL (1 Jogo)
            { home: 0, away: 1 }  // F1
        ]
    },
    {
        userName: "Jullius",
        teamPicks: ["Inglaterra", "Itália", "França"],
        bets: [
            // FASE DE GRUPOS (24 Jogos)
            { home: 1, away: 1 }, // J1
            { home: 2, away: 1 }, // J2
            { home: 2, away: 0 }, // J3
            { home: 2, away: 1 }, // J4
            { home: 0, away: 0 }, // J5
            { home: 0, away: 0 }, // J6
            { home: 0, away: 1 }, // J7
            { home: 1, away: 0 }, // J8
            { home: 1, away: 1 }, // J9
            { home: 2, away: 2 }, // J10
            { home: 1, away: 3 }, // J11
            { home: 1, away: 1 }, // J12
            { home: 1, away: 0 }, // J13
            { home: 2, away: 0 }, // J14
            { home: 1, away: 2 }, // J15
            { home: 0, away: 2 }, // J16
            { home: 0, away: 1 }, // J17
            { home: 1, away: 1 }, // J18
            { home: 1, away: 1 }, // J19
            { home: 0, away: 2 }, // J20
            { home: 1, away: 2 }, // J21
            { home: 2, away: 0 }, // J22
            { home: 0, away: 2 }, // J23
            { home: 2, away: 1 }, // J24

            // QUARTAS (4 Jogos)
            { home: 1, away: 1 }, // Q1
            { home: 1, away: 0 }, // Q2
            { home: 1, away: 0 }, // Q3
            { home: 1, away: 1 }, // Q4

            // SEMIS (2 Jogos)
            { home: 1, away: 0 }, // S1
            { home: 1, away: 2 }, // S2

            // FINAL (1 Jogo)
            { home: 2, away: 0 }  // F1
        ]
    },
    {
        userName: "Daniel",
        teamPicks: ["Alemanha", "França", "Rússia"],
        bets: [
            // FASE DE GRUPOS (24 Jogos)
            { home: 1, away: 1 }, // J1
            { home: 2, away: 0 }, // J2
            { home: 2, away: 0 }, // J3
            { home: 1, away: 1 }, // J4
            { home: 2, away: 1 }, // J5
            { home: 0, away: 0 }, // J6
            { home: 1, away: 0 }, // J7
            { home: 0, away: 2 }, // J8
            { home: 1, away: 1 }, // J9
            { home: 1, away: 2 }, // J10
            { home: 0, away: 1 }, // J11
            { home: 1, away: 2 }, // J12
            { home: 2, away: 1 }, // J13
            { home: 3, away: 0 }, // J14
            { home: 0, away: 2 }, // J15
            { home: 1, away: 1 }, // J16
            { home: 1, away: 2 }, // J17
            { home: 1, away: 2 }, // J18
            { home: 1, away: 2 }, // J19
            { home: 0, away: 2 }, // J20
            { home: 0, away: 2 }, // J21
            { home: 2, away: 1 }, // J22
            { home: 1, away: 2 }, // J23
            { home: 2, away: 0 }, // J24

            // QUARTAS (4 Jogos)
            { home: 1, away: 2 }, // Q1
            { home: 3, away: 0 }, // Q2
            { home: 2, away: 0 }, // Q3
            { home: 1, away: 0 }, // Q4

            // SEMIS (2 Jogos)
            { home: 1, away: 1 }, // S1
            { home: 2, away: 1 }, // S2

            // FINAL (1 Jogo)
            { home: 0, away: 0 }  // F1
        ]
    },
    {
        userName: "Lindoaldo",
        teamPicks: ["Holanda", "Espanha", "Portugal"],
        bets: [
            // FASE DE GRUPOS (24 Jogos)
            { home: 0, away: 1 }, // J1
            { home: 2, away: 1 }, // J2
            { home: 3, away: 1 }, // J3
            { home: 1, away: 0 }, // J4
            { home: 2, away: 0 }, // J5
            { home: 1, away: 1 }, // J6
            { home: 1, away: 2 }, // J7
            { home: 2, away: 0 }, // J8
            { home: 0, away: 2 }, // J9
            { home: 2, away: 1 }, // J10
            { home: 1, away: 2 }, // J11
            { home: 2, away: 0 }, // J12
            { home: 2, away: 0 }, // J13
            { home: 3, away: 0 }, // J14
            { home: 0, away: 2 }, // J15
            { home: 1, away: 2 }, // J16
            { home: 0, away: 0 }, // J17
            { home: 2, away: 1 }, // J18
            { home: 0, away: 1 }, // J19
            { home: 0, away: 2 }, // J20
            { home: 0, away: 2 }, // J21
            { home: 1, away: 0 }, // J22
            { home: 0, away: 2 }, // J23
            { home: 2, away: 1 }, // J24

            // QUARTAS (4 Jogos)
            { home: 1, away: 2 }, // Q1
            { home: 2, away: 0 }, // Q2
            { home: 0, away: 1 }, // Q3
            { home: 1, away: 2 }, // Q4

            // SEMIS (2 Jogos)
            { home: 1, away: 1 }, // S1
            { home: 2, away: 2 }, // S2

            // FINAL (1 Jogo)
            { home: 1, away: 1 }  // F1
        ]
    },
    {
        userName: "Josenildo",
        teamPicks: ["Holanda", "Alemanha", "Inglaterra"],
        bets: [
            // FASE DE GRUPOS (24 Jogos)
            { home: 2, away: 0 }, // J1
            { home: 2, away: 1 }, // J2
            { home: 3, away: 1 }, // J3
            { home: 2, away: 2 }, // J4
            { home: 3, away: 1 }, // J5
            { home: 1, away: 1 }, // J6
            { home: 1, away: 2 }, // J7
            { home: 0, away: 2 }, // J8
            { home: 1, away: 1 }, // J9
            { home: 0, away: 2 }, // J10
            { home: 1, away: 2 }, // J11
            { home: 2, away: 2 }, // J12
            { home: 2, away: 0 }, // J13
            { home: 3, away: 0 }, // J14
            { home: 1, away: 2 }, // J15
            { home: 1, away: 1 }, // J16
            { home: 0, away: 2 }, // J17
            { home: 1, away: 0 }, // J18
            { home: 1, away: 2 }, // J19
            { home: 0, away: 2 }, // J20
            { home: 1, away: 3 }, // J21
            { home: 1, away: 0 }, // J22
            { home: 2, away: 1 }, // J23
            { home: 2, away: 0 }, // J24

            // QUARTAS (4 Jogos)
            { home: 1, away: 2 }, // Q1
            { home: 2, away: 0 }, // Q2
            { home: 2, away: 0 }, // Q3
            { home: 2, away: 1 }, // Q4

            // SEMIS (2 Jogos)
            { home: 1, away: 2 }, // S1
            { home: 2, away: 0 }, // S2

            // FINAL (1 Jogo)
            { home: 0, away: 0 }  // F1
        ]
    },
    {
        userName: "Anderson",
        teamPicks: ["Espanha", "Alemanha", "França"],
        bets: [
            // FASE DE GRUPOS (24 Jogos)
            { home: 2, away: 0 }, // J1
            { home: 2, away: 1 }, // J2
            { home: 2, away: 0 }, // J3
            { home: 1, away: 0 }, // J4
            { home: 2, away: 1 }, // J5
            { home: 1, away: 1 }, // J6
            { home: 2, away: 0 }, // J7
            { home: 1, away: 1 }, // J8
            { home: 1, away: 2 }, // J9
            { home: 2, away: 2 }, // J10
            { home: 1, away: 2 }, // J11
            { home: 2, away: 2 }, // J12
            { home: 1, away: 0 }, // J13
            { home: 2, away: 0 }, // J14
            { home: 1, away: 2 }, // J15
            { home: 1, away: 2 }, // J16
            { home: 1, away: 2 }, // J17
            { home: 1, away: 1 }, // J18
            { home: 0, away: 2 }, // J19
            { home: 1, away: 3 }, // J20
            { home: 1, away: 1 }, // J21
            { home: 2, away: 1 }, // J22
            { home: 1, away: 2 }, // J23
            { home: 2, away: 1 }, // J24

            // QUARTAS (4 Jogos)
            { home: 0, away: 1 }, // Q1
            { home: 0, away: 0 }, // Q2
            { home: 1, away: 0 }, // Q3
            { home: 0, away: 0 }, // Q4

            // SEMIS (2 Jogos)
            { home: 1, away: 0 }, // S1
            { home: 1, away: 0 }, // S2

            // FINAL (1 Jogo)
            { home: 0, away: 0 }  // F1
        ]
    },
    {
        userName: "Marlon",
        teamPicks: ["Alemanha", "França", "Espanha"],
        bets: [
            // FASE DE GRUPOS (24 Jogos)
            { home: 1, away: 1 }, // J1
            { home: 2, away: 1 }, // J2
            { home: 3, away: 1 }, // J3
            { home: 2, away: 2 }, // J4
            { home: 3, away: 1 }, // J5
            { home: 0, away: 2 }, // J6
            { home: 1, away: 0 }, // J7
            { home: 1, away: 2 }, // J8
            { home: 2, away: 2 }, // J9
            { home: 1, away: 2 }, // J10
            { home: 0, away: 2 }, // J11
            { home: 0, away: 2 }, // J12
            { home: 2, away: 0 }, // J13
            { home: 1, away: 0 }, // J14
            { home: 1, away: 1 }, // J15
            { home: 0, away: 2 }, // J16
            { home: 0, away: 0 }, // J17
            { home: 0, away: 1 }, // J18
            { home: 1, away: 3 }, // J19
            { home: 0, away: 2 }, // J20
            { home: 1, away: 1 }, // J21
            { home: 2, away: 2 }, // J22
            { home: 2, away: 2 }, // J23
            { home: 1, away: 0 }, // J24

            // QUARTAS (4 Jogos)
            { home: 2, away: 2 }, // Q1
            { home: 3, away: 0 }, // Q2
            { home: 1, away: 2 }, // Q3
            { home: 1, away: 0 }, // Q4

            // SEMIS (2 Jogos)
            { home: 0, away: 3 }, // S1
            { home: 3, away: 1 }, // S2

            // FINAL (1 Jogo)
            { home: 2, away: 0 }  // F1
        ]
    }
];
