"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminUpdate } from "@/contexts/AdminUpdateContext";

export function ClientGlobalUpdater() {
    const { profile } = useAuth();
    const { progress, logs } = useAdminUpdate();
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const isAdmin = profile?.funcao === 'admin';

    // Watch logs to trigger toast
    useEffect(() => {
        if (logs.length > 0) {
            const lastLog = logs[logs.length - 1];
            // Only show toast for success/updates to avoid spam
            if (lastLog.includes("SUCESSO:") || lastLog.includes("jogos atualizados")) {
                setToastMsg(lastLog.split('- ')[1] || lastLog);
                setTimeout(() => setToastMsg(null), 4000);
            }
        }
    }, [logs]);

    if (!isAdmin) return null;

    return (
        <>
            {/* Progress Bar (Yellow Line) */}
            <div className="fixed top-0 left-0 w-full h-1 z-[100] bg-transparent pointer-events-none">
                <div
                    className="h-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)] transition-all duration-300 ease-linear"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Toast */}
            {toastMsg && (
                <div className="fixed bottom-4 right-4 z-50 bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-md shadow-lg flex items-center gap-3 animate-in slide-in-from-right-5 fade-in duration-300">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-mono">{toastMsg}</span>
                </div>
            )}
        </>
    );
}
