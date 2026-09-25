"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Field } from "@/components/admin/form-kit";
import { TYPE_LABEL, linePrice, type Catalog } from "@/components/cart/catalog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { prepareScanUpload, submitWorkshopOrder } from "@/lib/admin/workshop-actions";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { formatVND } from "@/lib/format";
import { PREPAY_PERCENTS, prepayAmount, subtotalOf } from "@/lib/orders/pricing";
import { newId } from "@/lib/design/types";

// FR16: staff enter a Workshop order. Each scan uploads straight to private storage through a
// one-time signed URL (too big for a server action), then the order is created and the server
// checks every scan's bytes. Totals shown here are estimates; the server recomputes them.
// Prototype lines need no scan: the prototype's print files are used (FR16).

type Line = {
  id: string;
  type: "PLAIN" | "CUSTOM" | "PROTOTYPE";
  color: string;
  size: string;
  quantity: number;
  area: string;
  scan: File | null;
  prototypeId: string;
};

const selectClass = "h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs";

export function WorkshopForm({ catalog }: { catalog: Catalog }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const newLine = (): Line => ({
    id: newId(),
    type: "CUSTOM",
    color: catalog.colors[0]?.key ?? "",
    size: catalog.sizes[0] ?? "",
    quantity: 1,
    area: catalog.printAreas[0]?.key ?? "",
    scan: null,
    prototypeId: "",
  });
  const prototypes = catalog.prototypes.filter((p) => p.active);
  const [lines, setLines] = useState<Line[]>(() => [newLine()]);
  const [fulfillment, setFulfillment] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [percent, setPercent] = useState<number>(100);
  const [method, setMethod] = useState<"CASH" | "TRANSFER">("CASH");

  const update = (id: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const subtotal = subtotalOf(lines, catalog.prices);
  const prepay = Math.min(subtotal, prepayAmount(subtotal, percent));

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "");
    setError(null);
    if (lines.some((l) => l.type === "CUSTOM" && !l.scan)) return setError("Mỗi áo custom cần ảnh scan bản vẽ");
    if (lines.some((l) => l.type === "PROTOTYPE" && !l.prototypeId)) return setError("Vui lòng chọn áo mẫu");

    startTransition(async () => {
      try {
        const items = [];
        const custom = lines.filter((l) => l.type === "CUSTOM").length;
        let done = 0;
        for (const l of lines) {
          let scanPath: string | undefined;
          if (l.type === "CUSTOM" && l.scan) {
            setProgress(`Đang tải ảnh scan ${++done}/${custom}…`);
            const slot = await prepareScanUpload({ contentType: l.scan.type, size: l.scan.size });
            if (!slot.ok) throw new Error(slot.error);
            const { error } = await createBrowserSupabase()
              .storage.from("scans")
              .uploadToSignedUrl(slot.data.path, slot.data.token, l.scan, { contentType: l.scan.type });
            if (error) throw new Error(`Không tải được ảnh scan "${l.scan.name}". Vui lòng thử lại.`);
            scanPath = slot.data.path;
          }
          items.push({
            type: l.type,
            color: l.color,
            size: l.size,
            quantity: l.quantity,
            area: l.type === "CUSTOM" ? l.area : undefined,
            scanPath,
            prototypeId: l.type === "PROTOTYPE" ? l.prototypeId : undefined,
          });
        }
        setProgress("Đang tạo đơn…");
        const result = await submitWorkshopOrder({
          customer_name: get("customer_name"),
          phone: get("phone"),
          email: get("email"),
          fulfillment,
          address: get("address"),
          preferred_time: get("preferred_time"),
          pickup_location: get("pickup_location"),
          note: get("note"),
          prepay_percent: percent,
          method,
          items,
        });
        if (!result.ok) throw new Error(result.error);
        toast.success(`Đã tạo đơn ${result.data.code}`);
        router.push(`/admin/don-hang/${result.data.code}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không tạo được đơn. Vui lòng thử lại.");
        setProgress(null);
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <fieldset disabled={pending} className="flex flex-col gap-6">
        <section className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-3">
          <h2 className="font-semibold sm:col-span-3">Khách hàng</h2>
          <Field label="Họ tên" htmlFor="customer_name">
            <Input id="customer_name" name="customer_name" required maxLength={100} />
          </Field>
          <Field label="Số điện thoại" htmlFor="phone">
            <Input id="phone" name="phone" type="tel" required />
          </Field>
          <Field label="Email (không bắt buộc)" htmlFor="email" hint="Để khách nhận email cập nhật đơn">
            <Input id="email" name="email" type="email" />
          </Field>
        </section>

        <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Áo</h2>
          {lines.map((l, n) => (
            <div key={l.id} className="flex flex-wrap items-end gap-3 border-b pb-3 last:border-0">
              <span className="self-center text-sm font-medium">#{n + 1}</span>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Loại
                <select className={selectClass} value={l.type} onChange={(e) => update(l.id, { type: e.target.value as Line["type"] })}>
                  {(["CUSTOM", "PROTOTYPE", "PLAIN"] as const)
                    .filter((t) => t !== "PROTOTYPE" || prototypes.length > 0)
                    .map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABEL[t]} ({formatVND(linePrice(t, catalog))})
                      </option>
                    ))}
                </select>
              </label>
              {l.type === "PROTOTYPE" ? (
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  Mẫu
                  <select className={selectClass} value={l.prototypeId} onChange={(e) => update(l.id, { prototypeId: e.target.value })}>
                    <option value="">Chọn áo mẫu…</option>
                    {prototypes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({catalog.colors.find((c) => c.key === p.color)?.label ?? p.color})
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  Màu
                  <select className={selectClass} value={l.color} onChange={(e) => update(l.id, { color: e.target.value })}>
                    {catalog.colors.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Size
                <select className={selectClass} value={l.size} onChange={(e) => update(l.id, { size: e.target.value })}>
                  {catalog.sizes.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                SL
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={l.quantity}
                  onChange={(e) => update(l.id, { quantity: Math.min(50, Math.max(1, Number(e.target.value) || 1)) })}
                  className="h-9 w-20"
                />
              </label>
              {l.type === "CUSTOM" && (
                <>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Vùng in
                    <select className={selectClass} value={l.area} onChange={(e) => update(l.id, { area: e.target.value })}>
                      {catalog.printAreas.map((a) => (
                        <option key={a.key} value={a.key}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Ảnh scan (JPG/PNG, tối đa 10MB)
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(e) => update(l.id, { scan: e.target.files?.[0] ?? null })}
                      className="text-sm file:mr-2 file:rounded-md file:border file:bg-muted file:px-2 file:py-1 file:text-sm"
                    />
                  </label>
                </>
              )}
              {lines.length > 1 && (
                <Button type="button" variant="ghost" size="icon" aria-label="Xóa dòng" onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))}>
                  <Trash2 />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setLines((ls) => [...ls, newLine()])} disabled={lines.length >= 20}>
            <Plus /> Thêm áo
          </Button>
        </section>

        <section className="flex flex-col gap-4 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Nhận hàng</h2>
          <div className="flex gap-4 text-sm">
            {(["PICKUP", "DELIVERY"] as const).map((f) => (
              <label key={f} className="flex items-center gap-2">
                <input type="radio" checked={fulfillment === f} onChange={() => setFulfillment(f)} className="size-4 accent-primary" />
                {f === "PICKUP" ? "Nhận tại campus" : "Giao hàng"}
              </label>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {fulfillment === "DELIVERY" ? (
              <Field label="Địa chỉ" htmlFor="address">
                <Input id="address" name="address" maxLength={300} required />
              </Field>
            ) : (
              <Field label="Địa điểm hẹn" htmlFor="pickup_location">
                <Input id="pickup_location" name="pickup_location" maxLength={200} required />
              </Field>
            )}
            <Field label="Thời gian hẹn/nhận" htmlFor="preferred_time">
              <Input id="preferred_time" name="preferred_time" maxLength={200} />
            </Field>
          </div>
          <Field label="Ghi chú" htmlFor="note">
            <Textarea id="note" name="note" rows={2} maxLength={500} />
          </Field>
        </section>
      </fieldset>

      <aside className="flex h-fit flex-col gap-4 rounded-xl border bg-card p-4 lg:sticky lg:top-6">
        <h2 className="font-semibold">Thanh toán</h2>
        <div className="flex gap-2">
          {PREPAY_PERCENTS.map((p) => (
            <Button key={p} type="button" size="sm" variant={percent === p ? "default" : "outline"} onClick={() => setPercent(p)} disabled={pending}>
              {p}%
            </Button>
          ))}
        </div>
        <div className="flex flex-col gap-2 text-sm">
          {(["CASH", "TRANSFER"] as const).map((m) => (
            <label key={m} className="flex items-start gap-2">
              <input type="radio" checked={method === m} onChange={() => setMethod(m)} className="mt-0.5 size-4 accent-primary" disabled={pending} />
              <span>
                {m === "CASH" ? "Tiền mặt tại chỗ" : "Chuyển khoản"}
                <span className="block text-xs text-muted-foreground">
                  {m === "CASH" ? "Đơn được tạo ở trạng thái Đã xác nhận" : "Khách quét QR trên trang thanh toán"}
                </span>
              </span>
            </label>
          ))}
        </div>
        <div className="flex flex-col gap-1 border-t pt-3 text-sm">
          <p className="flex justify-between">
            <span className="text-muted-foreground">Tổng đơn</span>
            <span className="font-semibold tabular-nums">{formatVND(subtotal)}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground">{method === "CASH" ? "Thu tiền mặt ngay" : "Cần chuyển khoản"}</span>
            <span className="text-lg font-bold tabular-nums">{formatVND(prepay)}</span>
          </p>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? (progress ?? "Đang xử lý…") : "Tạo đơn Workshop"}
        </Button>
      </aside>
    </form>
  );
}
