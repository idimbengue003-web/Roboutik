import { NextRequest, NextResponse } from "next/server";

/**
 * In-memory rate limiter by IP address.
 *
 * Limits:
 *  - 60 requests per minute per IP for general API routes
 *  - 5 requests per minute per IP for sensitive POST routes (orders, withdrawals, login)
 *
 * Note: In-memory storage resets on each serverless cold start, so this is a
 * best-effort protection. For production-grade rate limiting, use Upstash Redis.
 *
 * Skips:
 *  - Static assets (_next/static, _next/image, favicon, public/)
 *  - The homepage itself
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const GENERAL_LIMIT = 60; // req per window
const SENSITIVE_LIMIT = 5; // req per window
const WINDOW_MS = 60 * 1000; // 1 minute

// Sensitive routes that have stricter rate limits
const SENSITIVE_PATTERNS = [
  "/api/orders", // POST creates an order
  "/api/orders/", // POST messages, pay, validate, rate, report
  "/api/seller/listings", // POST create listing
  "/api/seller/withdrawals", // POST withdrawal request
  "/api/seller/become", // POST become seller
  "/api/auth/signin", // sign-in attempts
  "/api/auth/callback", // OAuth callbacks
  "/api/support/tickets", // POST create ticket
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
  // Vercel provides the client IP in these headers
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
    path.startsWith("/games/") || // public game images
    path === "/" ||
    path === "/steal-a-brainrot-hero.png"
  ) {
    return NextResponse.next();
  }

  // Only rate-limit /api/ routes
  if (!path.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Skip /api/init and /api/games (frequently polled)
  if (path === "/api/init" || path === "/api/games" || path === "/api/listings") {
    return NextResponse.next();
  }

  const ip = getIp(req);

  // Always apply general rate limit
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

  // For sensitive POST routes, apply stricter rate limit
  if (req.method === "POST" || req.method === "PATCH" || req.method === "DELETE") {
    const isSensitive = SENSITIVE_PATTERNS.some((p) => path.startsWith(p));
    if (isSensitive) {
      const sensitive = checkRate(sensitiveStore, `${ip}:${path}`, SENSITIVE_LIMIT);
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
