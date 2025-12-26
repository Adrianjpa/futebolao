import { NextResponse } from "next/server";
import { db } from "@/lib/firebase"; // Uses server-compatible db initialization if properly set up, or client sdk
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";

// Note: Ensure @/lib/firebase exports 'db' initialized with client SDK (which works in Next.js API routes usually if envs are public)
// Or use admin SDK if needed. For now, try existing db export.

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const results: any = {
            euroParticipants: [],
            allUsers: []
        };

        // 1. Get Eurocopa 2012
        const campsSnap = await getDocs(collection(db, "championships"));
        campsSnap.forEach(doc => {
            const data = doc.data();
            if (data.name.includes("Eurocopa")) {
                results.euroParticipants = data.participants || [];
                results.euroId = doc.id;
            }
        });

        // 2. Get All Users
        const usersSnap = await getDocs(collection(db, "users"));
        usersSnap.forEach(doc => {
            results.allUsers.push({ id: doc.id, ...doc.data() });
        });

        return NextResponse.json(results);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST() {
    try {
        const ghosts = ["adriano", "elisson", "anderson"];
        const created = [];

        for (const name of ghosts) {
            // Check if exists
            const q = query(collection(db, "users"), where("email", "==", `${name.toLowerCase()}@exemplo.com`));
            const snap = await getDocs(q);

            if (snap.empty) {
                const newUser = {
                    displayName: name.charAt(0).toUpperCase() + name.slice(1),
                    email: `${name.toLowerCase()}@exemplo.com`,
                    photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
                    role: "user",
                    status: "pendente", // Inativo/Pendente
                    createdAt: new Date(),
                    isGhost: true // Marker
                };
                const docRef = await addDoc(collection(db, "users"), newUser);
                created.push({ id: docRef.id, ...newUser });
            }
        }

        return NextResponse.json({ message: "Ghosts created", created });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
