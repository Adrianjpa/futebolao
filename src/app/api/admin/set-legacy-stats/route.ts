
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export async function GET() {
    console.log("Setting Legacy Stats for Adrian...");

    // Adrian's User ID (Captured from debug)
    const userId = "WCBY4ojeSLMNAb1hO2wKswGXEgm2";

    try {
        const userRef = doc(db, "users", userId);

        await updateDoc(userRef, {
            legacyStats: {
                totalPredictions: 31,
                // titlesWon: 1, // Optional: if logic fails we can force it here
                // goldMedals: 2 // Optional
            }
        });

        return NextResponse.json({ message: "Legacy Stats Updated for Adrian (31 Predictions)." });

    } catch (error) {
        console.error("Error setting legacy stats:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
