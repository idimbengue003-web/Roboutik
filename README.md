# Roboutik 🎮

Site d'achat Roblox simple pour enfants, avec paiement Wave, discussion vendeur, et validation automatique 24h.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS 4** + shadcn/ui
- **Prisma** + SQLite (dev) / PostgreSQL (prod recommandé)
- **Zustand** (state)
- **Lucide** (icons)

## Fonctionnalités

- 🔐 Connexion Google (simulée — remplaçable par NextAuth Google OAuth)
- 🎮 6 jeux Roblox populaires avec annonces
- 💸 Page de paiement dédiée avec bouton Wave + montant
- ⏱️ Validation automatique après 24h (compteur en temps réel)
- 💬 Canal de discussion acheteur ↔ vendeur
- ⭐ Système de notation par étoiles après validation
- 🏪 Espace vendeur : publier annonces, solde, retrait Wave, historique
- 🔍 Recherche + filtre prix + tri dans les annonces

## Développement local

```bash
bun install
bun run db:push   # Crée les tables dans ta base PostgreSQL
bun run dev
```

Ouvrir http://localhost:3000

> Tu peux utiliser une base PostgreSQL Neon gratuite pour le dev local
> (https://neon.tech), ou une base PostgreSQL locale.

## Déploiement Vercel

1. Connecte ce repo GitHub à Vercel : https://vercel.com/new
2. Configure la variable d'environnement :
   - `DATABASE_URL` — l'URL de connexion Neon
     (format : `postgresql://user:password@host/dbname?sslmode=require`)
3. Vercel build automatiquement avec `bun run build` (Prisma generate + Next build)
4. La base Neon est créée automatiquement si tu passes par le marketplace Neon dans Vercel

> ⚠️ Le schéma utilise PostgreSQL — il ne fonctionnera pas avec SQLite en prod.
> Pour revenir à SQLite en local, change `provider = "postgresql"` en `"sqlite"`
> dans `prisma/schema.prisma` (mais attention aux conflits).

## Notes

- L'API Wave est simulée — remplace le code dans `src/app/api/orders/[id]/pay/route.ts` par ton vrai appel API Wave (méthode Graph).
- La connexion Google est simulée — remplace par NextAuth avec `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`.
