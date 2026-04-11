import { getDb, parentSettings, parents } from "@guardiansense/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  console.log("[telegram-webhook] ← received POST");

  let body: unknown;
  try {
    body = await req.json();
  } catch (e) {
    console.error("[telegram-webhook] Failed to parse JSON body:", e);
    return NextResponse.json({ ok: true });
  }

  console.log("[telegram-webhook] raw body:", JSON.stringify(body));

  const b = body as Record<string, unknown>;

  if (!b?.message) {
    console.log("[telegram-webhook] no message field — ignoring (likely a channel post or edit)");
    return NextResponse.json({ ok: true });
  }

  const message = b.message as Record<string, unknown>;
  const chat = message.chat as Record<string, unknown> | undefined;
  const text = message.text as string | undefined;

  console.log("[telegram-webhook] message:", { chat_id: chat?.id, text });

  if (!text) {
    console.log("[telegram-webhook] no text — ignoring");
    return NextResponse.json({ ok: true });
  }

  if (!chat?.id) {
    console.log("[telegram-webhook] no chat.id — ignoring");
    return NextResponse.json({ ok: true });
  }

  const chatId = chat.id as number;

  // Handle both "/start" (no payload) and "/start <uuid>"
  if (text.startsWith("/start")) {
    const parts = text.trim().split(" ");
    const parentId = parts[1]?.trim() ?? null;

    console.log("[telegram-webhook] /start received — parentId from payload:", parentId);

    if (!parentId) {
      console.log("[telegram-webhook] no parentId in deep link — sending instructions");
      await replyToTelegram(chatId, "Please use the 'Link Telegram' button in your GuardianSense dashboard to connect your account.");
      return NextResponse.json({ ok: true });
    }

    let db;
    try {
      db = getDb();
      console.log("[telegram-webhook] db connected");
    } catch (e) {
      console.error("[telegram-webhook] db connection failed:", e);
      return NextResponse.json({ ok: true });
    }

    const [parent] = await db
      .select({ id: parents.id })
      .from(parents)
      .where(eq(parents.id, parentId))
      .limit(1);

    console.log("[telegram-webhook] parent lookup result:", parent ?? "NOT FOUND");

    if (!parent) {
      await replyToTelegram(chatId, "Account not found. Make sure you clicked the link directly from the dashboard.");
      return NextResponse.json({ ok: true });
    }

    const updateResult = await db
      .update(parentSettings)
      .set({ telegramChatId: chatId.toString() })
      .where(eq(parentSettings.parentId, parent.id))
      .returning({ parentId: parentSettings.parentId, telegramChatId: parentSettings.telegramChatId });

    console.log("[telegram-webhook] DB update result:", updateResult);

    if (updateResult.length === 0) {
      console.error("[telegram-webhook] DB update matched 0 rows — parent_settings row may be missing for parentId:", parent.id);
      await replyToTelegram(chatId, "Linking failed — settings record not found. Please contact support.");
      return NextResponse.json({ ok: true });
    }

    await replyToTelegram(
      chatId,
      "🚨 GuardianSense Alerts successfully linked!\n\nYou will now receive instant push alerts here when your children trigger danger zones, drop battery, or move unusually fast."
    );

    console.log("[telegram-webhook] ✓ linked chat", chatId, "to parent", parent.id);
    return NextResponse.json({ ok: true });
  }

  console.log("[telegram-webhook] unrecognised command:", text);
  return NextResponse.json({ ok: true });
}

async function replyToTelegram(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.error("[telegram-webhook] TELEGRAM_BOT_TOKEN is not set — cannot send reply");
    return;
  }

  console.log("[telegram-webhook] sending reply to chat", chatId);

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[telegram-webhook] Telegram sendMessage failed:", res.status, err);
  } else {
    console.log("[telegram-webhook] reply sent successfully to chat", chatId);
  }
}
