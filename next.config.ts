import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Security headers applied to all responses
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // HTTPS enforcement (Vercel already does this, but explicit is better)
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Prevent clickjacking
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Prevent MIME-type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Referrer policy: only send origin to same scheme
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Permissions policy: deny camera, microphone, geolocation
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          // Content Security Policy
          // - default-src 'self': only load resources from our own origin
          // - script-src 'self' 'unsafe-inline' 'unsafe-eval': Next.js needs inline scripts
          // - style-src 'self' 'unsafe-inline': Tailwind + shadcn need inline styles
          // - img-src 'self' data: blob: https: allow images from anywhere (incl. Google avatars)
          // - font-src 'self' data: Tailwind fonts
          // - connect-src 'self' https://business.wave.com https://api.resend.com https://api.twilio.com: backend APIs
          // - frame-ancestors 'none': prevent embedding (clickjacking)
          // - base-uri 'self': prevent base tag injection
          // - form-action 'self' https://accounts.google.com: allow Google OAuth redirect
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://business.wave.com https://api.resend.com https://api.twilio.com wss:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self' https://accounts.google.com",
              "object-src 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
