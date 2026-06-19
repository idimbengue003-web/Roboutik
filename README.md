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
bun run db:push
bun run dev
```

Ouvrir http://localhost:3000

## Déploiement Vercel

1. Connecte ce repo GitHub à Vercel
2. Variables d'environnement à configurer dans Vercel :
   - `DATABASE_URL` — une URL PostgreSQL (Neon, Supabase, Vercel Postgres, etc.)
3. Pour PostgreSQL, change `provider = "sqlite"` en `provider = "postgresql"` dans `prisma/schema.prisma`
4. Vercel build automatiquement avec `bun run build`

## Notes

- L'API Wave est simulée — remplace le code dans `src/app/api/orders/[id]/pay/route.ts` par ton vrai appel API Wave (méthode Graph).
- La connexion Google est simulée — remplace par NextAuth avec `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`.
