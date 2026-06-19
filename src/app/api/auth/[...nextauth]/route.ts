import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";

/**
 * NextAuth configuration for Roboutik.
 *
 * We do NOT use PrismaAdapter because our User schema is custom (no name/
 * emailVerified/image fields). Instead we manage user creation/linking
 * directly in the signIn callback. JWT carries the user id so the client
 * can fetch the full user via /api/me.
 *
 * Required env vars:
 *  - GOOGLE_CLIENT_ID
 *  - GOOGLE_CLIENT_SECRET
 *  - NEXTAUTH_SECRET (random 32+ chars)
 *  - NEXTAUTH_URL (https://roboutik.vercel.app in prod)
 *
 * Google Cloud Console:
 *  - Authorized JavaScript origins: https://roboutik.vercel.app
 *  - Authorized redirect URIs:
 *      https://roboutik.vercel.app/api/auth/callback/google
 */

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    /**
     * On sign-in: find or create our Roboutik user with all custom fields.
     */
    async signIn({ user, account }) {
      if (!user?.email) return false;

      let dbUser = await db.user.findUnique({
        where: { email: user.email },
      });

      if (!dbUser) {
        // Create new user with sensible defaults
        const username =
          (user.name || "").trim().slice(0, 20) ||
          user.email.split("@")[0].slice(0, 20) ||
          "Joueur";
        dbUser = await db.user.create({
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
      } else if (!dbUser.googleSub && account?.providerAccountId) {
        // Link googleSub if missing
        dbUser = await db.user.update({
          where: { id: dbUser.id },
          data: { googleSub: account.providerAccountId },
        });
      }

      // Block banned users
      if (dbUser.isBanned) {
        return `/api/auth/signin?error=banned&reason=${encodeURIComponent(
          dbUser.banReason ?? "Ton compte est banni. Contacte le support."
        )}`;
      }

      return true;
    },

    /**
     * jwt callback: inject the Prisma user id into the JWT.
     */
    async jwt({ token, user, trigger }) {
      const emailForLookup = user?.email || token.email;
      if (emailForLookup) {
        const dbUser = await db.user.findUnique({
          where: { email: emailForLookup as string },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.username = dbUser.username;
          token.isAdmin = dbUser.isAdmin;
          token.isSeller = dbUser.isSeller;
          token.isBanned = dbUser.isBanned;
        }
      }
      // Refresh on subsequent calls (in case user was banned/promoted)
      if (token.userId && trigger !== "signIn" && !user) {
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
     * session callback: forward token fields to the client.
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
    signIn: "/api/auth/signin",
  },
  debug: false,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
