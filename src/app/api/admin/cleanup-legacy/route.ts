
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get("mode"); // 'ghosts' or 'stats' or 'all'

        let deletedStatsCount = 0;
        let deletedGhostsCount = 0;
        const batchSize = 400; // Firestore batch limit is 500

        // 1. Cleanup Legacy Stats Duplicates
        // We want to keep 'legacy_2012_Adriano' but delete 'legacy_stats_2012_Adriano'
        if (mode === 'stats' || mode === 'all') {
            const statsSnap = await adminDb.collection("legacy_history").get();
            const batches = [];
            let currentBatch = adminDb.batch();
            let opCount = 0;

            statsSnap.docs.forEach(doc => {
                if (doc.id.startsWith("legacy_stats_")) {
                    currentBatch.delete(doc.ref);
                    opCount++;
                    deletedStatsCount++;

                    if (opCount >= batchSize) {
                        batches.push(currentBatch.commit());
                        currentBatch = adminDb.batch();
                        opCount = 0;
                    }
                }
            });

            if (opCount > 0) batches.push(currentBatch.commit());
            await Promise.all(batches);
        }

        // 2. Cleanup Ghost Users
        if (mode === 'ghosts' || mode === 'all') {
            const usersSnap = await adminDb.collection("users").where("isGhost", "==", true).get();
            const batches = [];
            let currentBatch = adminDb.batch();
            let opCount = 0;

            usersSnap.docs.forEach(doc => {
                currentBatch.delete(doc.ref);
                opCount++;
                deletedGhostsCount++;

                if (opCount >= batchSize) {
                    batches.push(currentBatch.commit());
                    currentBatch = adminDb.batch();
                    opCount = 0;
                }
            });

            if (opCount > 0) batches.push(currentBatch.commit());
            await Promise.all(batches);
        }

        return NextResponse.json({
            success: true,
            deletedStats: deletedStatsCount,
            deletedGhosts: deletedGhostsCount,
            message: `Cleanup complete. Deleted ${deletedStatsCount} duplicate stats and ${deletedGhostsCount} ghost users.`
        });

    } catch (error: any) {
        console.error("Cleanup Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
