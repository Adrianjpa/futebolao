
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
                </div>

                <div className="w-full">
                    <UpdateDebugger />
                </div>
            </div>
        </AdminUpdateProvider>
    );
}
