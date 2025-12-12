"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ChampionshipForm, ChampionshipFormData } from "@/components/admin/ChampionshipForm";
import { Loader2 } from "lucide-react";

export default function EditChampionshipPage() {
    const params = useParams();
    const router = useRouter();
    const [championship, setChampionship] = useState<Partial<ChampionshipFormData> | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchChampionship = async () => {
            if (!params.id) return;
            try {
                const docRef = doc(db, "championships", params.id as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    // Convert timestamps to dates for the form
                    const formData = {
                        ...data,
                        startDate: data.startDate?.toDate(),
                        endDate: data.endDate?.toDate(),
                    } as Partial<ChampionshipFormData>;
                    setChampionship(formData);
                } else {
                    alert("Campeonato não encontrado");
                    router.push("/admin/championships");
                }
            } catch (error) {
                console.error("Error fetching championship:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchChampionship();
    }, [params.id, router]);

    const onSubmit = async (values: ChampionshipFormData) => {
        setIsSubmitting(true);
        try {
            const docRef = doc(db, "championships", params.id as string);
            await updateDoc(docRef, {
                ...values,
                updatedAt: serverTimestamp(),
            });

            alert("Campeonato atualizado com sucesso!");
            router.push(`/admin/championships/${params.id}`);
        } catch (error) {
            console.error("Erro ao atualizar campeonato:", error);
            alert("Erro ao atualizar campeonato.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!championship) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Editar Campeonato</h1>
            </div>

            <ChampionshipForm
                initialData={championship}
                onSubmit={onSubmit}
                isSubmitting={isSubmitting}
                submitLabel="Salvar Alterações"
            />
        </div>
    );
}
