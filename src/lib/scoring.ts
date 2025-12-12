export interface ScoringRules {
    exactScorePoints: number;
    winnerPoints: number;
}

export function calculatePoints(
    predHome: number,
    predAway: number,
    realHome: number,
    realAway: number,
    rules: ScoringRules = { exactScorePoints: 3, winnerPoints: 1 }
): number {
    // 1. Exact Score (Bucha)
    if (predHome === realHome && predAway === realAway) {
        return rules.exactScorePoints;
    }

    // 2. Winner or Draw (Situação)
    const predWinner = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';
    const realWinner = realHome > realAway ? 'home' : realHome < realAway ? 'away' : 'draw';

    if (predWinner === realWinner) {
        return rules.winnerPoints;
    }

    return 0;
}
