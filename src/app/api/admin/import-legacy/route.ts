import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import euro2012 from "@/data/legacy/euro2012.json";
import { LegacyHistoryRecord } from "@/types/legacy";

const getApproximateDate = (round: string, index: number) => {
    // Euro 2012 ran from June 8 to July 1, 2012.
    // Base timestamp + index offset to preserve order
    const baseDates: Record<string, string> = {
        "Fase de Grupos": "2012-06-08T12:00:00Z",
        "Quartas de Final": "2012-06-21T12:00:00Z",
        "Semifinal": "2012-06-27T12:00:00Z",
        "Final": "2012-07-01T15:45:00Z"
    };

    const base = new Date(baseDates[round] || "2012-06-01T00:00:00Z");
    base.setMinutes(base.getMinutes() + index * 120); // Spread matches out
    return Timestamp.fromDate(base);
};

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get("mode");

        if (mode === 'matches') {
            const { euro2012Matches, euro2012Bets } = await import("@/data/legacy/euro2012_matches");
            const batch = adminDb.batch();
            const champId = "uefa_euro_2012";

            // 1. Ensure Championship Exists
            const champRef = adminDb.collection("championships").doc(champId);
            batch.set(champRef, {
                id: champId,
                name: "Eurocopa 2012",
                status: "finished",
                category: "euro",
                bannerEnabled: true,
                bannerConfig: { // Default Config
                    title: "Eurocopa 2012",
                    subTitle: "Legacy",
                    winnerName: "Adriano",
                    winnerPhotoUrl: "",
                    themeColor: "from-blue-600 to-red-600"
                },
                createdAt: Timestamp.fromDate(new Date("2012-06-01T00:00:00Z")),
                legacyImport: true
            }, { merge: true });

            let count = 0;
            let betsCount = 0;

            // 2. Import Matches
            for (let i = 0; i < euro2012Matches.length; i++) {
                const match = euro2012Matches[i];
                const matchId = `legacy_match_2012_${i}`;
                const matchRef = adminDb.collection("matches").doc(matchId);

                batch.set(matchRef, {
                    id: matchId,
                    championshipId: champId,
                    round: match.round,
                    date: getApproximateDate(match.round, i),
                    status: "finished",
                    homeTeamName: match.homeTeam,
                    awayTeamName: match.awayTeam,
                    homeScore: match.homeScore,
                    awayScore: match.awayScore,
                    homeTeamCrest: "",
                    awayTeamCrest: "",
                    lastUpdated: Timestamp.now(),
                    legacyImport: true
                });
                count++;

                // 3. Import Predictions
                if (euro2012Bets) {
                    for (const userBet of euro2012Bets) {
                        if (userBet.bets[i]) {
                            const bet = userBet.bets[i];
                            const predictionId = `${matchId}_${userBet.userName.replace(/\s+/g, '_')}`;
                            const predictionRef = adminDb.collection("predictions").doc(predictionId);

                            // Calculate points
                            let points = 0;
                            const realHome = match.homeScore;
                            const realAway = match.awayScore;
                            const predHome = bet.home;
                            const predAway = bet.away;

                            if (realHome === predHome && realAway === predAway) {
                                points = 3;
                            } else {
                                const realSign = Math.sign(realHome - realAway);
                                const predSign = Math.sign(predHome - predAway);
                                if (realSign === predSign) {
                                    points = 1;
                                }
                            }

                            batch.set(predictionRef, {
                                id: predictionId,
                                matchId: matchId,
                                userId: userBet.userName,
                                userName: userBet.userName,
                                homeScore: predHome,
                                awayScore: predAway,
                                points: points,
                                createdAt: Timestamp.now(),
                                legacyImport: true
                            });
                            betsCount++;
                        }
                    }
                }
            }

            // 4. Calculate Stats & Save to legacy_history
            if (euro2012Bets) {
                const champion = "Espanha";
                const userStats = euro2012Bets.map(user => {
                    let exacts = 0;
                    let outcomes = 0;
                    let errors = 0;
                    let total = 0;

                    user.bets.forEach((bet, index) => {
                        if (index >= euro2012Matches.length) return;
                        const match = euro2012Matches[index];
                        let points = 0;
                        if (match.homeScore === bet.home && match.awayScore === bet.away) points = 3;
                        else if (Math.sign(match.homeScore - match.awayScore) === Math.sign(bet.home - bet.away)) points = 1;

                        total += points;
                        if (points === 3) exacts++;
                        else if (points === 1) outcomes++;
                        else errors++;
                    });

                    return {
                        ...user,
                        total,
                        exacts,
                        outcomes,
                        errors,
                        championPick: user.teamPicks[0]
                    };
                });

                // Sort Standings
                userStats.sort((a, b) => {
                    if (b.total !== a.total) return b.total - a.total;
                    if (b.exacts !== a.exacts) return b.exacts - a.exacts;
                    // Champion Pick Tiebreaker
                    if (a.championPick === champion && b.championPick !== champion) return -1;
                    if (b.championPick === champion && a.championPick !== champion) return 1;
                    return 0;
                });

                // Save to Firestore
                userStats.forEach((stat, index) => {
                    // ID Format: legacy_STATS_YEAR_USER
                    const statsId = `legacy_stats_2012_${stat.userName.replace(/\s+/g, '_')}`;
                    const statsRef = adminDb.collection("legacy_history").doc(statsId);

                    batch.set(statsRef, {
                        id: statsId,
                        championshipId: champId,
                        year: 2012,
                        championshipName: "Eurocopa 2012",
                        legacyUserName: stat.userName,
                        userId: stat.userName, // Consistent ID
                        points: stat.total,
                        exactScores: stat.exacts,
                        outcomes: stat.outcomes,
                        errors: stat.errors,
                        rank: index + 1,
                        championPick: stat.championPick,
                        teamPicks: stat.teamPicks, // Save the array!
                        achievements: stat.championPick === champion ? ["champion_pick"] : [],
                        importedAt: Timestamp.now()
                    });
                });
            }

            await batch.commit();
            return NextResponse.json({ success: true, message: `Imported Euro 2012: ${count} matches, ${betsCount} predictions, and updated Standings.`, count });
        }

        // Default: Import User History (Banner)
        const batch = adminDb.batch();
        const collectionRef = adminDb.collection("legacy_history");
        let count = 0;

        for (const record of euro2012) {
            // ... (existing logic)
            // Create a unique ID to prevent duplicates if we run this twice
            // ID Format: legacy_YEAR_USER (e.g., legacy_2012_Adriano)
            const docId = `legacy_${record.year}_${record.legacyUserName.replace(/\s+/g, '_')}`;
            const docRef = collectionRef.doc(docId);

            const firestoreRecord: LegacyHistoryRecord = {
                ...record,
                // Ensure specific types
                championPick: record.championPick || undefined,
                scoringVariant: "v1_3-1-0", // Hardcoded for Euro 2012
                linkedUserId: null,
                importedAt: new Date() as any // Firebase Admin accepts Date objects, but TS expects Firestore rules. Casting for simplicity here or use Timestamp.fromDate()
            };

            // conversion for admin sdk
            const dataToSave = {
                ...firestoreRecord,
                importedAt: Timestamp.now()
            };

            batch.set(docRef, dataToSave);
            count++;
        }

        await batch.commit();

        return NextResponse.json({
            success: true,
            message: `Imported ${count} records from Euro 2012.`,
            count
        });

    } catch (error: any) {
        console.error("Import Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
