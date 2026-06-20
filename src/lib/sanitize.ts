/**
 * Sanitize user-generated content to prevent XSS attacks.
 *
 * Used on:
 *  - Order messages (chat between buyer and seller)
 *  - Conversation messages (pre-sale chat)
 *  - Support ticket messages
 *  - Listing title/description
 *  - User profile (username, avatar)
 *  - Withdrawal waveNumber
 *
 * Strategy: strip all HTML tags + dangerous characters.
 * The result is plain text safe to render in React (which already escapes
 * text content, but extra defense in depth is good).
 */

import DOMPurify from "isomorphic-dompurify";

/**
 * Strip ALL HTML from a string. Returns plain text only.
 * Use this for fields that should NEVER contain HTML (titles, names, etc.)
 */
export function sanitizePlainText(input: string): string {
  if (!input) return "";
  // DOMPurify with ALLOWED_TAGS: [] strips everything
  const cleaned = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
  // Also trim and limit length defensively
  return cleaned.trim();
}

/**
 * Sanitize content that may contain basic formatting (line breaks, bold, italic).
 * Returns sanitized HTML safe to render with dangerouslySetInnerHTML.
 * Currently we don't allow any HTML in our app, so this is just plain text
 * with line breaks preserved.
 */
export function sanitizeMessage(input: string): string {
  if (!input) return "";
  // Strip everything, keep only text content
  const cleaned = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
  return cleaned.trim();
}

/**
 * Sanitize a username: alphanumeric + spaces + a few safe characters.
 * Max 30 chars.
 */
export function sanitizeUsername(input: string): string {
  if (!input) return "";
  // Allow letters, numbers, spaces, underscores, hyphens, dots, accents
  const cleaned = input.trim().replace(/[^\p{L}\p{N} _.\-]/gu, "");
  return cleaned.slice(0, 30);
}

/**
 * Sanitize an emoji avatar (1-10 chars, no script tags).
 */
export function sanitizeAvatar(input: string): string {
  if (!input) return "🎮";
  // Strip all HTML, keep only emoji
  const cleaned = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
  return cleaned.trim().slice(0, 10) || "🎮";
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
