import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST() {
    try {
        const testUsers = [
            {
                displayName: "Neymar Jr (Fake)",
                nickname: "Neymar Jr (Fake)", // Added for UserSearch compatibility
                email: "neymar.fake@exemplo.com",
                photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Neymar",
                role: "user",
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                displayName: "Vini Jr (Fake)",
                nickname: "Vini Jr (Fake)",
                email: "vini.fake@exemplo.com",
                photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vini",
                role: "user",
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                displayName: "Marta (Fake)",
                nickname: "Marta (Fake)",
                email: "marta.fake@exemplo.com",
                photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marta",
                role: "user",
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                displayName: "Pelé Eterno",
                nickname: "Pelé Eterno",
                email: "pele.fake@exemplo.com",
                photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pele",
                role: "user",
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                displayName: "Formiga (Fake)",
                nickname: "Formiga (Fake)",
                email: "formiga.fake@exemplo.com",
                photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Formiga",
                role: "user",
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];

        let createdCount = 0;

        for (const user of testUsers) {
            // Check if user already exists
            const snapshot = await adminDb.collection('users').where('email', '==', user.email).get();

            if (snapshot.empty) {
                await adminDb.collection('users').add(user);
                createdCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `${createdCount} usuários de teste criados com sucesso!`,
            count: createdCount
        });

    } catch (error: any) {
        console.error("Erro ao criar usuários de teste:", error);
        console.error("Stack trace:", error.stack);
        return NextResponse.json({ error: error.message, details: error.stack }, { status: 500 });
    }
}
