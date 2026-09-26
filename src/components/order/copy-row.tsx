"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** One transfer detail (amount, content, account number) with a copy button (FR07, FR08). */
export function CopyRow({ label, value, display }: { label: string; value: string; display?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Không sao chép được, vui lòng chép tay");
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2 last:border-0">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-semibold tabular-nums">{display ?? value}</p>
      </div>
      <Button type="button" variant="outline" size="sm" className="h-10 shrink-0" onClick={copy} aria-label={`Sao chép ${label}`}>
        {copied ? <Check /> : <Copy />} {copied ? "Đã chép" : "Sao chép"}
      </Button>
    </div>
  );
}
