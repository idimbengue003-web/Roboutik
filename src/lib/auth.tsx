"use client";

import { SessionProvider, useSession, signOut as nextAuthSignOut } from "next-auth/react";
import { useEffect, useState } from "react";
import type { User } from "@/lib/types";

/**
 * Wrapper that provides NextAuth session to the entire app.
 * Use in layout.tsx.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

/**
 * Client hook that returns the current Roboutik user (with all Prisma fields),
 * loading state, and login/logout helpers.
 *
 * Uses next-auth/react's useSession under the hood, then fetches the full
 * user object from /api/me using the session's user.id.
 */
export function useAuth() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const userId = (session?.user as { id?: string } | undefined)?.id;
      if (!userId) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const r = await fetch(`/api/me?userId=${userId}`);
        if (!r.ok) {
          setUser(null);
          return;
        }
        const d = await r.json();
        if (!cancelled) setUser(d.user ?? null);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  return {
    user,
    loading: status === "loading" || loading,
    session,
    // Sign in with Google via NextAuth (redirects to Google)
    signInWithGoogle: () => {
      const callbackUrl = window.location.origin;
      window.location.href = `/api/auth/signin/google?callbackUrl=${encodeURIComponent(
        callbackUrl
      )}`;
    },
    signOut: async () => {
      setUser(null);
      await nextAuthSignOut({
        callbackUrl: "/",
        redirect: true,
      });
    },
  };
}
