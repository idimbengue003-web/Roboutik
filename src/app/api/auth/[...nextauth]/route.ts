import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import type { Adapter } from "next-auth/adapters";

/**
 * NextAuth configuration for Roboutik.
 *
 * Required env vars:
 *  - GOOGLE_CLIENT_ID
 *  - GOOGLE_CLIENT_SECRET
 *  - NEXTAUTH_SECRET (random 32+ chars string, used to sign session JWTs)
 *  - NEXTAUTH_URL (e.g. https://roboutik.vercel.app in prod, http://localhost:3000 in dev)
 *
 * In Google Cloud Console, create an OAuth 2.0 Client ID and add:
 *  - Authorized JavaScript origin: https://roboutik.vercel.app + http://localhost:3000
 *  - Authorized redirect URI:
 *      https://roboutik.vercel.app/api/auth/callback/google
 *      http://localhost:3000/api/auth/callback/google
 */

export const authOptions: NextAuthOptions = {
  // PrismaAdapter handles user/account/session persistence in our DB
  adapter: PrismaAdapter(db) as Adapter,
  session: {
    // Use JWT strategy — required for Vercel serverless (no DB session reads on every request)
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          // Request basic profile + email
          scope: "openid email profile",
          prompt: "select_account",
        },
      },
    }),
  ],
  callbacks: {
    /**
     * On sign-in: ensure our User row exists in Prisma with the right fields.
     * PrismaAdapter creates User automatically, but we need to backfill
     * username/avatar because Google doesn't provide a Roboutik-style username.
     */
    async signIn({ user, account, profile }) {
      if (!user.email) return false;

      // Find or create the user in our DB with all required fields
      const existing = await db.user.findUnique({
        where: { email: user.email },
      });

      if (!existing) {
        // Create with sensible defaults; user can edit later
        const username =
          (profile?.name as string | undefined)?.trim() ||
          user.email.split("@")[0].slice(0, 20) ||
          "Joueur";
        await db.user.create({
          data: {
            email: user.email,
            username,
            avatar: "🎮",
            googleSub: account?.providerAccountId ?? null,
            isSeller: false,
            isAdmin: false,
            balance: 0,
          },
        });
      } else if (!existing.googleSub && account?.providerAccountId) {
        // Link googleSub to existing account
        await db.user.update({
          where: { id: existing.id },
          data: { googleSub: account.providerAccountId },
        });
      }

      // Block banned users from signing in
      if (existing?.isBanned) {
        return `/api/auth/signin?error=banned&reason=${encodeURIComponent(
          existing.banReason ?? "Ton compte est banni. Contacte le support."
        )}`;
      }

      return true;
    },

    /**
     * Inject the Prisma user id into the JWT so we can use it in API routes
     * and on the client to fetch the full user object from /api/me.
     */
    async jwt({ token, user, account }) {
      // On first sign-in: user is defined
      if (user?.email) {
        const dbUser = await db.user.findUnique({
          where: { email: user.email },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.username = dbUser.username;
          token.isAdmin = dbUser.isAdmin;
          token.isSeller = dbUser.isSeller;
          token.isBanned = dbUser.isBanned;
        }
      }
      // Refresh on subsequent calls (in case user was banned since)
      if (token.userId && !user) {
        const dbUser = await db.user.findUnique({
          where: { id: token.userId as string },
        });
        if (dbUser) {
          token.username = dbUser.username;
          token.isAdmin = dbUser.isAdmin;
          token.isSeller = dbUser.isSeller;
          token.isBanned = dbUser.isBanned;
        }
      }
      return token;
    },

    /**
     * Forward token fields to the client session.
     */
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.userId as string | undefined;
        (session.user as { username?: string }).username = token.username as
          | string
          | undefined;
        (session.user as { isAdmin?: boolean }).isAdmin = token.isAdmin as
          | boolean
          | undefined;
        (session.user as { isSeller?: boolean }).isSeller = token.isSeller as
          | boolean
          | undefined;
        (session.user as { isBanned?: boolean }).isBanned = token.isBanned as
          | boolean
          | undefined;
      }
      return session;
    },
  },
  pages: {
    // We'll use the default NextAuth sign-in page for now; can customize later
    signIn: "/api/auth/signin",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
