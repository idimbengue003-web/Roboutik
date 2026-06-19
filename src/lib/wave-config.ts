/**
 * Wave Business Configuration
 *
 * Two parts:
 *  1. CHECKOUT LINK (public, used by buyers to pay)
 *     - Replace WAVE_CHECKOUT_URL below with your Wave Business payment link
 *     - The link MUST accept an `amount` parameter in FCFA
 *       (e.g. https://pay.wave.com/m/M_xxx?amount=2500)
 *
 *  2. SCRAPER (server-side only, used to confirm payments < 10s)
 *     - Uses the Wave Business internal GraphQL endpoint
 *     - Authenticated via WAVE_SESSION cookie OR bearer token
 *     - Configure credentials in Vercel env vars (never in code)
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
// Configure these in Vercel Project Settings → Environment Variables
//
// WAVE_BUSINESS_GRAPHQL_URL  → endpoint interne GraphQL (généralement https://business.wave.com/graphql)
// WAVE_BUSINESS_SESSION      → cookie de session (ex: session=xxx) ou Bearer token
// WAVE_BUSINESS_ACCOUNT_ID   → ton account_id Wave Business (visible dans l'URL du dashboard)
//
// HOW TO GET THESE (instructions for you):
// 1. Connecte-toi à https://business.wave.com
// 2. Ouvre DevTools (F12) → onglet Network → filtre "graphql"
// 3. Effectue une action (ex: rafraîchir les transactions)
// 4. Clique sur la requête graphql → onglet Headers
//    → Copie l'URL (WAVE_BUSINESS_GRAPHQL_URL)
//    → Copie le cookie `session` (WAVE_BUSINESS_SESSION)
// 5. Dans l'URL du dashboard, récupère l'account_id (WAVE_BUSINESS_ACCOUNT_ID)

export const WAVE_BUSINESS_GRAPHQL_URL =
  process.env.WAVE_BUSINESS_GRAPHQL_URL || "https://business.wave.com/graphql";

export const WAVE_BUSINESS_SESSION = process.env.WAVE_BUSINESS_SESSION || "";
export const WAVE_BUSINESS_ACCOUNT_ID = process.env.WAVE_BUSINESS_ACCOUNT_ID || "";

/**
 * Whether the Wave scraper is configured.
 * If false, the system will fall back to manual confirmation.
 */
export function isWaveScraperConfigured(): boolean {
  return !!(WAVE_BUSINESS_SESSION && WAVE_BUSINESS_ACCOUNT_ID);
}
