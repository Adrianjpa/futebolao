
"use client";

import { UpdateDebugger } from "@/components/admin/UpdateDebugger";
import { AdminUpdateProvider } from "@/contexts/AdminUpdateContext";

export default function DebugPage() {
    return (
        <AdminUpdateProvider>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Debug de Sistema</h1>
                        <p className="text-muted-foreground mt-2">Ferramentas de diagnóstico e atualização manual.</p>
                    </div>
                    <div className="flex gap-2">
                        <a href="/admin/migrations/linker" className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2">
                            Ferramenta de Migração
                        </a>
                    </div>
                </div>

                <div className="w-full">
                    <UpdateDebugger />
                </div>
            </div>
        </AdminUpdateProvider>
    );
}
