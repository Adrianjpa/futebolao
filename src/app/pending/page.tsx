"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, LogOut } from "lucide-react";
import { auth } from "@/lib/firebase";

export default function PendingPage() {
    const { profile } = useAuth();

    // If somehow a user gets here but is NOT pending (e.g. approved while waiting), 
    // we can offer a refresh or link to dashboard. 
    // AuthGuard usually redirects approved users away, but good to have a check/link.

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
            <Card className="max-w-md w-full border-yellow-500/50 shadow-2xl shadow-yellow-500/10">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="bg-yellow-100 p-3 rounded-full">
                            <Clock className="h-10 w-10 text-yellow-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-yellow-900">Aguardando Avaliação</CardTitle>
                    <CardDescription className="text-yellow-800">
                        Olá, <span className="font-semibold">{profile?.nickname || profile?.nome || "Usuário"}</span>!
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4 text-muted-foreground">
                    <p>
                        Sua conta foi criada com sucesso, mas precisa ser aprovada por um administrador para acessar o sistema.
                    </p>
                    <p className="text-sm">
                        Isso mantém nosso bolão seguro e organizado apenas para amigos. Avise ao administrador que você se cadastrou!
                    </p>
                </CardContent>
                <CardFooter className="flex justify-center pt-4">
                    <Button
                        variant="outline"
                        onClick={() => auth.signOut()}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sair da conta
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
