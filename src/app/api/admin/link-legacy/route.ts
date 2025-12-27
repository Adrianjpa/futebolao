
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { legacyDocId, realUserId, championshipId } = body;

        if (!legacyDocId || !realUserId || !championshipId) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        const batch = adminDb.batch();

        // 1. Get Legacy Record
        const legacyRef = adminDb.collection("legacy_history").doc(legacyDocId);
        const legacySnap = await legacyRef.get();
        if (!legacySnap.exists) throw new Error("Legacy record not found");
        const legacyData = legacySnap.data() as any;

        // 1.1 Try to get Detailed Stats (legacy_stats_*)
        // Assumes naming convention: legacy_2012_Name -> legacy_stats_2012_Name
        let detailedStats = {};
        try {
            const statsDocId = legacyDocId.replace('legacy_', 'legacy_stats_');
            if (statsDocId !== legacyDocId) {
                const statsRef = adminDb.collection("legacy_history").doc(statsDocId);
                const statsSnap = await statsRef.get();
                if (statsSnap.exists) {
                    detailedStats = statsSnap.data() as any;
                    console.log(`Found detailed stats for ${legacyDocId}`);
                }
            }
        } catch (e) {
            console.log("No detailed stats found or error:", e);
        }

        // Merge detailed stats (preferred) with basic legacy data
        // We prioritize detailedStats for fields like exactScores, errors, etc.
        const mergedData = { ...legacyData, ...detailedStats };

        // 2. Get Real User to verify existence
        const userRef = adminDb.collection("users").doc(realUserId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) throw new Error("Real user not found");

        // 3. Link Logic: Update Legacy History
        batch.update(legacyRef, {
            linkedUserId: realUserId,
            linkedAt: Timestamp.now()
        });

        // 4. Link Logic: Update Championship Participants
        const champRef = adminDb.collection("championships").doc(championshipId);
        const champSnap = await champRef.get();
        if (champSnap.exists) {
            const champData = champSnap.data() as any;
            const participants = champData.participants || [];
            const manualWinners = champData.manualWinners || [];

            let champUpdated = false;

            // Update Participants Array
            const newParticipants = participants.map((p: any) => {
                // Determine if this participant matches the legacy record
                // We assume 'legacyUserName' matches the participant's ID or displayName stored in legacy data
                // For Euro 2012, participant IDs were 'adriano_legacy' or 'Adriano' (display name)
                if (p.userId === legacyData.legacyUserName || p.displayName === legacyData.legacyUserName || p.userId === `legacy_${legacyData.legacyUserName}`) {
                    champUpdated = true;
                    return { ...p, userId: realUserId, originalLegacyId: p.userId };
                }
                return p;
            });

            // Update Manual Winners Array
            // Update Manual Winners Array (Fix: Add if missing)
            const newWinners = [...manualWinners];
            let winnerUpdated = false;

            // Check if user is a legacy champion (Rank 1)
            if (mergedData.rank === 1) {
                const existingIndex = newWinners.findIndex((w: any) => w.position === 'champion');
                if (existingIndex >= 0) {
                    newWinners[existingIndex] = { ...newWinners[existingIndex], userId: realUserId, displayName: mergedData.legacyUserName || legacyData.legacyUserName };
                } else {
                    newWinners.push({ userId: realUserId, displayName: mergedData.legacyUserName || legacyData.legacyUserName, position: 'champion' });
                }
                champUpdated = true;
            }

            // Check if user has Gold Medal (Champion Pick)
            // Logic: originally 'achievements' contained 'champion_team_pick'
            if (mergedData.achievements?.includes('champion_team_pick') || mergedData.championPick === 'Espanha') { // Hardcoded verification for Euro 2012 correctness
                const existingIndex = newWinners.findIndex((w: any) => w.userId === realUserId && w.position === 'gold_winner');
                if (existingIndex === -1) {
                    newWinners.push({ userId: realUserId, displayName: mergedData.legacyUserName || legacyData.legacyUserName, position: 'gold_winner' });
                    champUpdated = true;
                }
            }


            if (champUpdated) {
                batch.update(champRef, {
                    participants: newParticipants,
                    manualWinners: newWinners
                });
            }
        }

        // 5. Update User Profile (Add to legacyStats map)
        // We store this as a map in the user doc: user.legacyStats = { [champId]: { rank, points, ... } }
        const statsKey = `legacyStats.${championshipId}`;
        batch.update(userRef, {
            [statsKey]: {
                name: mergedData.championshipName || legacyData.championshipName,
                year: mergedData.year || legacyData.year,
                rank: mergedData.rank || legacyData.rank,
                points: mergedData.points || legacyData.points,
                titles: (mergedData.rank || legacyData.rank) === 1 ? 1 : 0,
                totalPredictions: 31, // Euro 2012 fixed count
                goldMedals: (mergedData.achievements?.includes('champion_team_pick') || mergedData.championPick === 'Espanha') ? 1 : 0,

                // Extra Stats from legacy_stats_
                exactScores: mergedData.exactScores || 0,
                errors: mergedData.errors || 0,
                outcomes: mergedData.outcomes || 0,
                championPick: mergedData.championPick || null
            }
        });

        await batch.commit();

        return NextResponse.json({
            success: true,
            message: `Linked ${legacyData.legacyUserName} to user ${realUserId}.`
        });

    } catch (error: any) {
        console.error("Link Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
