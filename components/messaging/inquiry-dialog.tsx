"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function InquiryDialog({
  open,
  onOpenChange,
  listingId,
  externalRef,
  buildingName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId?: string;
  externalRef?: string;
  buildingName: string;
}) {
  const [content, setContent] = useState(
    "Hello — I am an interested tenant. Could we discuss availability and the exact asking rent?"
  );
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId,
        externalRef,
        buildingName,
        content,
      }),
    });
    setSending(false);
    if (!response.ok) {
      toast.error("Could not send inquiry.");
      return;
    }
    toast.success("Inquiry sent as Interested Tenant.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send inquiry to owner</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Your identity shows as “Interested Tenant”. Emails never include your
          details.
        </p>
        <Textarea
          className="mt-3 min-h-32"
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
        <div className="mt-4 flex justify-end">
          <Button className="rounded-full" onClick={send} disabled={sending}>
            {sending ? "Sending…" : "Send via relay"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
