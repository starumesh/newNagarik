"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string | null;
  building_name: string | null;
  created_at: string;
  read_at: string | null;
};

export function InboxClient({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);

  async function load() {
    const response = await fetch("/api/messages");
    const json = await response.json();
    setMessages(json.messages ?? []);
  }

  useEffect(() => {
    void load();
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase
      .channel("inbox")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          void load();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const grouped = useMemo(() => {
    const map = new Map<string, Message[]>();
    for (const message of messages) {
      const key = message.building_name ?? "Thread";
      map.set(key, [...(map.get(key) ?? []), message]);
    }
    return Array.from(map.entries());
  }, [messages]);

  const unread = messages.filter(
    (message) => message.receiver_id === userId && !message.read_at
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl text-navy">Relay inbox</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Identities stay masked. A red dot means a live inquiry arrived.
        </p>
      </div>
      {unread > 0 ? (
        <p className="flex items-center gap-2 text-sm text-red-700">
          <span className="size-2 rounded-full bg-red-500" />
          {unread} unread inquir{unread === 1 ? "y" : "ies"}
        </p>
      ) : null}
      {grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground">No threads yet.</p>
      ) : (
        grouped.map(([title, thread]) => (
          <section key={title} className="ledger-card p-5">
            <h2 className="font-serif text-2xl text-navy">{title}</h2>
            <div className="mt-4 space-y-3">
              {thread.map((message) => {
                const mine = message.sender_id === userId;
                return (
                  <article
                    key={message.id}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                      mine ? "ml-auto bg-accent" : "bg-secondary"
                    )}
                  >
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {mine ? "You" : "Interested Tenant"}
                    </p>
                    <p className="mt-1">{message.content}</p>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
