import { formatDate, formatVND } from "@/lib/format";
import type { TimelineEntry } from "@/lib/orders/admin-queries";
import { APPROVAL_LABEL, STATUS_LABEL } from "@/lib/orders/state-machine";

const METHOD = { TRANSFER: "chuyển khoản", CASH: "tiền mặt" } as const;

function describe(e: TimelineEntry): { title: string; detail: string | null } {
  switch (e.kind) {
    case "status":
      return { title: `Trạng thái: ${STATUS_LABEL[e.to]}`, detail: e.note };
    case "edit":
      return { title: "Chỉnh sửa đơn", detail: e.note };
    case "payment":
      return { title: `Nhận ${formatVND(e.amount)} (${METHOD[e.method]})`, detail: e.note };
    case "design":
      return { title: `Áo ${e.item}: ${APPROVAL_LABEL[e.to]}`, detail: e.reason };
  }
}

/** FR15/FR29 history: status changes, payments and design reviews, newest first. */
export function OrderTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (!entries.length) return <p className="text-sm text-muted-foreground">Chưa có lịch sử.</p>;
  return (
    <ol className="flex flex-col gap-3 border-l pl-4">
      {entries.map((e, i) => {
        const { title, detail } = describe(e);
        return (
          <li key={i} className="relative text-sm">
            <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-background bg-foreground/60" />
            <p className="font-medium">{title}</p>
            {detail && <p className="text-muted-foreground">{detail}</p>}
            <p className="text-xs text-muted-foreground">
              {formatDate(e.at)}
              {e.by ? ` · ${e.by}` : e.kind === "status" ? " · Khách/Hệ thống" : ""}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
