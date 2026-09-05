"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { getErrorMessage, logError } from "@/lib/errors";
import { listInventory } from "@/lib/queries";
import { requirePermission } from "@/lib/session";
import {
  collectStartedChats,
  getTelegramBot,
  getTelegramConfig,
  notifyTelegram,
  saveTelegramConfig,
  sendTelegramMessage,
} from "@/lib/telegram";
import type { TelegramChat } from "@/types";
import { toNumber } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function saveTelegramSettingsAction(input: {
  enabled: boolean;
  botToken: string;
}): Promise<ActionResult<string>> {
  try {
    const session = await requirePermission("settings.write");
    const current = await getTelegramConfig(session.businessId);
    const botToken = input.botToken.trim() || current.botToken;
    if (input.enabled && !botToken) {
      return fail("Paste the Telegram bot token from BotFather first.");
    }
    if (botToken) {
      await getTelegramBot(botToken);
    }
    await saveTelegramConfig(session.businessId, {
      enabled: input.enabled,
      botToken,
      chats: current.chats,
    });
    revalidatePath("/settings");
    return ok("saved");
  } catch (error) {
    logError("telegram-save", error);
    return fail(getErrorMessage(error, "Telegram token was rejected. Check it in BotFather."));
  }
}

export async function linkTelegramChatsAction(): Promise<ActionResult<{ added: number; chats: TelegramChat[] }>> {
  try {
    const session = await requirePermission("settings.write");
    const current = await getTelegramConfig(session.businessId);
    if (!current.botToken) return fail("Save a Telegram bot token first.");
    const found = await collectStartedChats(current.botToken);
    if (found.length === 0) {
      return fail("No phones yet. Open the bot in Telegram, tap Start, then click Link phones again.");
    }
    const existing = new Map(current.chats.map((chat) => [chat.id, chat]));
    let added = 0;
    for (const chat of found) {
      if (!existing.has(chat.id)) added += 1;
      existing.set(chat.id, chat);
    }
    const chats = [...existing.values()];
    await saveTelegramConfig(session.businessId, { ...current, chats });
    revalidatePath("/settings");
    return ok({ added, chats });
  } catch (error) {
    logError("telegram-link", error);
    return fail(getErrorMessage(error, "Unable to find Telegram chats."));
  }
}

export async function removeTelegramChatAction(chatId: string): Promise<ActionResult<string>> {
  try {
    const session = await requirePermission("settings.write");
    const current = await getTelegramConfig(session.businessId);
    await saveTelegramConfig(session.businessId, {
      ...current,
      chats: current.chats.filter((chat) => chat.id !== chatId),
    });
    revalidatePath("/settings");
    return ok(chatId);
  } catch (error) {
    logError("telegram-remove", error);
    return fail(getErrorMessage(error, "Unable to remove that phone."));
  }
}

export async function sendTelegramTestAction(): Promise<ActionResult<string>> {
  try {
    const session = await requirePermission("settings.write");
    const current = await getTelegramConfig(session.businessId);
    if (!current.botToken) return fail("Save a Telegram bot token first.");
    if (current.chats.length === 0) return fail("Link at least one phone first.");
    const text = `AAML inventory is connected.\nCompany: ${session.business.business_name}\nYou will get low-stock and out-of-stock alerts here.`;
    await Promise.all(current.chats.map((chat) => sendTelegramMessage(current.botToken, chat.id, text)));
    return ok("sent");
  } catch (error) {
    logError("telegram-test", error);
    return fail(getErrorMessage(error, "Unable to send the test message."));
  }
}

export async function sendTelegramStatusAction(): Promise<ActionResult<string>> {
  try {
    const session = await requirePermission("settings.write");
    const inventory = await listInventory(session.businessId);
    const byProduct = new Map<string, { name: string; sku: string; available: number; min: number }>();
    for (const row of inventory) {
      if (!row.products) continue;
      const current = byProduct.get(row.product_id) ?? {
        name: row.products.name,
        sku: row.products.sku,
        available: 0,
        min: toNumber(row.products.minimum_stock_level),
      };
      current.available += toNumber(row.quantity_available);
      byProduct.set(row.product_id, current);
    }
    const rows = [...byProduct.values()];
    const out = rows.filter((row) => row.available <= 0);
    const low = rows.filter((row) => row.available > 0 && row.available <= row.min);
    const lines = [...out, ...low]
      .slice(0, 12)
      .map((row) => `• ${row.name} (${row.sku}): ${row.available} available, min ${row.min}`);
    const text = [
      `AAML stock status — ${session.business.business_name}`,
      `SKUs: ${rows.length}`,
      `Out of stock: ${out.length}`,
      `Low stock: ${low.length}`,
      lines.length ? `\nWatch list:\n${lines.join("\n")}` : "\nAll SKUs are at or above minimum.",
    ].join("\n");
    await notifyTelegram(session.businessId, text);
    const config = await getTelegramConfig(session.businessId);
    if (!config.enabled || config.chats.length === 0) {
      return fail("Enable Telegram and link a phone first.");
    }
    return ok("sent");
  } catch (error) {
    logError("telegram-status", error);
    return fail(getErrorMessage(error, "Unable to send stock status."));
  }
}
