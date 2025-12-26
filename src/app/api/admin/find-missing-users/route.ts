import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, addDoc } from "firebase/firestore";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const results: any = {
            euroId: null,
            predictionsCount: 0,
            uniqueParticipants: [],
            missingUsers: []
        };

        // 1. Find Eurocopa
        const campsSnap = await getDocs(collection(db, "championships"));
        campsSnap.forEach(doc => {
            if (doc.data().name.includes("Eurocopa") || doc.data().name.includes("Euro 2012")) {
                results.euroId = doc.id;
            }
        });

        if (!results.euroId) {
            return NextResponse.json({ error: "Eurocopa not found" });
        }

        // 2. Scan Legacy History
        const q = query(collection(db, "legacy_history"), where("championshipId", "==", results.euroId));
        const historySnap = await getDocs(q);
        results.predictionsCount = historySnap.size;

        const participantSet = new Set<string>();
        historySnap.forEach(doc => {
            const data = doc.data();
            if (data.legacyUserName) participantSet.add(data.legacyUserName);
        });

        results.uniqueParticipants = Array.from(participantSet);

        // 3. Check against Users
        const usersSnap = await getDocs(collection(db, "users"));
        const existingEmails = new Set();
        usersSnap.forEach(doc => {
            const u = doc.data();
            if (u.email) existingEmails.add(u.email.toLowerCase());
        });

        const existingNames = new Set();
        usersSnap.forEach(doc => {
            const u = doc.data();
            const n = u.nome || u.displayName || "";
            if (n) existingNames.add(n.toLowerCase());
        });

        for (const name of results.uniqueParticipants) {
            const email = `${name.toLowerCase()}@exemplo.com`;
            if (!existingEmails.has(email) && !existingNames.has(name.toLowerCase())) {
                results.missingUsers.push(name);
            }
        }

        return NextResponse.json(results);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST() {
    try {
        const missingToCreate: string[] = [];
        const created = [];

        // --- REPEAT DISCOVERY LOGIC ---
        const campsSnap = await getDocs(collection(db, "championships"));
        let euroId = "";
        campsSnap.forEach(doc => {
            if (doc.data().name.includes("Eurocopa") || doc.data().name.includes("Euro 2012")) euroId = doc.id;
        });

        if (!euroId) return NextResponse.json({ error: "Euro not found" });

        const q = query(collection(db, "legacy_history"), where("championshipId", "==", euroId));
        const historySnap = await getDocs(q);
        const participantSet = new Set<string>();
        historySnap.forEach(doc => {
            const data = doc.data();
            if (data.legacyUserName) participantSet.add(data.legacyUserName);
        });

        const usersSnap = await getDocs(collection(db, "users"));
        const existingEmails = new Set();
        const existingNames = new Set();
        usersSnap.forEach(doc => {
            const u = doc.data();
            if (u.email) existingEmails.add(u.email.toLowerCase());
            const n = u.nome || u.displayName || "";
            if (n) existingNames.add(n.toLowerCase());
        });

        Array.from(participantSet).forEach(name => {
            const email = `${name.toLowerCase()}@exemplo.com`;
            if (!existingEmails.has(email) && !existingNames.has(name.toLowerCase())) {
                missingToCreate.push(name);
            }
        });
        // -----------------------------

        for (const name of missingToCreate) {
            const newUser = {
                displayName: name.charAt(0).toUpperCase() + name.slice(1),
                nama: name.charAt(0).toUpperCase() + name.slice(1), // Backwards compat
                nome: name.charAt(0).toUpperCase() + name.slice(1), // Crucial for sorting
                email: `${name.toLowerCase()}@exemplo.com`,
                photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
                fotoPerfil: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`, // Legacy
                role: "user",
                funcao: "usuario", // Legacy
                status: "pendente",
                createdAt: new Date(),
                isGhost: true
            };
            const docRef = await addDoc(collection(db, "users"), newUser);
            created.push({ id: docRef.id, ...newUser });
        }

        return NextResponse.json({ message: "Hydrated", created });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
