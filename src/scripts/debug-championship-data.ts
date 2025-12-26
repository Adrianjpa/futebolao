
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

async function debugChampionshipData() {
    console.log("Starting Debug...");
    try {
        // Fetch Euro 2012 (or any active championship)
        const champsRef = collection(db, "championships");
        const snapshot = await getDocs(champsRef);

        if (snapshot.empty) {
            console.log("No championships found.");
            return;
        }

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`\nChampionship: ${data.name} (ID: ${doc.id})`);

            console.log("Participants Sample:", data.participants ? data.participants.slice(0, 3) : "None");
            console.log("Manual Winners:", data.manualWinners || "None");

            // Check data types of IDs
            if (data.participants && data.participants.length > 0) {
                console.log("Participant ID Type:", typeof data.participants[0].userId);
                console.log("First Participant UserID:", data.participants[0].userId);
            }
        });

    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

debugChampionshipData();
