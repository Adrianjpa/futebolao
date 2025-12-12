import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(request: Request) {
    try {
        const { championshipId } = await request.json();

        if (!championshipId) {
            return NextResponse.json({ error: "Championship ID required" }, { status: 400 });
        }

        console.log(`Starting manual schedule sync for championship: ${championshipId}`);

        // 1. Fetch Championship to get API Code
        const champDoc = await adminDb.collection("championships").doc(championshipId).get();
        if (!champDoc.exists) {
            return NextResponse.json({ error: "Championship not found" }, { status: 404 });
        }

        const champData = champDoc.data();
        const apiCode = champData?.apiCode;

        if (!apiCode) {
            return NextResponse.json({ error: "Championship has no API Code" }, { status: 400 });
        }

        // 2. Fetch Matches from API (Scheduled & Live & Finished to be safe)
        // We want to sync the SCHEDULE, so we look for upcoming matches mainly, but checking all ensures we catch reschedules.
        const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
        const response = await fetch(`https://api.football-data.org/v4/matches?code=${apiCode}`, {
            headers: { "X-Auth-Token": API_KEY || "" },
            next: { revalidate: 0 }
        });

        if (!response.ok) {
            throw new Error(`External API Error: ${response.statusText}`);
        }

        const data = await response.json();
        const apiMatches = data.matches || [];
        const apiMatchesMap = new Map(apiMatches.map((m: any) => [m.id, m]));

        console.log(`Fetched ${apiMatches.length} matches from API for code ${apiCode}`);

        // 3. Fetch Local Matches for this Championship
        const matchesRef = adminDb.collection("matches");
        const localMatchesSnap = await matchesRef.where("championshipId", "==", championshipId).get();

        const batch = adminDb.batch();
        let updatesCount = 0;

        localMatchesSnap.forEach(doc => {
            const localMatch = doc.data();
            // We need an API ID to link
            const apiId = localMatch.apiId || localMatch.externalId;

            if (apiId) {
                const apiMatch = apiMatchesMap.get(apiId) as any;

                if (apiMatch) {
                    const apiDate = new Date(apiMatch.utcDate);
                    const localDate = localMatch.date.toDate();

                    // Check for Date/Time difference (> 5 mins)
                    const timeDiff = Math.abs(apiDate.getTime() - localDate.getTime());
                    const isDateChanged = timeDiff > 1000 * 60 * 5;

                    // Check status mapping as well
                    let newStatus = 'scheduled';
                    if (apiMatch.status === 'IN_PLAY' || apiMatch.status === 'PAUSED') newStatus = 'live';
                    if (apiMatch.status === 'FINISHED') newStatus = 'finished';

                    if (isDateChanged || localMatch.status !== newStatus) {
                        const updateData: any = {
                            lastUpdated: Timestamp.now()
                        };

                        if (isDateChanged) {
                            updateData.date = Timestamp.fromDate(apiDate);
                        }

                        if (localMatch.status !== newStatus) {
                            updateData.status = newStatus;
                        }

                        batch.update(doc.ref, updateData);
                        updatesCount++;
                    }
                }
            }
        });

        if (updatesCount > 0) {
            await batch.commit();
        }

        return NextResponse.json({
            success: true,
            message: `${updatesCount} partidas sincronizadas com sucesso.`,
            updates: updatesCount
        });

    } catch (error: any) {
        console.error("Sync Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
