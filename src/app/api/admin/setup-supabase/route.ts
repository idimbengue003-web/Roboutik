import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/admin/setup-supabase
 *
 * Creates ALL tables in the Supabase database using raw SQL.
 * Public endpoint (no auth) — one-shot, call after deploying with fresh DB.
 */
export async function GET() {
  const results: string[] = [];

  try {
    await db.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "roboutik";`);
    results.push("Schema created");
  } catch (e) {
    results.push(`Schema: ${e instanceof Error ? e.message.slice(0, 80) : "?"}`);
  }

  const statements = [
    `CREATE TABLE IF NOT EXISTS "public"."User" ("id" TEXT NOT NULL DEFAULT '', "email" TEXT NOT NULL, "username" TEXT NOT NULL, "avatar" TEXT, "googleSub" TEXT, "isSeller" BOOLEAN NOT NULL DEFAULT false, "isAdmin" BOOLEAN NOT NULL DEFAULT false, "isVerified" BOOLEAN NOT NULL DEFAULT false, "isBanned" BOOLEAN NOT NULL DEFAULT false, "bannedAt" TIMESTAMP(3), "banReason" TEXT, "balance" INTEGER NOT NULL DEFAULT 0, "lastActiveAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP, "twoFactorCode" TEXT, "twoFactorCodeExpiresAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "User_pkey" PRIMARY KEY ("id"))`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "public"."User"("email")`,
    `CREATE TABLE IF NOT EXISTS "public"."Game" ("id" TEXT NOT NULL DEFAULT '', "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "image" TEXT NOT NULL, "description" TEXT NOT NULL, "isFavorite" BOOLEAN NOT NULL DEFAULT false, "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Game_pkey" PRIMARY KEY ("id"))`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Game_slug_key" ON "public"."Game"("slug")`,
    `CREATE TABLE IF NOT EXISTS "public"."Listing" ("id" TEXT NOT NULL DEFAULT '', "sellerId" TEXT NOT NULL, "gameId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "price" INTEGER NOT NULL, "sellerNetPrice" INTEGER NOT NULL, "images" TEXT, "stock" INTEGER NOT NULL DEFAULT 1, "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Listing_pkey" PRIMARY KEY ("id"))`,
    `CREATE TABLE IF NOT EXISTS "public"."Order" ("id" TEXT NOT NULL DEFAULT '', "listingId" TEXT NOT NULL, "buyerId" TEXT NOT NULL, "sellerId" TEXT NOT NULL, "amount" INTEGER NOT NULL, "sellerNetAmount" INTEGER NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT', "paidAt" TIMESTAMP(3), "deliveredAt" TIMESTAMP(3), "autoValidateAt" TIMESTAMP(3), "validatedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Order_pkey" PRIMARY KEY ("id"))`,
    `CREATE TABLE IF NOT EXISTS "public"."Message" ("id" TEXT NOT NULL DEFAULT '', "orderId" TEXT NOT NULL, "senderId" TEXT NOT NULL, "content" TEXT NOT NULL, "isAuto" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Message_pkey" PRIMARY KEY ("id"))`,
    `CREATE TABLE IF NOT EXISTS "public"."Rating" ("id" TEXT NOT NULL DEFAULT '', "orderId" TEXT NOT NULL, "listingId" TEXT NOT NULL, "fromUserId" TEXT NOT NULL, "toUserId" TEXT NOT NULL, "stars" INTEGER NOT NULL, "comment" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Rating_pkey" PRIMARY KEY ("id"))`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Rating_orderId_key" ON "public"."Rating"("orderId")`,
    `CREATE TABLE IF NOT EXISTS "public"."Withdrawal" ("id" TEXT NOT NULL DEFAULT '', "sellerId" TEXT NOT NULL, "amount" INTEGER NOT NULL, "waveNumber" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id"))`,
    `CREATE TABLE IF NOT EXISTS "public"."SupportTicket" ("id" TEXT NOT NULL DEFAULT '', "openerId" TEXT NOT NULL, "subject" TEXT NOT NULL, "category" TEXT NOT NULL DEFAULT 'OTHER', "status" TEXT NOT NULL DEFAULT 'OPEN', "priority" TEXT NOT NULL DEFAULT 'NORMAL', "orderId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id"))`,
    `CREATE TABLE IF NOT EXISTS "public"."TicketMessage" ("id" TEXT NOT NULL DEFAULT '', "ticketId" TEXT NOT NULL, "senderId" TEXT, "senderRole" TEXT NOT NULL DEFAULT 'USER', "content" TEXT NOT NULL, "isAuto" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id"))`,
    `CREATE TABLE IF NOT EXISTS "public"."AuditLog" ("id" TEXT NOT NULL DEFAULT '', "actorId" TEXT, "targetId" TEXT, "action" TEXT NOT NULL, "metadata" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"))`,
    `CREATE TABLE IF NOT EXISTS "public"."Conversation" ("id" TEXT NOT NULL DEFAULT '', "listingId" TEXT NOT NULL, "buyerId" TEXT NOT NULL, "sellerId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id"))`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Conversation_listingId_buyerId_key" ON "public"."Conversation"("listingId", "buyerId")`,
    `CREATE TABLE IF NOT EXISTS "public"."ConversationMessage" ("id" TEXT NOT NULL DEFAULT '', "conversationId" TEXT NOT NULL, "senderId" TEXT NOT NULL, "content" TEXT NOT NULL, "isAuto" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id"))`,
    `CREATE TABLE IF NOT EXISTS "public"."NotificationLog" ("id" TEXT NOT NULL DEFAULT '', "channel" TEXT NOT NULL, "type" TEXT NOT NULL, "recipientUserId" TEXT NOT NULL, "recipientEmail" TEXT, "recipientPhone" TEXT, "subject" TEXT, "body" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "errorMessage" TEXT, "refType" TEXT, "refId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id"))`,
    `CREATE TABLE IF NOT EXISTS "public"."ErrorLog" ("id" TEXT NOT NULL DEFAULT '', "message" TEXT NOT NULL, "stack" TEXT, "severity" TEXT NOT NULL DEFAULT 'medium', "userId" TEXT, "path" TEXT, "method" TEXT, "userAgent" TEXT, "metadata" TEXT, "resolved" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id"))`,
    `CREATE TABLE IF NOT EXISTS "public"."SiteConfig" ("id" TEXT NOT NULL DEFAULT 'default', "primaryColor" TEXT NOT NULL DEFAULT 'c026d3', "accentColor" TEXT NOT NULL DEFAULT 'f97316', "bgColor" TEXT NOT NULL DEFAULT 'ffffff', "siteName" TEXT NOT NULL DEFAULT 'RobloxBoutik', "heroTitle" TEXT NOT NULL, "heroSubtitle" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id"))`,
  ];

  for (const sql of statements) {
    try {
      await db.$executeRawUnsafe(sql);
    } catch (e) {
      results.push(`Err: ${e instanceof Error ? e.message.slice(0, 80) : "?"}`);
    }
  }
  results.push(`${statements.length} SQL done`);

  return NextResponse.json({ ok: true, results });
}
