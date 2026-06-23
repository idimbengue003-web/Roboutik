import { NextRequest, NextResponse } from "next/server";

/**
 * In-memory rate limiter by IP address.
 *
 * Limits:
 *  - 200 requests per minute per IP for general API routes (GET polling is frequent)
 *  - 10 requests per minute per IP for sensitive POST/PATCH/DELETE routes
 *
 * Note: In-memory storage resets on each serverless cold start, so this is a
 * best-effort protection. For production-grade rate limiting, use Upstash Redis.
 *
 * Skips:
 *  - Static assets (_next/static, _next/image, favicon, public/)
 *  - The homepage itself
 *  - Frequently polled GET routes (init, games, listings, auth/session, me)
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const GENERAL_LIMIT = 200; // req per window (generous for polling)
const SENSITIVE_LIMIT = 10; // req per window for destructive actions
const WINDOW_MS = 60 * 1000; // 1 minute

// Sensitive routes that have stricter rate limits (POST/PATCH/DELETE only)
const SENSITIVE_PATTERNS = [
  "/api/orders", // POST creates an order + POST messages/pay/validate/rate/report
  "/api/seller/listings", // POST create listing
  "/api/seller/withdrawals", // POST withdrawal request
  "/api/seller/become", // POST become seller
  "/api/auth/signin", // sign-in attempts
  "/api/auth/callback", // OAuth callbacks
  "/api/support/tickets", // POST create ticket
  "/api/account/delete", // POST delete account
  "/api/account/profile", // PATCH update profile
  "/api/admin/users", // POST ban/unban
  "/api/admin/withdrawals", // POST validate/reject
  "/api/admin/errors", // PATCH resolve error
  "/api/conversations", // POST create + POST messages
];

// GET routes that are polled frequently and should be exempt from rate limiting
const EXEMPT_GET_ROUTES = [
  "/api/init",
  "/api/games",
  "/api/listings",
  "/api/auth/session",
  "/api/auth/providers",
  "/api/me",
  "/api/orders", // GET orders is polled for badges + chat drawer
  "/api/orders/", // GET messages, GET poll
  "/api/conversations", // GET conversations list
  "/api/conversations/", // GET messages
  "/api/seller/balance", // GET seller dashboard
  "/api/seller/listings", // GET seller listings
  "/api/support/tickets", // GET user tickets
  "/api/support/tickets/", // GET ticket messages
  "/api/support/admin/tickets", // GET admin tickets
  "/api/admin/stats", // GET admin stats
  "/api/admin/users", // GET users list
  "/api/admin/audit", // GET audit log
  "/api/admin/errors", // GET errors list
  "/api/wave/test", // GET wave connection test
];

// Store per IP
const generalStore = new Map<string, RateLimitEntry>();
const sensitiveStore = new Map<string, RateLimitEntry>();

// Periodically clean up expired entries (every 5 min)
let lastCleanup = Date.now();
function cleanupIfNeeded() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60 * 1000) return;
  lastCleanup = now;
  for (const store of [generalStore, sensitiveStore]) {
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  }
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

function checkRate(
  store: Map<string, RateLimitEntry>,
  key: string,
  limit: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    const entry: RateLimitEntry = { count: 1, resetAt: now + WINDOW_MS };
    store.set(key, entry);
    return { allowed: true, remaining: limit - 1, resetAt: entry.resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count++;
  return {
    allowed: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  };
}

export function middleware(req: NextRequest) {
  cleanupIfNeeded();

  // Skip static assets
  const path = req.nextUrl.pathname;
  if (
    path.startsWith("/_next/") ||
    path.startsWith("/favicon") ||
    path === "/logo.svg" ||
    path === "/robots.txt" ||
    path.startsWith("/games/") ||
    path === "/" ||
    path === "/steal-a-brainrot-hero.webp" ||
    path === "/wave-logo.png" ||
    path === "/logo-roboutik.png" ||
    path.startsWith("/favicon-") ||
    path === "/apple-touch-icon.png" ||
    path.startsWith("/legal/") ||
    path.startsWith("/how-it-works") ||
    path === "/manifest.json" ||
    path === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  // Only rate-limit /api/ routes
  if (!path.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Exempt frequently-polled GET routes from ALL rate limiting
  if (req.method === "GET") {
    const isExempt = EXEMPT_GET_ROUTES.some(
      (p) => path === p || path.startsWith(p)
    );
    if (isExempt) {
      return NextResponse.next();
    }
  }

  const ip = getIp(req);

  // General rate limit (200 req/min) — applies to non-exempt routes
  const general = checkRate(generalStore, ip, GENERAL_LIMIT);
  if (!general.allowed) {
    return NextResponse.json(
      {
        error: "Trop de requêtes. Réessaie dans 1 minute.",
        retryAfter: Math.ceil((general.resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((general.resetAt - Date.now()) / 1000)
          ),
          "X-RateLimit-Limit": String(GENERAL_LIMIT),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(general.resetAt),
        },
      }
    );
  }

  // For sensitive POST/PATCH/DELETE routes, apply stricter rate limit (10 req/min)
  if (req.method === "POST" || req.method === "PATCH" || req.method === "DELETE") {
    const isSensitive = SENSITIVE_PATTERNS.some(
      (p) => path === p || path.startsWith(p)
    );
    if (isSensitive) {
      const sensitive = checkRate(
        sensitiveStore,
        `${ip}:${path}`,
        SENSITIVE_LIMIT
      );
      if (!sensitive.allowed) {
        return NextResponse.json(
          {
            error: "Trop d'actions. Attends 1 minute.",
            retryAfter: Math.ceil((sensitive.resetAt - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(
                Math.ceil((sensitive.resetAt - Date.now()) / 1000)
              ),
            },
          }
        );
      }
    }
  }

  // Add rate limit headers to the response
  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Limit", String(GENERAL_LIMIT));
  res.headers.set("X-RateLimit-Remaining", String(general.remaining));
  res.headers.set("X-RateLimit-Reset", String(general.resetAt));
  return res;
}

export const config = {
  // Run on all routes except static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
