import Link from "next/link";
import { MoveLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function NotFound() {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground animate-in fade-in zoom-in duration-500">
            <h1 className="text-9xl font-black text-primary/20 select-none">404</h1>
            <div className="absolute flex flex-col items-center space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">Página não encontrada</h2>
                <p className="text-muted-foreground text-center max-w-[500px]">
                    Ocorreu um erro ou a página que você está procurando não existe.
                </p>
                <Button asChild size="lg" className="mt-8 rounded-full">
                    <Link href="/dashboard">
                        <MoveLeft className="mr-2 h-4 w-4" />
                        Voltar para o Início
                    </Link>
                </Button>
            </div>
        </div>
    );
}
