/**
 * Wave Business Configuration
 *
 * Two parts:
 *  1. CHECKOUT LINK (public, used by buyers to pay)
 *     - Replace WAVE_CHECKOUT_BASE_URL below with your Wave Business payment link
 *     - The link MUST accept an `amount` parameter in FCFA
 *       (e.g. https://pay.wave.com/m/M_xxx?amount=2500)
 *
 *  2. SCRAPER (server-side only, used to confirm payments < 10s)
 *     - Uses the Wave Business internal GraphQL endpoint
 *     - Authenticated via Basic auth (username empty, password = token)
 *     - Configure credentials in Vercel env vars (never in code)
 *
 * Values confirmed from user's cURL capture (June 2026):
 *   - GraphQL endpoint: https://sn.mmapp.wave.com/a/business_graphql
 *   - Wallet ID: W_sn_LUvGY4hJVmNP (from business.wave.com dashboard)
 *   - Auth: Basic base64(":US_tok_sn_xxx") where xxx is the token
 */

// ----- 1. PUBLIC CHECKOUT LINK -----
// TODO: remplace par ton vrai lien Wave Business.
// Le format attendu accepte ?amount=MONTANT en FCFA.
// Exemple : https://pay.wave.com/m/M_abc123?amount=2500
export const WAVE_CHECKOUT_BASE_URL =
  process.env.WAVE_CHECKOUT_BASE_URL ||
  "https://pay.wave.com/m/M_REPLACE_WITH_YOUR_BUSINESS_ID";

/**
 * Builds the Wave checkout URL for a given amount in FCFA.
 * The buyer is redirected here when they click "Payer avec Wave".
 */
export function buildWaveCheckoutUrl(amountFcfa: number): string {
  const url = new URL(WAVE_CHECKOUT_BASE_URL);
  url.searchParams.set("amount", String(amountFcfa));
  // Wave uses XOF (FCFA) currency by default in Senegal
  if (!url.searchParams.has("currency")) {
    url.searchParams.set("currency", "XOF");
  }
  return url.toString();
}

// ----- 2. SCRAPER (server-side only) -----
// GraphQL endpoint confirmed via DevTools on business.wave.com
export const WAVE_BUSINESS_GRAPHQL_URL =
  process.env.WAVE_BUSINESS_GRAPHQL_URL ||
  "https://sn.mmapp.wave.com/a/business_graphql";

// Token format: US_tok_sn_xxx (Basic auth password, username is empty)
export const WAVE_BUSINESS_TOKEN = process.env.WAVE_BUSINESS_TOKEN || "";

// Wallet opaque ID, format: W_sn_xxx
export const WAVE_BUSINESS_WALLET_ID =
  process.env.WAVE_BUSINESS_WALLET_ID || "W_sn_LUvGY4hJVmNP";

/**
 * Whether the Wave scraper is configured.
 * If false, the system will fall back to manual confirmation.
 */
export function isWaveScraperConfigured(): boolean {
  return !!(WAVE_BUSINESS_TOKEN && WAVE_BUSINESS_WALLET_ID);
}

/**
 * Build the Basic auth header value.
 * Format: "Basic base64(':<token>')" — username empty, password = token.
 */
export function getWaveAuthHeader(): string {
  if (!WAVE_BUSINESS_TOKEN) return "";
  // Basic auth = base64("username:password"), here username is empty
  const credentials = `:${WAVE_BUSINESS_TOKEN}`;
  const base64 = Buffer.from(credentials).toString("base64");
  return `Basic ${base64}`;
}
