/**
 * Sanitize user-generated content to prevent XSS attacks.
 *
 * Uses simple regex-based sanitization (no DOMPurify/jsdom dependency
 * which doesn't work on Vercel serverless).
 *
 * React already escapes text content by default, so this is extra
 * defense in depth.
 */

/**
 * Strip ALL HTML tags from a string. Returns plain text only.
 */
export function sanitizePlainText(input: string): string {
  if (!input) return "";
  // Remove HTML tags
  const cleaned = input
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .trim();
  return cleaned;
}

/**
 * Sanitize message content (same as plain text — no HTML allowed).
 */
export function sanitizeMessage(input: string): string {
  return sanitizePlainText(input);
}

/**
 * Sanitize a username: alphanumeric + spaces + a few safe characters.
 * Max 30 chars.
 */
export function sanitizeUsername(input: string): string {
  if (!input) return "";
  const cleaned = input.trim().replace(/[^\p{L}\p{N} _.\-]/gu, "");
  return cleaned.slice(0, 30);
}

/**
 * Sanitize an emoji avatar (1-10 chars, no script tags).
 */
export function sanitizeAvatar(input: string): string {
  if (!input) return "🎮";
  // Remove HTML tags, keep only text/emoji
  const cleaned = input.replace(/<[^>]*>/g, "").trim();
  return cleaned.slice(0, 10) || "🎮";
}

/**
 * Sanitize a Wave phone number: digits only, kept as is.
 */
export function sanitizePhone(input: string): string {
  if (!input) return "";
  return input.replace(/[^\d+]/g, "").slice(0, 20);
}

/**
 * Sanitize an email (basic).
 */
export function sanitizeEmail(input: string): string {
  if (!input) return "";
  return input.trim().toLowerCase().slice(0, 254);
}
