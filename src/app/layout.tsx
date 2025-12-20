import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import { AdminUpdateProvider } from "@/contexts/AdminUpdateContext";
// import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Often desired for app-like feel
};

export const metadata: Metadata = {
  title: "FuteBolão",
  description: "O melhor bolão de futebol entre amigos.",
  manifest: "/manifest.json",
  // appleWebApp: {
  //   capable: true,
  //   statusBarStyle: "black-translucent",
  //   title: "FuteBolão",
  // },
};

import { ClientGlobalUpdater } from "@/components/admin/ClientGlobalUpdater";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.className} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <AdminUpdateProvider>
              <ClientGlobalUpdater />
              {children}
              {/* <Toaster /> */}
            </AdminUpdateProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
