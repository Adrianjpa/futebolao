"use client";

import { useState } from "react";
import { doc, collection, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { ChampionshipForm, ChampionshipFormData } from "@/components/admin/ChampionshipForm";

export default function NewChampionshipPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const onSubmit = async (values: ChampionshipFormData) => {
        setIsSubmitting(true);
        try {
            // Create championship document
            const docRef = doc(collection(db, "championships"));
            await setDoc(docRef, {
                id: docRef.id,
                ...values,
                status: "rascunho", // Default status
                createdAt: serverTimestamp(),
                participants: [], // Initialize empty
                teams: [], // Initialize empty (will be populated by teams tab)
            });

            alert("Campeonato criado com sucesso!");
            router.push("/admin/championships");
        } catch (error) {
            console.error("Erro ao criar campeonato:", error);
            alert("Erro ao criar campeonato.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Novo Campeonato</h1>
            </div>

            <ChampionshipForm onSubmit={onSubmit} isSubmitting={isSubmitting} submitLabel="Criar Campeonato" />
        </div>
    );
}
