
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";

export async function GET() {
    console.log("Starting Legacy Winner Fix API...");

    // Hardcoded mapping of Legacy Name -> Real User ID for Euro 2012
    const userMapping: Record<string, string> = {
        "Adriano": "WCBY4ojeSLMNAb1hO2wKswGXEgm2",
        "Elisson": "elisson_placeholder_id", // Update if we know real ID, else it stays as 'elisson_legacy' mostly
        "Anderson": "anderson_placeholder_id"
    };

    try {
        const champsRef = collection(db, "championships");
        const q = query(champsRef, where("name", "==", "Eurocopa 2012"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return NextResponse.json({ message: "Eurocopa 2012 not found" }, { status: 404 });
        }

        const euroDoc = snapshot.docs[0];
        const data = euroDoc.data();
        let updated = false;

        // Fix Manual Winners
        const newManualWinners = (data.manualWinners || []).map((winner: any) => {
            if (userMapping[winner.displayName]) {
                updated = true;
                return { ...winner, userId: userMapping[winner.displayName] };
            }
            return winner;
        });

        // Fix Participants
        const newParticipants = (data.participants || []).map((p: any) => {
            if (userMapping[p.displayName]) {
                updated = true;
                return { ...p, userId: userMapping[p.displayName] };
            }
            return p;
        });

        if (updated) {
            await updateDoc(doc(db, "championships", euroDoc.id), {
                manualWinners: newManualWinners,
                participants: newParticipants
            });
            return NextResponse.json({ message: "Success! Updated Eurocopa 2012 with real user IDs." });
        } else {
            return NextResponse.json({ message: "No matching legacy users found to update." });
        }

    } catch (error) {
        console.error("Error fixing legacy winners:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
