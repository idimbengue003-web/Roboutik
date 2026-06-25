import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/lib/auth";
import { ClientErrorTracker } from "@/components/shop/client-error-tracker";
import { ServiceWorkerRegister } from "@/components/shop/sw-register";
import { db } from "@/lib/db";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

async function getSiteConfig() {
  try {
    let config = await db.siteConfig.findUnique({ where: { id: "default" } });
    if (!config) {
      config = await db.siteConfig.create({ data: { id: "default" } });
    }
    return config;
  } catch {
    // If the table doesn't exist yet (before /api/admin/setup is called),
    // fall back to defaults so the site keeps rendering.
    return {
      id: "default",
      primaryColor: "c026d3",
      accentColor: "f97316",
      bgColor: "ffffff",
      siteName: "RobloxBoutik",
      heroTitle: "Achète tes items Roblox préférés",
      heroSubtitle: "Paiement Wave · Livraison rapide · Paiement sécurisé",
      updatedAt: new Date(),
    };
  }
}

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getSiteConfig();
  // Convert hex (without #) to "r g b" for CSS variable consumption
  const hexToRgb = (hex: string) => {
    const h = hex.replace(/^#/, "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `${r} ${g} ${b}`;
  };
  const themeStyle = {
    "--brand-primary": hexToRgb(config.primaryColor),
    "--brand-accent": hexToRgb(config.accentColor),
    "--brand-bg": hexToRgb(config.bgColor),
  } as React.CSSProperties;

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        style={themeStyle}
      >
        <AuthProvider>
          <ServiceWorkerRegister />
          {children}
          <Toaster />
          <ClientErrorTracker />
        </AuthProvider>
      </body>
    </html>
  );
}
