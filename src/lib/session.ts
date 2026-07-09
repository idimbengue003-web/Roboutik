"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

const SESSION_KEY = "rb_session_user_id";

export function useSession() {
  const { me, setMe } = useAppStore();
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    (async () => {
      const stored = typeof window !== "undefined"
        ? window.localStorage.getItem(SESSION_KEY)
        : null;
      if (!stored) {
        setLoading(false);
        return;
      }
      try {
        const r = await fetch(`/api/me?userId=${stored}`);
        if (r.ok) {
          const d = await r.json();
          if (d.user) setMe(d.user);
        }
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    })();
  }, [setMe]);

  function saveSession(userId: string) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SESSION_KEY, userId);
    }
  }

  function clearSession() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_KEY);
    }
    setMe(null);
  }

  return { me, loading, saveSession, clearSession };
}

export function getSessionUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}
