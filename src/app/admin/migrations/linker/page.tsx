
import { LegacyLinker } from "@/components/admin/LegacyLinker";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LinkerPage() {
    return (
        <div className="space-y-6 container mx-auto py-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/debug">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Migração de Dados Legados</h1>
                    <p className="text-muted-foreground">
                        Vinculação de histórico antigo (Euro 2012, etc) a usuários reais do sistema.
                    </p>
                </div>
            </div>

            <div className="border-t pt-6">
                <LegacyLinker />
            </div>
        </div>
    );
}
