import { getDb, parentSettings, parents } from "@guardiansense/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// Verify identity if needed, but for webhooks we'll just parse the payload
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || !body.message || !body.message.text || !body.message.chat) {
      return NextResponse.json({ ok: true });
    }

    const { text, chat } = body.message;

    if (text.startsWith("/start ")) {
      const parentId = text.split(" ")[1]?.trim();

      if (!parentId) {
        await replyToTelegram(chat.id, "Invalid linking payload. Please use the link provided in the GuardianSense dashboard.");
        return NextResponse.json({ ok: true });
      }

      const db = getDb();
      
      const [parent] = await db
        .select({ id: parents.id })
        .from(parents)
        .where(eq(parents.id, parentId))
        .limit(1);

      if (!parent) {
        await replyToTelegram(chat.id, "Account not found. Ensure you copied the correct link from the dashboard.");
        return NextResponse.json({ ok: true });
      }

      await db
        .update(parentSettings)
        .set({ telegramChatId: chat.id.toString() })
        .where(eq(parentSettings.parentId, parent.id));

      await replyToTelegram(
        chat.id,
        "🚨 GuardianSense Alerts successfully linked!\n\nYou will now receive instant push alerts here when your children trigger danger zones, drop battery, or move unusually fast."
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram-webhook] Error:", err);
    return NextResponse.json({ ok: true }, { status: 200 }); // Always 200 to prevent telegram retries
  }
}

async function replyToTelegram(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  }).catch((e) => console.error("Failed to push to telegram", e));
}
