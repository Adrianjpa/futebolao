import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

// Helper to delay execution (to avoid rate limits if we were looping, though not needed for single fetch)
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET(request: Request) {
    // 1. Security Check
    // 1. Security Check
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        console.log("Starting background match update...");

        // 2. Fetch Championships to filter AUTO/HYBRID
        const champsSnap = await adminDb.collection("championships").get();
        const validChamps = new Set<string>();

        champsSnap.forEach(doc => {
            const data = doc.data();
            if (data.type === 'AUTO' || data.type === 'HYBRID') {
                validChamps.add(doc.id);
            }
        });

        console.log(`Found ${validChamps.size} AUTO/HYBRID championships.`);

        // 3. Fetch "Active" Matches from Firestore
        // We want matches that are 'live' OR 'scheduled' but should have started (e.g., within last 4 hours)
        // For simplicity, let's fetch all 'live' matches AND 'scheduled' matches from today.

        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        const matchesRef = adminDb.collection("matches");
        const liveQuery = matchesRef.where("status", "==", "live");
        const scheduledQuery = matchesRef.where("status", "==", "scheduled")
            .where("date", ">=", startOfDay);

        const [liveSnap, scheduledSnap] = await Promise.all([
            liveQuery.get(),
            scheduledQuery.get()
        ]);

        const localMatches: any[] = [];

        // Helper to process docs
        const processDoc = (doc: any) => {
            const data = doc.data();
            // Only include if it belongs to a valid championship AND has an apiId
            if (validChamps.has(data.championshipId) && data.apiId) {
                localMatches.push({ id: doc.id, ...data });
            }
        };

        liveSnap.forEach(processDoc);
        scheduledSnap.forEach(processDoc);

        console.log(`Found ${localMatches.length} candidate matches to check in Firestore.`);

        if (localMatches.length === 0) {
            return NextResponse.json({ message: "No active matches to update." });
        }

        // 4. Fetch Live Data from External API
        // We fetch matches for a 3-day window (Yesterday, Today, Tomorrow) to catch:
        // - Live games (Today)
        // - Finished games (Yesterday/Today)
        // - Schedule changes/Anticipations (Tomorrow -> Today)
        const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

        const today = new Date();
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        const url = `https://api.football-data.org/v4/matches?dateFrom=${formatDate(yesterday)}&dateTo=${formatDate(tomorrow)}`;

        const response = await fetch(url, {
            headers: { "X-Auth-Token": API_KEY || "" },
            next: { revalidate: 0 } // No cache for cron
        });

        if (!response.ok) {
            console.error(`External API Request Failed: ${response.status} ${response.statusText}`);
            // Return 200 to keep cron execution passing, but log the error
            return NextResponse.json({
                success: false,
                error: `External API Error: ${response.status}`,
                details: await response.text()
            }, { status: 200 });
        }

        const data = await response.json();
        const apiMatches = data.matches || [];
        const apiMatchesMap = new Map(apiMatches.map((m: any) => [m.id, m]));

        console.log(`Fetched ${apiMatches.length} live/finished matches from External API.`);

        // 5. Update Firestore
        let updatesCount = 0;
        const batch = adminDb.batch();

        for (const localMatch of localMatches) {
            const apiMatch = apiMatchesMap.get(localMatch.apiId) as any;

            if (apiMatch) {
                // Map Status
                let newStatus = 'scheduled';
                if (apiMatch.status === 'IN_PLAY' || apiMatch.status === 'PAUSED') newStatus = 'live';
                if (apiMatch.status === 'FINISHED') newStatus = 'finished';

                const apiHomeScore = apiMatch.score.fullTime.home ?? 0;
                const apiAwayScore = apiMatch.score.fullTime.away ?? 0;

                // Check for changes
                // Also check if date has changed significantly (e.g. > 5 mins difference to avoid drift noise)
                const apiDate = new Date(apiMatch.utcDate);
                const localDate = localMatch.date.toDate();
                const timeDiff = Math.abs(apiDate.getTime() - localDate.getTime());
                const isDateChanged = timeDiff > 1000 * 60 * 5; // 5 minutes tolerance

                if (localMatch.homeScore !== apiHomeScore ||
                    localMatch.awayScore !== apiAwayScore ||
                    localMatch.status !== newStatus ||
                    isDateChanged) {

                    const matchRef = matchesRef.doc(localMatch.id);
                    const updateData: any = {
                        homeScore: apiHomeScore,
                        awayScore: apiAwayScore,
                        status: newStatus,
                        lastUpdated: Timestamp.now()
                    };

                    if (isDateChanged) {
                        updateData.date = Timestamp.fromDate(apiDate);
                        console.log(`Date updated for match ${localMatch.homeTeamName} vs ${localMatch.awayTeamName}`);
                    }

                    batch.update(matchRef, updateData);
                    updatesCount++;
                }
            }
        }

        if (updatesCount > 0) {
            await batch.commit();
            console.log(`Updated ${updatesCount} matches.`);
        } else {
            console.log("No updates needed.");
        }

        return NextResponse.json({
            success: true,
            updates: updatesCount,
            checked: localMatches.length
        });

    } catch (error: any) {
        console.error("Cron Error:", error);
        // CRITICAL: Return 200 to prevent cron-service from disabling the job on transient errors
        return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }
}
