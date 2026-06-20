/**
 * Zod validation schemas for all critical API routes.
 *
 * Usage:
 *   import { createOrderSchema } from "@/lib/validation";
 *   const parsed = createOrderSchema.safeParse(body);
 *   if (!parsed.success) {
 *     return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
 *   }
 *   // parsed.data is typed
 */

import { z } from "zod";

// ============ AUTH / PROFILE ============

export const googleLoginSchema = z.object({
  email: z.string().email("Email invalide").max(254),
  name: z.string().trim().min(1, "Nom requis").max(80, "Nom trop long"),
  googleSub: z.string().max(100).optional(),
  avatar: z.string().max(10).optional(),
});

export const profileUpdateSchema = z.object({
  userId: z.string().min(1, "userId requis"),
  username: z
    .string()
    .trim()
    .min(2, "Pseudo entre 2 et 30 caractères")
    .max(30, "Pseudo entre 2 et 30 caractères")
    .optional(),
  avatar: z
    .string()
    .trim()
    .min(1, "Avatar invalide")
    .max(10, "Avatar invalide")
    .optional(),
});

export const accountDeleteSchema = z.object({
  userId: z.string().min(1, "userId requis"),
  confirmUsername: z.string().trim().min(1, "Confirme ton pseudo"),
});

// ============ ORDERS ============

export const createOrderSchema = z.object({
  listingId: z.string().min(1, "listingId requis"),
  buyerId: z.string().min(1, "buyerId requis"),
});

export const payOrderSchema = z.object({
  userId: z.string().min(1, "userId requis"),
  wavePhone: z
    .string()
    .max(20, "Numéro Wave trop long")
    .optional()
    .or(z.literal("")),
});

export const orderMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message vide")
    .max(2000, "Message trop long (max 2000 caractères)"),
});

export const rateOrderSchema = z.object({
  stars: z.number().int().min(1, "Note entre 1 et 5").max(5, "Note entre 1 et 5"),
  comment: z.string().trim().max(500, "Commentaire trop long").optional().or(z.literal("")),
  userId: z.string().min(1, "userId requis"),
});

export const reportSellerSchema = z.object({
  userId: z.string().min(1, "userId requis"),
  reason: z.string().trim().min(1, "Motif requis").max(200, "Motif trop long"),
  details: z.string().trim().max(500, "Détails trop long").optional().or(z.literal("")),
});

// ============ LISTINGS ============

export const createListingSchema = z.object({
  userId: z.string().min(1, "userId requis"),
  gameId: z.string().min(1, "Jeu requis"),
  title: z
    .string()
    .trim()
    .min(5, "Titre entre 5 et 80 caractères")
    .max(80, "Titre entre 5 et 80 caractères"),
  description: z
    .string()
    .trim()
    .min(10, "Description entre 10 et 500 caractères")
    .max(500, "Description entre 10 et 500 caractères"),
  sellerNetPrice: z
    .number()
    .int("Prix invalide")
    .min(100, "Prix minimum : 100 FCFA")
    .max(1_000_000, "Prix maximum : 1 000 000 FCFA"),
});

export const updateListingSchema = z.object({
  userId: z.string().min(1, "userId requis"),
  active: z.boolean().optional(),
});

// ============ WITHDRAWALS ============

export const createWithdrawalSchema = z.object({
  userId: z.string().min(1, "userId requis"),
  amount: z
    .number()
    .int("Montant invalide")
    .min(500, "Retrait minimum : 500 FCFA")
    .max(5_000_000, "Retrait maximum : 5 000 000 FCFA"),
  waveNumber: z
    .string()
    .trim()
    .min(1, "Numéro Wave requis")
    .max(20, "Numéro Wave trop long")
    .refine((v) => /^7\d{8}$/.test(v.replace(/\s+/g, "")), {
      message: "Numéro Wave invalide. Format attendu : 76 123 45 67",
    }),
});

// ============ SUPPORT ============

export const createTicketSchema = z.object({
  userId: z.string().min(1, "userId requis"),
  subject: z
    .string()
    .trim()
    .min(1, "Sujet requis")
    .max(200, "Sujet trop long"),
  message: z
    .string()
    .trim()
    .min(1, "Message requis")
    .max(2000, "Message trop long"),
  orderId: z.string().optional(),
});

export const ticketMessageSchema = z.object({
  userId: z.string().min(1, "userId requis"),
  content: z
    .string()
    .trim()
    .min(1, "Message vide")
    .max(2000, "Message trop long"),
});

export const adminReplySchema = z.object({
  adminId: z.string().min(1, "adminId requis"),
  content: z
    .string()
    .trim()
    .min(1, "Message vide")
    .max(2000, "Message trop long"),
  resolve: z.boolean().optional(),
});

// ============ CONVERSATIONS ============

export const createConversationSchema = z.object({
  userId: z.string().min(1, "userId requis"),
  listingId: z.string().min(1, "listingId requis"),
  firstMessage: z
    .string()
    .trim()
    .min(1, "Message requis")
    .max(1000, "Message trop long (max 1000 caractères)"),
});

export const conversationMessageSchema = z.object({
  userId: z.string().min(1, "userId requis"),
  content: z
    .string()
    .trim()
    .min(1, "Message vide")
    .max(1000, "Message trop long (max 1000 caractères)"),
});

// ============ ADMIN ============

export const banUserSchema = z.object({
  adminId: z.string().min(1, "adminId requis"),
  reason: z.string().trim().max(200, "Motif trop long").optional().or(z.literal("")),
});

export const adminActionSchema = z.object({
  adminId: z.string().min(1, "adminId requis"),
});

export const rejectWithdrawalSchema = z.object({
  adminId: z.string().min(1, "adminId requis"),
  reason: z.string().trim().max(200, "Raison trop long").optional().or(z.literal("")),
});

// ============ SELLER ============

export const becomeSellerSchema = z.object({
  userId: z.string().min(1, "userId requis"),
});

/**
 * Helper: parse a body with a Zod schema, return either the data or an error response.
 *
 * Usage:
 *   const [data, errorResponse] = parseBody(createOrderSchema, body);
 *   if (errorResponse) return errorResponse;
 *   // data is typed
 */
export function parseBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): [T | null, { status: number; body: Record<string, unknown> } | null] {
  const result = schema.safeParse(body);
  if (!result.success) {
    return [
      null,
      {
        status: 400,
        body: {
          error: result.error.issues[0]?.message ?? "Validation échouée",
          details: result.error.issues,
        },
      },
    ];
  }
  return [result.data, null];
}

/**
 * Helper: build a JSON error response from a parseBody error.
 */
export function errorResponse(error: {
  status: number;
  body: Record<string, unknown>;
}) {
  return Response.json(error.body, { status: error.status });
}
