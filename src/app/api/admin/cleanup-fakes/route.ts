import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const fakes = [
            "formiga.fake@exemplo.com",
            "cristiane.fake@exemplo.com" // Just in case
        ];

        const deleted = [];
        const usersRef = collection(db, "users");

        for (const email of fakes) {
            const q = query(usersRef, where("email", "==", email));
            const snap = await getDocs(q);

            for (const d of snap.docs) {
                await deleteDoc(doc(db, "users", d.id));
                deleted.push({ id: d.id, email: d.data().email, name: d.data().displayName || d.data().nome });
            }
        }

        return NextResponse.json({ message: "Remaining Fakes deleted", deleted });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
