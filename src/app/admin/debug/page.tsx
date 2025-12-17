"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import { UpdateDebugger } from "@/components/admin/UpdateDebugger";

export default function AdminDebugPage() {
    return (
        <AuthGuard requiredRole="admin">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Debug de Sistema</h1>
                    <p className="text-muted-foreground">Ferramentas de diagnóstico e atualização manual.</p>
                </div>

                <div className="grid gap-6">
                    <UpdateDebugger />
                </div>
            </div>
        </AuthGuard>
    );
}
