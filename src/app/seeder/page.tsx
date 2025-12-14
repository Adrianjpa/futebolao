"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SeederPage() {
    const [status, setStatus] = useState<string>("Pronto para criar usuários de teste.");
    const [loading, setLoading] = useState(false);

    const runSeed = async () => {
        setLoading(true);
        setStatus("Iniciando criação...");
        try {
            const testUsers = [
                {
                    displayName: "Neymar Jr (Fake)",
                    nickname: "Neymar Jr (Fake)",
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

            const usersRef = collection(db, "users");
            let count = 0;

            for (const user of testUsers) {
                const q = query(usersRef, where("email", "==", user.email));
                const snap = await getDocs(q);
                if (snap.empty) {
                    await addDoc(usersRef, user);
                    count++;
                }
            }
            setStatus(`Sucesso! ${count} novos usuários criados.`);
        } catch (e: any) {
            console.error(e);
            setStatus("Erro: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-10 flex justify-center">
            <Card className="w-[400px]">
                <CardHeader>
                    <CardTitle>Gerador de Dados de Teste</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-slate-500">{status}</p>
                    <Button onClick={runSeed} disabled={loading} className="w-full">
                        {loading ? "Criando..." : "Criar Usuários Fakes"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
