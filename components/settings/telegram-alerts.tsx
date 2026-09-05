"use client";

import {
  linkTelegramChatsAction,
  removeTelegramChatAction,
  saveTelegramSettingsAction,
  sendTelegramStatusAction,
  sendTelegramTestAction,
} from "@/app/actions/telegram";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TelegramChat } from "@/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function TelegramAlertsCard({
  canWrite,
  enabled,
  hasToken,
  botUsername,
  chats,
}: {
  canWrite: boolean;
  enabled: boolean;
  hasToken: boolean;
  botUsername: string | null;
  chats: TelegramChat[];
}) {
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [botToken, setBotToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phone alerts (Telegram)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>
            In Telegram, open <strong>@BotFather</strong> and send <code>/newbot</code>.
          </li>
          <li>Copy the bot token it gives you and paste it below. Save.</li>
          <li>Open your new bot and tap <strong>Start</strong>.</li>
          <li>Come back here and click <strong>Link phones</strong>.</li>
        </ol>

        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            const result = await saveTelegramSettingsAction({ enabled: isEnabled, botToken });
            setSaving(false);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            setBotToken("");
            toast.success("Telegram settings saved");
            router.refresh();
          }}
        >
          <fieldset disabled={!canWrite} className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isEnabled} onChange={(event) => setIsEnabled(event.target.checked)} />
              Send stock alerts to Telegram
            </label>
            <div>
              <Label>Bot token</Label>
              <Input
                type="password"
                autoComplete="off"
                placeholder={hasToken ? "Token saved — paste a new one only to replace it" : "123456:ABC-token-from-BotFather"}
                value={botToken}
                onChange={(event) => setBotToken(event.target.value)}
              />
            </div>
            {botUsername ? (
              <p className="text-sm">
                Bot:{" "}
                <a className="text-brand-600 hover:underline" href={`https://t.me/${botUsername}`} target="_blank" rel="noreferrer">
                  @{botUsername}
                </a>
                . Open that link on the phone, tap Start, then link phones.
              </p>
            ) : null}
            {canWrite ? <Button loading={saving}>Save Telegram</Button> : null}
          </fieldset>
        </form>

        <div>
          <p className="mb-2 text-sm font-medium">Linked phones</p>
          {chats.length === 0 ? (
            <p className="text-sm text-slate-500">None yet. Start the bot on Telegram, then link phones.</p>
          ) : (
            <ul className="space-y-2">
              {chats.map((chat) => (
                <li key={chat.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    {chat.name} <span className="text-slate-400">({chat.type})</span>
                  </span>
                  {canWrite ? (
                    <button
                      type="button"
                      className="text-rose-600 hover:underline"
                      onClick={async () => {
                        const result = await removeTelegramChatAction(chat.id);
                        if (!result.ok) toast.error(result.error);
                        else {
                          toast.success("Removed");
                          router.refresh();
                        }
                      }}
                    >
                      Remove
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        {canWrite ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              loading={linking}
              onClick={async () => {
                setLinking(true);
                const result = await linkTelegramChatsAction();
                setLinking(false);
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success(result.data.added ? `Linked ${result.data.added} phone(s)` : "Phones already linked");
                router.refresh();
              }}
            >
              Link phones
            </Button>
            <Button
              variant="secondary"
              loading={testing}
              onClick={async () => {
                setTesting(true);
                const result = await sendTelegramTestAction();
                setTesting(false);
                if (!result.ok) toast.error(result.error);
                else toast.success("Test sent to Telegram");
              }}
            >
              Send test
            </Button>
            <Button
              variant="secondary"
              loading={status}
              onClick={async () => {
                setStatus(true);
                const result = await sendTelegramStatusAction();
                setStatus(false);
                if (!result.ok) toast.error(result.error);
                else toast.success("Stock status sent");
              }}
            >
              Send stock status now
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
