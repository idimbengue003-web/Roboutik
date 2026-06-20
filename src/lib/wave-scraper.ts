/**
 * Wave Business GraphQL Scraper
 *
 * Polls the Wave Business internal GraphQL endpoint to detect incoming
 * customer payments matching a specific amount + recent timeframe.
 *
 * Uses the HistoryEntries_BusinessWalletHistoryQuery query captured
 * from business.wave.com dashboard (DevTools → Network → graphql).
 *
 * Response structure:
 *   data.me.businessUser.business.walletHistory.historyEntries[]
 * Each entry has:
 *   - id, summary, whenEntered (timestamp), amount (signed), isPending, isCancelled
 *   - __typename: MerchantSaleEntry | TransferSentEntry | TransferReceivedReversalEntry | ...
 * Incoming customer payments are MerchantSaleEntry (positive amount).
 */

import {
  WAVE_BUSINESS_GRAPHQL_URL,
  WAVE_BUSINESS_WALLET_ID,
  getWaveAuthHeader,
  isWaveScraperConfigured,
} from "./wave-config";

export type WaveTransaction = {
  id: string;
  amount: number; // in FCFA (positive for incoming)
  currency: string; // "XOF"
  type: "INCOMING" | "OUTGOING";
  status: "PENDING" | "SUCCESS" | "FAILED";
  timestamp: string; // ISO
  // Useful context
  senderName?: string;
  senderPhone?: string;
  reference?: string;
  typename: string; // GraphQL __typename (MerchantSaleEntry, etc.)
};

/**
 * GraphQL query captured from business.wave.com dashboard.
 * Lists transactions in a date range for a specific wallet.
 */
const HISTORY_QUERY = `
query HistoryEntries_BusinessWalletHistoryQuery(
  $start: Date!
  $end: Date!
  $walletOpaqueId: String!
  $limit: Int
  $transactionId: String
  $customerMobileStr: String
  $searchTerm: String
  $surrogateEmployeeId: String
  $includePending: Boolean
  $transactionType: TransactionType
) {
  me {
    merchant {
      canRefund
      name
      id
    }
    businessUser {
      rolePermissions
      user {
        merchant {
          needsPinToRefund
          id
        }
        id
      }
      business {
        name
        showGrossAmount
        showSurrogateOptions
        walletHistory(
          start: $start
          end: $end
          walletOpaqueId: $walletOpaqueId
          limit: $limit
          transactionId: $transactionId
          customerMobileStr: $customerMobileStr
          surrogateEmployeeId: $surrogateEmployeeId
          searchTerm: $searchTerm
          includePending: $includePending
          transactionType: $transactionType
        ) {
          batches {
            __typename
            id
            totalCost
            whenCreated
            senderName
            senderMobile
          }
          historyEntries {
            __typename
            id
            summary
            whenEntered
            amount
            isPending
            isCancelled
            baseReceiptFields {
              formatType
              label
              value
            }
            ... on AgentTransactionEntry {
              agentTransactionId
              isDeposit
              agentName
              type
              atxCashierName: counterpartyNameOnly
              atxCashierMobile: customerMobile
            }
            ... on BillPaymentEntry {
              billName
              billAccount
              transferOpaqueId: transferId
            }
            ... on MerchantSaleEntry {
              isRefunded
              isCheckout
              clientReference
              transferId
              customerMobile: unmaskedSenderMobile
              customerName: senderName
              cashierName: merchantUName
              grossAmount
              feeAmount
              actionSource
              overrideBusinessName
              businessSurrogate {
                name
                employeeIdNumber
                id
              }
              customFields {
                label
                value
              }
            }
            ... on MerchantSubAccountFundingEntry {
              fundingTransferId
              baseReceiptFields {
                label
                value
              }
              summary
              subAccountFundingMerchantName: sendingMerchantName
              receivingMerchantName
              isReversal
            }
            ... on MerchantRefundEntry {
              transferId
              customerMobile: unmaskedSenderMobile
              customerName: senderName
              cashierName: merchantUName
              businessSurrogate {
                name
                employeeIdNumber
                id
              }
            }
            ... on PayoutTransferEntry {
              tcid
              maybeRecipientName: recipientName
              recipientMobile
              isReversal
              isReversed
              reversalSource
              grossAmount
            }
            ... on TransferReceivedReversalEntry {
              transferOpaqueId: transferId
              senderName
              senderMobile
            }
            ... on TransferSentEntry {
              isRefunded
              recipientName
              recipientMobile
              transferOpaqueId: transferId
            }
            ... on TransferSentReversalEntry {
              transferOpaqueId: transferId
              senderName
              senderMobile
            }
            ... on MerchantSweepSentEntry {
              sweepGrossVolume
              businessSurrogate {
                name
                employeeIdNumber
                id
              }
            }
            ... on MerchantSweepReceivedEntry {
              sweepGrossVolume
              businessSurrogate {
                name
                employeeIdNumber
                id
              }
              sendingMerchantName
            }
            ... on B2BPaymentEntry {
              transferId
              isReversed
              isReversal
              grossAmount
              businessSurrogate {
                name
                employeeIdNumber
                id
              }
            }
            ... on RemittanceTransferReceivedEntry {
              opaqueId
              isReversed
              externalReference
            }
            ... on RemittanceTransferReversalEntry {
              opaqueId
            }
            ... on UserLinkedAccountTransferB2WEntry {
              liaTransferId
            }
            ... on UserLinkedAccountTransferW2BEntry {
              liaTransferId
            }
            ... on UserLinkedAccountTransferB2WEntryReversal {
              liaTransferId
            }
            ... on UserLinkedAccountTransferW2BEntryReversal {
              liaTransferId
            }
            ... on BusinessLoanDisbursementEntry {
              userFacingTransactionId
            }
            ... on BusinessLoanRepaymentEntry {
              userFacingTransactionId
            }
          }
        }
        id
      }
      id
    }
    id
  }
}
`;

type HistoryEntry = {
  __typename: string;
  id: string;
  summary: string | null;
  whenEntered: string;
  amount: number;
  isPending: boolean;
  isCancelled: boolean;
  // MerchantSaleEntry fields
  customerMobile?: string;
  customerName?: string;
  clientReference?: string;
  transferId?: string;
  grossAmount?: number;
  feeAmount?: number;
  // Other entry types
  senderName?: string;
  senderMobile?: string;
  recipientName?: string;
  recipientMobile?: string;
};

type GraphQLResponse = {
  data?: {
    me?: {
      businessUser?: {
        business?: {
          walletHistory?: {
            historyEntries?: HistoryEntry[];
          };
        };
      };
    };
  };
  errors?: Array<{ message: string }>;
};

async function callWaveGraphQL<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  if (!isWaveScraperConfigured()) {
    throw new Error("Wave scraper not configured (missing token or wallet ID)");
  }

  const authHeader = getWaveAuthHeader();

  const res = await fetch(WAVE_BUSINESS_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "*/*",
      "Authorization": authHeader,
      "Origin": "https://business.wave.com",
      "Referer": "https://business.wave.com/",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Wave GraphQL ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = (await res.json()) as GraphQLResponse;
  if (json.errors?.length) {
    throw new Error(
      `Wave GraphQL errors: ${json.errors.map((e) => e.message).join("; ")}`
    );
  }
  return json as unknown as T;
}

function parseEntry(entry: HistoryEntry): WaveTransaction {
  const typename = entry.__typename;
  // Incoming types: MerchantSaleEntry (customer pays business), PayoutTransferEntry reversal, etc.
  // Outgoing types: TransferSentEntry, PayoutTransferEntry, MerchantRefundEntry
  const incomingTypes = [
    "MerchantSaleEntry",
    "TransferReceivedReversalEntry",
    "MerchantSweepReceivedEntry",
    "RemittanceTransferReceivedEntry",
    "UserLinkedAccountTransferW2BEntry",
  ];
  const type: "INCOMING" | "OUTGOING" = incomingTypes.includes(typename)
    ? "INCOMING"
    : "OUTGOING";

  // Status: if isPending → PENDING, if isCancelled → FAILED, else SUCCESS
  let status: WaveTransaction["status"] = "SUCCESS";
  if (entry.isPending) status = "PENDING";
  else if (entry.isCancelled) status = "FAILED";

  // Extract sender info (works for MerchantSaleEntry which has customerName/customerMobile)
  const senderName = entry.customerName ?? entry.senderName ?? undefined;
  const senderPhone = entry.customerMobile ?? entry.senderMobile ?? undefined;

  return {
    id: entry.id,
    amount: Math.abs(Number(entry.amount) || 0),
    currency: "XOF",
    type,
    status,
    timestamp: entry.whenEntered,
    senderName,
    senderPhone,
    reference: entry.clientReference ?? entry.transferId ?? undefined,
    typename,
  };
}

/**
 * Lists recent incoming Wave transactions (default: last 7 days, max 100).
 */
export async function listRecentIncomingTransactions(
  options: { days?: number; limit?: number } = {}
): Promise<WaveTransaction[]> {
  const { days = 7, limit = 100 } = options;

  // Build date range (YYYY-MM-DD)
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const formatDate = (d: Date) => d.toISOString().slice(0, 10);

  const resp = await callWaveGraphQL<GraphQLResponse>(HISTORY_QUERY, {
    start: formatDate(start),
    end: formatDate(end),
    walletOpaqueId: WAVE_BUSINESS_WALLET_ID,
    limit,
    transactionId: null,
    customerMobileStr: null,
    searchTerm: null,
    surrogateEmployeeId: null,
    includePending: true,
    transactionType: "ALL",
  });

  const entries =
    resp.data?.me?.businessUser?.business?.walletHistory?.historyEntries ?? [];
  return entries.map(parseEntry).filter((t) => t.type === "INCOMING");
}

/**
 * Finds an incoming Wave transaction matching the given amount within
 * the last N minutes. Returns the first match.
 *
 * @param amountFcfa - exact amount to match (in FCFA)
 * @param since      - only consider transactions after this Date
 */
export async function findWavePaymentByAmount(
  amountFcfa: number,
  since: Date
): Promise<WaveTransaction | null> {
  // Query last 2 days to be safe (in case of timezone issues)
  const txs = await listRecentIncomingTransactions({ days: 2, limit: 100 });
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

/**
 * Test the Wave GraphQL connection by listing the 5 most recent
 * incoming transactions. Useful for debugging.
 */
export async function testWaveConnection(): Promise<{
  ok: boolean;
  count: number;
  sample?: WaveTransaction;
  error?: string;
}> {
  try {
    const txs = await listRecentIncomingTransactions({ days: 7, limit: 5 });
    return {
      ok: true,
      count: txs.length,
      sample: txs[0],
    };
  } catch (e) {
    return {
      ok: false,
      count: 0,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
