"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { Trophy, Loader2 } from "lucide-react";

export default function LandingClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // --- LOGIN STATE ---
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // --- REGISTER STATE ---
  const [regName, setRegName] = useState("");
  const [regNickname, setRegNickname] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState("");

  // --- HANDLERS ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setLoginError("Erro ao fazer login. Verifique suas credenciais.");
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRegError("");

    try {
      // 1. Create User in Auth
      const userCredential = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      const user = userCredential.user;

      // 2. Update Profile (Display Name)
      await updateProfile(user, {
        displayName: regName,
      });

      // 3. Create User Document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        nome: regName,
        nickname: regNickname,
        email: regEmail,
        fotoPerfil: user.photoURL || "",
        funcao: "usuario",
        status: "pendente",
        championshipStats: {},
        ultimoLogin: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setRegError("Este email já está em uso.");
      } else {
        setRegError("Erro ao criar conta. Tente novamente.");
      }
      setLoading(false);
    }
  };

  const handleGoogleAuth = async (isRegister: boolean) => {
    const provider = new GoogleAuthProvider();
    setLoading(true);
    if (!isRegister) setLoginError(""); else setRegError("");

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user document exists
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // NEW USER: Create with 'pendente' status
        await setDoc(userRef, {
          id: user.uid,
          nome: user.displayName || "",
          email: user.email || "",
          fotoPerfil: user.photoURL || "",
          funcao: "usuario",
          status: "pendente", // FORCE PENDING
          championshipStats: {},
          ultimoLogin: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      } else {
        // EXISTING USER: Just update login time, preserve status
        await setDoc(userRef, {
          ultimoLogin: serverTimestamp()
        }, { merge: true });
      }

      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      const msg = "Erro ao autenticar com Google.";
      if (!isRegister) setLoginError(msg); else setRegError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-2xl shadow-primary/10">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6">
            {/* Light Mode Logo (Colored/Dark) */}
            <div className="dark:hidden h-16 w-auto">
              <img src="/images/logo-full-dark.png?v=2" alt="FuteBolão" className="h-full w-auto object-contain" />
            </div>
            {/* Dark Mode Logo (White/Light) */}
            <div className="hidden dark:block h-16 w-auto">
              <img src="/images/logo-full-light.png?v=2" alt="FuteBolão" className="h-full w-auto object-contain" />
            </div>
          </div>
          <CardDescription className="text-base">
            O sistema de bolão oficial da galera
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Cadastro</TabsTrigger>
            </TabsList>

            {/* LOGIN TAB */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                {loginError && <div className="text-red-500 text-sm p-2 bg-red-50/10 rounded border border-red-500/20 text-center">{loginError}</div>}

                <div className="space-y-2">
                  <Label htmlFor="loginEmail">Email</Label>
                  <Input
                    id="loginEmail"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loginPassword">Senha</Label>
                  <Input
                    id="loginPassword"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <a href="/forgot-password" className="text-xs text-primary hover:underline">Esqueceu a senha?</a>
                </div>

                <Button type="submit" className="w-full font-bold" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Entrar
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Ou</span>
                  </div>
                </div>

                <Button variant="outline" type="button" className="w-full" onClick={() => handleGoogleAuth(false)} disabled={loading}>
                  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                    <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                  </svg>
                  Entrar com Google
                </Button>
              </form>
            </TabsContent>

            {/* REGISTER TAB */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                {regError && <div className="text-red-500 text-sm p-2 bg-red-50/10 rounded border border-red-500/20 text-center">{regError}</div>}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="regName">Nome</Label>
                    <Input
                      id="regName"
                      placeholder="Seu nome"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regNickname">Apelido</Label>
                    <Input
                      id="regNickname"
                      placeholder="Apelido"
                      value={regNickname}
                      onChange={(e) => setRegNickname(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regEmail">Email</Label>
                  <Input
                    id="regEmail"
                    type="email"
                    placeholder="seu@email.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regPassword">Senha</Label>
                  <Input
                    id="regPassword"
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <Button type="submit" className="w-full font-bold" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Criar Conta
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Ou</span>
                  </div>
                </div>

                <Button variant="outline" type="button" className="w-full" onClick={() => handleGoogleAuth(true)} disabled={loading}>
                  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                    <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                  </svg>
                  Cadastrar com Google
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center text-xs text-muted-foreground pb-6">
          © 2024 FuteBolão
        </CardFooter>
      </Card>
    </div>
  );
}
