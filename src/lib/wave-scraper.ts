/**
 * Wave Business GraphQL Scraper
 *
 * Polls the Wave Business internal GraphQL endpoint to detect incoming
 * payments matching a specific amount + recent timeframe.
 *
 * Usage:
 *   const hit = await findWavePaymentByAmount(2500, new Date());
 *   if (hit) { /* payment confirmed *\/ }
 *
 * TODO (YOU): Adjust the GraphQL query/resp parsing based on what
 * https://business.wave.com actually returns. The structure below is
 * a reasonable template based on common Wave Business API shapes.
 */

import { WAVE_BUSINESS_GRAPHQL_URL, WAVE_BUSINESS_SESSION, WAVE_BUSINESS_ACCOUNT_ID } from "./wave-config";

export type WaveTransaction = {
  id: string;
  amount: number; // in FCFA
  currency: string; // "XOF"
  type: "INCOMING" | "OUTGOING";
  status: "PENDING" | "SUCCESS" | "FAILED";
  timestamp: string; // ISO
  // Useful context
  senderName?: string;
  senderPhone?: string;
  reference?: string;
};

/**
 * GraphQL query to list recent incoming transactions on the Wave Business account.
 *
 * TODO (YOU): This is a TEMPLATE — replace with the real query you see in
 * DevTools when you load the Wave Business transactions page.
 */
const LIST_TXS_QUERY = `
  query ListTransactions($accountId: ID!, $limit: Int!) {
    account(id: $accountId) {
      transactions(limit: $limit, types: ["P2P_TRANSFER", "PAYMENT"]) {
        edges {
          node {
            id
            amount
            currency
            direction
            status
            timestamp
            counterparty {
              name
              mobile
            }
            reference
          }
        }
      }
    }
  }
`;

type GraphQLResponse = {
  data?: {
    account?: {
      transactions?: {
        edges: Array<{
          node: {
            id: string;
            amount: number;
            currency: string;
            direction: string;
            status: string;
            timestamp: string;
            counterparty?: { name?: string; mobile?: string };
            reference?: string;
          };
        }>;
      };
    };
  };
  errors?: Array<{ message: string }>;
};

async function callWaveGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  if (!WAVE_BUSINESS_SESSION) {
    throw new Error("WAVE_BUSINESS_SESSION not configured");
  }
  if (!WAVE_BUSINESS_ACCOUNT_ID) {
    throw new Error("WAVE_BUSINESS_ACCOUNT_ID not configured");
  }

  // Build auth header — Wave Business dashboard uses a session cookie.
  // The cookie format is usually: `session=<token>` or just `<token>`.
  // Adjust below based on what you see in DevTools.
  const authHeader = WAVE_BUSINESS_SESSION.startsWith("Bearer ")
    ? WAVE_BUSINESS_SESSION
    : `Bearer ${WAVE_BUSINESS_SESSION}`;
  const cookieHeader = WAVE_BUSINESS_SESSION.startsWith("session=")
    ? WAVE_BUSINESS_SESSION
    : `session=${WAVE_BUSINESS_SESSION}`;

  const res = await fetch(WAVE_BUSINESS_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authHeader,
      "Cookie": cookieHeader,
      // Wave Business dashboard typically sends these:
      "Origin": "https://business.wave.com",
      "Referer": "https://business.wave.com/",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Wave GraphQL ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as GraphQLResponse;
  if (json.errors?.length) {
    throw new Error(`Wave GraphQL errors: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  return json as unknown as T;
}

function parseTransaction(node: {
  id: string;
  amount: number;
  currency: string;
  direction: string;
  status: string;
  timestamp: string;
  counterparty?: { name?: string; mobile?: string };
  reference?: string;
}): WaveTransaction {
  const direction = String(node.direction).toUpperCase();
  const status = String(node.status).toUpperCase();
  return {
    id: node.id,
    amount: Number(node.amount) || 0,
    currency: String(node.currency || "XOF"),
    type: direction === "IN" || direction === "CREDIT" ? "INCOMING" : "OUTGOING",
    status: status === "SUCCEEDED" || status === "SUCCESS" ? "SUCCESS" : status === "PENDING" ? "PENDING" : "FAILED",
    timestamp: node.timestamp,
    senderName: node.counterparty?.name,
    senderPhone: node.counterparty?.mobile,
    reference: node.reference,
  };
}

/**
 * Lists recent incoming Wave transactions (last N minutes).
 */
export async function listRecentIncomingTransactions(limit = 20): Promise<WaveTransaction[]> {
  const resp = await callWaveGraphQL<GraphQLResponse>(LIST_TXS_QUERY, {
    accountId: WAVE_BUSINESS_ACCOUNT_ID,
    limit,
  });
  const edges = resp.data?.account?.transactions?.edges ?? [];
  return edges.map((e) => parseTransaction(e.node)).filter((t) => t.type === "INCOMING");
}

/**
 * Finds an incoming Wave transaction matching the given amount within
 * the last `withinMs` milliseconds. Returns the first match.
 *
 * @param amountFcfa - exact amount to match (in FCFA)
 * @param since      - only consider transactions after this Date
 */
export async function findWavePaymentByAmount(
  amountFcfa: number,
  since: Date
): Promise<WaveTransaction | null> {
  const txs = await listRecentIncomingTransactions(50);
  const sinceMs = since.getTime();
  for (const tx of txs) {
    if (tx.amount !== amountFcfa) continue;
    if (tx.status !== "SUCCESS") continue;
    const txMs = new Date(tx.timestamp).getTime();
    if (txMs < sinceMs) continue;
    return tx;
  }
  return null;
}
