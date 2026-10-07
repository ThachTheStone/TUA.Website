"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Field } from "@/components/admin/form-kit";
import { TYPE_LABEL, cartProblems, findPrototype, linePrice, type Catalog, type LineProblem } from "@/components/cart/catalog";
import { PickupLocationField } from "@/components/order/pickup-location";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { checkWorkshopPromo, prepareScanUpload, submitWorkshopOrder } from "@/lib/admin/workshop-actions";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { colorLabel, formatVND } from "@/lib/format";
import { maxOrderable } from "@/lib/inventory";
import { addDays, leadDaysFor, todayInVietnam } from "@/lib/orders/checkout-schema";
import { computeDiscount, promoSummary, type PromoRule } from "@/lib/orders/discounts";
import { CUSTOM_KINDS, CUSTOM_KIND_LABEL, PICKUP_NOTE_LABEL, PICKUP_NOTE_PLACEHOLDER } from "@/lib/orders/pickup";
import { PREPAY_CUSTOM, PREPAY_PERCENTS, customPrepayIssue, minConfirmAmount, prepayFor } from "@/lib/orders/pricing";
import { newId } from "@/lib/design/types";
import type { CustomKind } from "@/types/db";

// FR16: staff enter a Workshop order. Each uploaded image goes straight to private storage through
// a one-time signed URL (too big for a server action), then the order is created and the server
// checks every file's bytes. Totals shown here are estimates; the server recomputes them.
// Prototype lines need no file: the prototype's print files are used (FR16). Custom shirts pick
// a kind: upload now, a Drive link (now or later), or the buyer designs it later.
// Transfer orders continue to the buyer's QR page, like a website order.

type Line = {
  id: string;
  type: "PLAIN" | "CUSTOM" | "PROTOTYPE" | "BLINDBOX";
  color: string;
  size: string;
  quantity: number;
  area: string;
  scan: File | null;
  prototypeId: string;
  /** CUSTOM only. */
  kind: CustomKind;
  link: string;
};

const selectClass = "h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs";

/** "(còn 3)" / "(hết)" after an option; nothing when not tracked. */
const leftLabel = (left: number | null) => (left === null ? "" : left > 0 ? ` (còn ${left})` : " (hết)");

function problemText(problem: LineProblem, line: Line, catalog: Catalog): string {
  switch (problem.kind) {
    case "shirt":
      return problem.left > 0
        ? `Size ${line.size} chỉ còn ${problem.left} áo (tính cả các dòng cùng màu, size)`
        : `Size ${line.size} đã hết hàng`;
    case "proto":
      return problem.left > 0 ? `Mẫu này chỉ còn ${problem.left} áo (tính cả các dòng cùng mẫu)` : "Mẫu này đã hết hàng";
    case "box": {
      const left = catalog.blindbox?.remaining ?? 0;
      return left > 0 ? `Blindbox chỉ còn ${left} hộp` : "Blindbox đã hết hàng";
    }
    case "gone":
      return "Màu hoặc size này không còn bán";
  }
}

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
    kind: "UPLOAD",
    link: "",
  });
  const prototypes = catalog.prototypes.filter((p) => p.active);
  const [lines, setLines] = useState<Line[]>(() => [newLine()]);
  const [fulfillment, setFulfillment] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [percent, setPercent] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState("");
  const [method, setMethod] = useState<"CASH" | "TRANSFER">("CASH");
  const [codeInput, setCodeInput] = useState("");
  const [promo, setPromo] = useState<PromoRule | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const boxOnSale = !!catalog.blindbox?.active;

  const update = (id: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const discount = computeDiscount(lines, catalog.prices, catalog.combos, promo);
  const subtotal = discount.total;

  async function applyCode() {
    setCodeError(null);
    const result = await checkWorkshopPromo(codeInput);
    if (result.ok) setPromo(result.data);
    else {
      setPromo(null);
      setCodeError(result.error);
    }
  }

  function removeCode() {
    setPromo(null);
    setCodeInput("");
  }
  const prepay = prepayFor(subtotal, percent, Number(customAmount) || 0);
  const leadDays = leadDaysFor(lines);
  const minDate = addDays(todayInVietnam(), leadDays);

  // Stock left, checked like the cart (lines of the same colour × size add up). The server re-checks.
  const problems = cartProblems(
    lines
      .filter((l) => l.type !== "PROTOTYPE" || l.prototypeId)
      .map((l) => ({ id: l.id, type: l.type, color: l.color, size: l.size, quantity: l.quantity, prototypeId: l.prototypeId || undefined })),
    catalog,
  );

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "");
    setError(null);
    if (lines.some((l) => l.type === "CUSTOM" && l.kind === "UPLOAD" && !l.scan)) return setError("Áo custom dạng upload cần chọn file ảnh");
    if (lines.some((l) => l.type === "PROTOTYPE" && !l.prototypeId)) return setError("Vui lòng chọn áo mẫu");
    if (problems.size) return setError("Một số áo không còn đủ hàng. Vui lòng sửa các dòng được đánh dấu.");
    if (percent === PREPAY_CUSTOM) {
      const problem = customPrepayIssue(Number(customAmount), subtotal);
      if (problem) return setError(problem);
    }

    startTransition(async () => {
      try {
        const items = [];
        const custom = lines.filter((l) => l.type === "CUSTOM" && l.kind === "UPLOAD").length;
        let done = 0;
        for (const l of lines) {
          let scanPath: string | undefined;
          if (l.type === "CUSTOM" && l.kind === "UPLOAD" && l.scan) {
            setProgress(`Đang tải file ảnh ${++done}/${custom}…`);
            const slot = await prepareScanUpload({ contentType: l.scan.type, size: l.scan.size });
            if (!slot.ok) throw new Error(slot.error);
            const { error } = await createBrowserSupabase()
              .storage.from("scans")
              .uploadToSignedUrl(slot.data.path, slot.data.token, l.scan, { contentType: l.scan.type });
            if (error) throw new Error(`Không tải được file ảnh "${l.scan.name}". Vui lòng thử lại.`);
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
            customKind: l.type === "CUSTOM" ? l.kind : undefined,
            designLink: l.type === "CUSTOM" && l.kind !== "UPLOAD" ? l.link.trim() : undefined,
          });
        }
        setProgress("Đang tạo đơn…");
        const result = await submitWorkshopOrder({
          customer_name: get("customer_name"),
          phone: get("phone"),
          email: get("email"),
          fulfillment,
          address: get("address"),
          receive_date: get("receive_date"),
          receive_time: get("receive_time"),
          pickup_location: get("pickup_location"),
          note: get("note"),
          prepay_percent: percent,
          prepay_custom: percent === PREPAY_CUSTOM ? Number(customAmount) : undefined,
          method,
          promoCode: promo?.code,
          items,
        });
        if (!result.ok) throw new Error(result.error);
        toast.success(`Đã tạo đơn ${result.data.code}`);
        // Chuyển khoản: open the QR page for the buyer to scan, like a website order.
        router.push(result.data.paymentPath ?? `/admin/don-hang/${result.data.code}`);
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
          {lines.map((l, n) => {
            const proto = l.type === "PROTOTYPE" ? findPrototype(catalog, l.prototypeId || undefined) : undefined;
            const shirtColor = proto?.color ?? l.color;
            const problem = problems.get(l.id);
            return (
              <div key={l.id} className="flex flex-wrap items-end gap-3 border-b pb-3 last:border-0">
                <span className="self-center text-sm font-medium">#{n + 1}</span>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  Loại
                  <select className={selectClass} value={l.type} onChange={(e) => update(l.id, { type: e.target.value as Line["type"] })}>
                    {(["CUSTOM", "PROTOTYPE", "PLAIN", "BLINDBOX"] as const)
                      .filter((t) => (t !== "PROTOTYPE" || prototypes.length > 0) && (t !== "BLINDBOX" || boxOnSale))
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
                        <option key={p.id} value={p.id} disabled={p.left !== null && p.left <= 0}>
                          {p.name} ({colorLabel(catalog.colors, p.color)}){leftLabel(p.left)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : l.type === "BLINDBOX" ? (
                  <span className="self-center text-xs text-muted-foreground">Còn {catalog.blindbox?.remaining ?? 0} hộp</span>
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
                {l.type !== "BLINDBOX" && (
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Size
                    <select className={selectClass} value={l.size} onChange={(e) => update(l.id, { size: e.target.value })}>
                      {catalog.sizes.map((s) => {
                        const left = maxOrderable(catalog.shirtStock, shirtColor, s, proto?.left ?? null);
                        return (
                          <option key={s} value={s} disabled={left !== null && left <= 0 && s !== l.size}>
                            {s}
                            {leftLabel(left)}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                )}
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
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Dạng áo custom
                    <select className={selectClass} value={l.kind} onChange={(e) => update(l.id, { kind: e.target.value as CustomKind })}>
                      {CUSTOM_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {CUSTOM_KIND_LABEL[k]}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {l.type === "CUSTOM" && (
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Vùng in
                    <select className={selectClass} value={l.area} onChange={(e) => update(l.id, { area: e.target.value })} required>
                      {catalog.printAreas.map((a) => (
                        <option key={a.key} value={a.key}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {l.type === "CUSTOM" && l.kind === "UPLOAD" && (
                  <>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      File ảnh (JPG/PNG, tối đa 10MB)
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={(e) => update(l.id, { scan: e.target.files?.[0] ?? null })}
                        className="text-sm file:mr-2 file:rounded-md file:border file:bg-muted file:px-2 file:py-1 file:text-sm"
                      />
                    </label>
                  </>
                )}
                {l.type === "CUSTOM" && l.kind === "LINK" && (
                  <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs text-muted-foreground">
                    Link Drive thiết kế (có thể thêm sau)
                    <Input
                      type="url"
                      value={l.link}
                      onChange={(e) => update(l.id, { link: e.target.value })}
                      maxLength={500}
                      placeholder="https://drive.google.com/…"
                      className="h-9"
                    />
                  </label>
                )}
                {l.type === "CUSTOM" && l.kind !== "UPLOAD" && !l.link.trim() && (
                  <p className="w-full text-xs text-muted-foreground">
                    Chưa có thiết kế: áo ở trạng thái Chờ duyệt. Thêm link thiết kế trong trang chi tiết đơn rồi duyệt trước khi in.
                  </p>
                )}
                {lines.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" aria-label="Xóa dòng" onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))}>
                    <Trash2 />
                  </Button>
                )}
                {problem && <p className="w-full text-sm text-destructive">{problemText(problem, l, catalog)}</p>}
              </div>
            );
          })}
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setLines((ls) => [...ls, newLine()])} disabled={lines.length >= 20}>
            <Plus /> Thêm dòng
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
                <PickupLocationField id="pickup_location" name="pickup_location" />
              </Field>
            )}
            <Field
              label={fulfillment === "PICKUP" ? "Thời gian hẹn nhận" : "Thời gian nhận hàng"}
              htmlFor="receive_date"
              hint={leadDays > 0 ? `Đơn có áo custom: chọn ngày từ ${minDate.split("-").reverse().join("/")} (ít nhất ${leadDays} ngày).` : undefined}
            >
              <div className="grid grid-cols-[1fr_7.5rem] gap-2">
                <Input id="receive_date" name="receive_date" type="date" min={minDate} required aria-label="Ngày nhận hàng" />
                <Input id="receive_time" name="receive_time" type="time" step={300} required aria-label="Giờ nhận hàng" />
              </div>
            </Field>
          </div>
          <Field
            label={fulfillment === "PICKUP" ? `${PICKUP_NOTE_LABEL} (không bắt buộc)` : "Ghi chú"}
            htmlFor="note"
          >
            <Textarea id="note" name="note" rows={2} maxLength={500} placeholder={fulfillment === "PICKUP" ? PICKUP_NOTE_PLACEHOLDER : undefined} />
          </Field>
        </section>
      </fieldset>

      <aside className="flex h-fit flex-col gap-4 rounded-xl border bg-card p-4 lg:sticky lg:top-6">
        <h2 className="font-semibold">Thanh toán</h2>
        <div className="flex flex-wrap gap-2">
          {PREPAY_PERCENTS.map((p) => (
            <Button key={p} type="button" size="sm" variant={percent === p ? "default" : "outline"} onClick={() => setPercent(p)} disabled={pending}>
              {p}%
            </Button>
          ))}
          <Button type="button" size="sm" variant={percent === PREPAY_CUSTOM ? "default" : "outline"} onClick={() => setPercent(PREPAY_CUSTOM)} disabled={pending}>
            Khác
          </Button>
        </div>
        {percent === PREPAY_CUSTOM && (
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Số tiền khách trả trước (đ), từ {formatVND(minConfirmAmount(subtotal))} (50%)
            <Input
              type="number"
              inputMode="numeric"
              min={minConfirmAmount(subtotal)}
              max={subtotal}
              step={1}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="h-9"
              disabled={pending}
            />
          </label>
        )}
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
        <div className="flex flex-col gap-2 border-t pt-3 text-sm">
          <span className="font-medium">Mã giảm giá</span>
          {promo ? (
            <div className="flex items-center justify-between gap-2">
              <span>
                <span className="font-semibold">{promo.code}</span>
                <span className="block text-xs text-muted-foreground">{promoSummary(promo)}</span>
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={removeCode} disabled={pending}>
                Bỏ mã
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} maxLength={30} className="h-9" aria-label="Mã giảm giá" />
              <Button type="button" size="sm" variant="outline" onClick={() => void applyCode()} disabled={pending || !codeInput.trim()}>
                Áp dụng
              </Button>
            </div>
          )}
          {(codeError ?? discount.promoProblem) && <p className="text-xs text-destructive">{codeError ?? discount.promoProblem}</p>}
        </div>
        <div className="flex flex-col gap-1 border-t pt-3 text-sm">
          {discount.discount > 0 && (
            <>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Tiền hàng</span>
                <span className="tabular-nums">{formatVND(discount.itemsTotal)}</span>
              </p>
              <p className="flex justify-between gap-2 text-emerald-700 dark:text-emerald-400">
                <span>{discount.note}</span>
                <span className="tabular-nums">−{formatVND(discount.discount)}</span>
              </p>
            </>
          )}
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
        <Button type="submit" disabled={pending || problems.size > 0}>
          {pending ? (progress ?? "Đang xử lý…") : "Tạo đơn Workshop"}
        </Button>
      </aside>
    </form>
  );
}
