import "server-only";

import { getSetting } from "@/lib/db";
import { logError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { TelegramChat } from "@/types";

export type { TelegramChat };

export type TelegramConfig = {
  enabled: boolean;
  botToken: string;
  chats: TelegramChat[];
};

const SETTING_KEY = "telegram";

export async function getTelegramConfig(businessId: string): Promise<TelegramConfig> {
  const supabase = await createClient();
  const stored = await getSetting<{ enabled?: boolean; botToken?: string; chats?: TelegramChat[] }>(
    supabase,
    businessId,
    SETTING_KEY,
    {},
  );
  return {
    enabled: Boolean(stored.enabled),
    botToken: stored.botToken?.trim() || process.env.TELEGRAM_BOT_TOKEN?.trim() || "",
    chats: stored.chats ?? [],
  };
}

export async function saveTelegramConfig(businessId: string, config: TelegramConfig) {
  const supabase = await createClient();
  const { error } = await supabase.from("settings").upsert(
    {
      business_id: businessId,
      setting_key: SETTING_KEY,
      setting_value: {
        enabled: config.enabled,
        botToken: config.botToken,
        chats: config.chats,
      },
    },
    { onConflict: "business_id,setting_key" },
  );
  if (error) throw error;
}

async function telegramApi<T>(token: string, method: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json()) as { ok: boolean; description?: string; result?: T };
  if (!payload.ok) {
    throw new Error(payload.description || "Telegram request failed.");
  }
  return payload.result as T;
}

export async function getTelegramBot(token: string) {
  return telegramApi<{ id: number; username?: string; first_name?: string }>(token, "getMe");
}

export async function sendTelegramMessage(token: string, chatId: string, text: string) {
  await telegramApi(token, "sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

export async function collectStartedChats(token: string): Promise<TelegramChat[]> {
  const updates = await telegramApi<
    Array<{
      message?: {
        chat?: { id: number; type?: string; title?: string; first_name?: string; last_name?: string; username?: string };
        text?: string;
      };
    }>
  >(token, "getUpdates", { timeout: 0, allowed_updates: ["message"] });

  const chats = new Map<string, TelegramChat>();
  for (const update of updates) {
    const chat = update.message?.chat;
    if (!chat) continue;
    const name =
      chat.title ||
      [chat.first_name, chat.last_name].filter(Boolean).join(" ") ||
      (chat.username ? `@${chat.username}` : String(chat.id));
    chats.set(String(chat.id), { id: String(chat.id), name, type: chat.type ?? "private" });
  }
  return [...chats.values()];
}

export async function notifyTelegram(businessId: string, text: string) {
  try {
    const config = await getTelegramConfig(businessId);
    if (!config.enabled || !config.botToken || config.chats.length === 0) return;
    await Promise.all(
      config.chats.map((chat) => sendTelegramMessage(config.botToken, chat.id, text).catch((error) => logError("telegram-send", error))),
    );
  } catch (error) {
    logError("telegram", error);
  }
}
