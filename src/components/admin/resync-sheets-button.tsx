"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resyncSheets } from "@/lib/admin/donation-actions";

/** FR23 "Đồng bộ lại toàn bộ": rewrites the Orders, OrderItems and Donations tabs now. */
export function ResyncSheetsButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await resyncSheets();
          if (!result.ok) toast.error(result.error);
          else {
            const { orders, items, donations } = result.data;
            toast.success(`Đã đồng bộ ${orders} đơn, ${items} áo, ${donations} khoản quyên góp`);
          }
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      {pending ? "Đang đồng bộ…" : "Đồng bộ lại toàn bộ"}
    </Button>
  );
}
