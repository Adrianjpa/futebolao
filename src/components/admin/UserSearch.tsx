
import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { getDocs, query, collection, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface UserSearchProps {
    onSelect: (user: any) => void;
    disabled?: boolean;
}

export function UserSearch({ onSelect, disabled }: UserSearchProps) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [foundUsers, setFoundUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Initial fetch of active users
    useEffect(() => {
        if (!open) return;
        const fetchInitial = async () => {
            setLoading(true);
            try {
                const usersRef = collection(db, "users");
                // Fetch first 20 users initially
                const q = query(usersRef, limit(20));
                const snap = await getDocs(q);
                setFoundUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchInitial();
    }, [open]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm) {
                performSearch(searchTerm);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Search users in Firestore
    const performSearch = async (term: string) => {
        setLoading(true);
        try {
            const usersRef = collection(db, "users");
            let q;

            if (term.length < 1) {
                q = query(usersRef, limit(20));
            } else {
                q = query(
                    usersRef,
                    where("displayName", ">=", term),
                    where("displayName", "<=", term + '\uf8ff'),
                    limit(20)
                );
            }

            const snap = await getDocs(q);
            setFoundUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        // Loading state is set immediately to give feedback, strict search happens after debounce
        if (term) setLoading(true);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                    disabled={disabled}
                >
                    {disabled ? "Participantes consolidados (Bloqueado)" : "Pesquisar usuário..."}
                    {!disabled && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command shouldFilter={false}>
                    <CommandInput placeholder="Digite o nome..." value={searchTerm} onValueChange={handleSearch} />
                    <CommandList>
                        {loading && <CommandItem disabled>Carregando...</CommandItem>}
                        {!loading && foundUsers.length === 0 && <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>}
                        <CommandGroup>
                            {foundUsers.map((user) => (
                                <CommandItem
                                    key={user.id}
                                    onSelect={() => {
                                        onSelect(user);
                                        setOpen(false);
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-[10px]">
                                            {user.photoUrl ? <img src={user.photoUrl} alt={user.displayName} className="h-full w-full object-cover" /> : (user.nickname?.[0] || user.displayName?.[0] || "?")}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{user.nickname || user.nome || user.displayName}</span>
                                            <span className="text-[10px] text-muted-foreground">{user.email}</span>
                                        </div>
                                    </div>
                                    <Check className={cn("ml-auto h-4 w-4", "hidden")} />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
