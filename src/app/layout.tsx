import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/lib/auth";
import { ClientErrorTracker } from "@/components/shop/client-error-tracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RobloxBoutik — Achète en toute sécurité avec Wave",
  description: "Le site simple pour acheter des objets, comptes et boosters Roblox. Paiement Wave en 1 clic, discussion directe avec le vendeur, validation en toute sécurité.",
  keywords: ["Roblox", "Wave", "achat", "Steal a Brainrot", "Blox Fruits", "Brookhaven", "Adopt Me", "jeux Roblox"],
  authors: [{ name: "RobloxBoutik" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "RobloxBoutik — Achète Roblox avec Wave",
    description: "Paiement Wave en 1 clic, discussion directe vendeur, validation sécurisée.",
    siteName: "RobloxBoutik",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RobloxBoutik",
    description: "Achète Roblox simplement avec Wave.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          {children}
          <Toaster />
          <ClientErrorTracker />
        </AuthProvider>
      </body>
    </html>
  );
}
