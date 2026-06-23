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
  metadataBase: new URL("https://robloxboutik.com"),
  title: "RobloxBoutik — Achète en toute sécurité avec Wave",
  description: "Le site simple pour acheter des objets, comptes et boosters Roblox. Paiement Wave en 1 clic, discussion directe avec le vendeur, validation en toute sécurité.",
  keywords: ["Roblox", "Wave", "achat", "Steal a Brainrot", "Blox Fruits", "Brookhaven", "Adopt Me", "jeux Roblox", "robloxboutik"],
  authors: [{ name: "RobloxBoutik" }],
  creator: "RobloxBoutik",
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://robloxboutik.com",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-64.png", sizes: "64x64", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon-32.png",
  },
  openGraph: {
    title: "RobloxBoutik — Achète Roblox avec Wave",
    description: "Paiement Wave en 1 clic, discussion directe vendeur, validation sécurisée. Steal a Brainrot, Blox Fruits, Brookhaven et plus !",
    siteName: "RobloxBoutik",
    type: "website",
    images: [
      {
        url: "/logo-roboutik.png",
        width: 1024,
        height: 1024,
        alt: "RobloxBoutik",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RobloxBoutik — Achète Roblox avec Wave",
    description: "Paiement Wave en 1 clic, discussion directe vendeur, validation sécurisée.",
    images: ["/logo-roboutik.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
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
