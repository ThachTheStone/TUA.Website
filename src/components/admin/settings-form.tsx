"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatVND } from "@/lib/format";
import type { BankAccount, PrintArea, Settings, ShirtColor } from "@/lib/settings";
import { Field, FormError, SubmitButton, useAdminForm, type FormAction } from "./form-kit";

// FR21: every value the shop reads from `settings` (hard rule 3), edited in one form.

/** Stable key from a Vietnamese label: "Xanh lá" → "xanh-la". */
function slugify(label: string, taken: string[]): string {
  const base =
    label
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "muc";
  let key = base;
  for (let i = 2; taken.includes(key); i++) key = `${base}-${i}`;
  return key;
}

/** Gives new colors / print areas a key if the label field was never blurred. */
function withKeys(s: Settings): Settings {
  const fill = <T extends { key: string; label: string }>(rows: T[]): T[] => {
    const taken = rows.map((r) => r.key).filter(Boolean);
    return rows.map((r) => {
      if (r.key || !r.label.trim()) return r;
      const key = slugify(r.label, taken);
      taken.push(key);
      return { ...r, key };
    });
  };
  return { ...s, colors: fill(s.colors), print_areas: fill(s.print_areas) };
}

const num = (e: React.ChangeEvent<HTMLInputElement>) => e.target.valueAsNumber;

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function MoneyInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={label} htmlFor={id} hint={Number.isFinite(value) ? formatVND(value) : undefined}>
      <Input
        id={id}
        type="number"
        min={0}
        step={1000}
        required
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(num(e))}
      />
    </Field>
  );
}

function BankFields({
  prefix,
  value,
  onChange,
}: {
  prefix: string;
  value: BankAccount;
  onChange: (v: BankAccount) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Ngân hàng" htmlFor={`${prefix}-bank`} hint="Mã BIN hoặc mã VietQR, ví dụ 970436 hoặc VCB">
        <Input
          id={`${prefix}-bank`}
          value={value.bankId}
          onChange={(e) => onChange({ ...value, bankId: e.target.value.trim() })}
        />
      </Field>
      <Field label="Số tài khoản" htmlFor={`${prefix}-no`}>
        <Input
          id={`${prefix}-no`}
          inputMode="numeric"
          value={value.accountNo}
          onChange={(e) => onChange({ ...value, accountNo: e.target.value.trim() })}
        />
      </Field>
      <Field label="Tên chủ tài khoản" htmlFor={`${prefix}-name`} hint="Viết hoa không dấu">
        <Input
          id={`${prefix}-name`}
          value={value.accountName}
          onChange={(e) => onChange({ ...value, accountName: e.target.value.toUpperCase() })}
        />
      </Field>
    </div>
  );
}

function RemoveButton({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  return (
    <Button type="button" variant="ghost" size="icon" onClick={onClick} disabled={disabled} aria-label={label}>
      <Trash2 />
    </Button>
  );
}

export function SettingsForm({ initial, action }: { initial: Settings; action: FormAction }) {
  const [s, setS] = useState<Settings>(initial);
  const { state, onSubmit, pending, formRef } = useAdminForm(action, "Đã lưu cài đặt");
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setS((prev) => ({ ...prev, [key]: value }));

  const setColor = (i: number, patch: Partial<ShirtColor>) =>
    set("colors", s.colors.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const setArea = (i: number, patch: Partial<PrintArea>) =>
    set("print_areas", s.print_areas.map((a, j) => (j === i ? { ...a, ...patch } : a)));

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-6">
      <input type="hidden" name="settings" value={JSON.stringify(withKeys(s))} />

      <Section title="Giá áo" hint="Giá được chốt vào đơn tại thời điểm đặt (BR09). Đổi giá không ảnh hưởng đơn cũ.">
        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyInput id="price-plain" label="Áo trơn" value={s.prices.PLAIN} onChange={(v) => set("prices", { ...s.prices, PLAIN: v })} />
          <MoneyInput id="price-custom" label="Áo custom" value={s.prices.CUSTOM} onChange={(v) => set("prices", { ...s.prices, CUSTOM: v })} />
        </div>
      </Section>

      <Section title="Màu áo" hint="Mã màu được tạo tự động và không đổi sau khi lưu, vì đơn hàng lưu theo mã này.">
        <div className="flex flex-col gap-3">
          {s.colors.map((color, i) => (
            <div key={i} className="flex flex-wrap items-end gap-3">
              <Field label="Tên màu" htmlFor={`color-${i}-label`}>
                <Input
                  id={`color-${i}-label`}
                  required
                  value={color.label}
                  onChange={(e) => setColor(i, { label: e.target.value })}
                  onBlur={() => {
                    if (!color.key && color.label.trim()) {
                      setColor(i, { key: slugify(color.label, s.colors.map((c) => c.key)) });
                    }
                  }}
                />
              </Field>
              <Field label="Màu" htmlFor={`color-${i}-hex`}>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Chọn màu"
                    value={/^#[0-9a-f]{6}$/i.test(color.hex) ? color.hex : "#000000"}
                    onChange={(e) => setColor(i, { hex: e.target.value.toUpperCase() })}
                    className="h-9 w-10 cursor-pointer rounded-md border bg-transparent p-1"
                  />
                  <Input
                    id={`color-${i}-hex`}
                    required
                    pattern="#[0-9A-Fa-f]{6}"
                    className="w-28"
                    value={color.hex}
                    onChange={(e) => setColor(i, { hex: e.target.value })}
                  />
                </div>
              </Field>
              <span className="pb-2 text-xs text-muted-foreground">Mã: {color.key || "(tự tạo)"}</span>
              <RemoveButton
                label="Xóa màu"
                disabled={s.colors.length <= 1}
                onClick={() => set("colors", s.colors.filter((_, j) => j !== i))}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => set("colors", [...s.colors, { key: "", label: "", hex: "#FFFFFF" }])}
          >
            <Plus /> Thêm màu
          </Button>
        </div>
      </Section>

      <Section title="Size">
        <div className="flex flex-wrap gap-3">
          {s.sizes.map((size, i) => (
            <div key={i} className="flex items-center gap-1">
              <Input
                aria-label={`Size ${i + 1}`}
                required
                className="w-20"
                value={size}
                onChange={(e) => set("sizes", s.sizes.map((v, j) => (j === i ? e.target.value.toUpperCase().trim() : v)))}
              />
              <RemoveButton
                label="Xóa size"
                disabled={s.sizes.length <= 1}
                onClick={() => set("sizes", s.sizes.filter((_, j) => j !== i))}
              />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="self-center" onClick={() => set("sizes", [...s.sizes, ""])}>
            <Plus /> Thêm size
          </Button>
        </div>
      </Section>

      <Section
        title="Vùng in"
        hint="Kích thước thật của vùng in (cm) và vị trí tâm vùng trên ảnh mockup (% chiều ngang, % chiều dọc)."
      >
        <div className="flex flex-col gap-4">
          {s.print_areas.map((area, i) => (
            <div key={i} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <Field label="Tên vùng" htmlFor={`area-${i}-label`} hint={`Mã: ${area.key || "(tự tạo)"}`}>
                  <Input
                    id={`area-${i}-label`}
                    required
                    value={area.label}
                    onChange={(e) => setArea(i, { label: e.target.value })}
                    onBlur={() => {
                      if (!area.key && area.label.trim()) {
                        setArea(i, { key: slugify(area.label, s.print_areas.map((a) => a.key)) });
                      }
                    }}
                  />
                </Field>
              </div>
              <Field label="Mặt áo" htmlFor={`area-${i}-side`}>
                <select
                  id={`area-${i}-side`}
                  value={area.side}
                  onChange={(e) => setArea(i, { side: e.target.value as PrintArea["side"] })}
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="front">Trước</option>
                  <option value="back">Sau</option>
                </select>
              </Field>
              <Field label="Rộng (cm)" htmlFor={`area-${i}-w`}>
                <Input id={`area-${i}-w`} type="number" min={1} step={0.5} required value={Number.isFinite(area.widthCm) ? area.widthCm : ""} onChange={(e) => setArea(i, { widthCm: num(e) })} />
              </Field>
              <Field label="Cao (cm)" htmlFor={`area-${i}-h`}>
                <Input id={`area-${i}-h`} type="number" min={1} step={0.5} required value={Number.isFinite(area.heightCm) ? area.heightCm : ""} onChange={(e) => setArea(i, { heightCm: num(e) })} />
              </Field>
              <div className="flex items-end justify-end">
                <RemoveButton
                  label="Xóa vùng in"
                  disabled={s.print_areas.length <= 1}
                  onClick={() => set("print_areas", s.print_areas.filter((_, j) => j !== i))}
                />
              </div>
              <Field label="Tâm ngang (%)" htmlFor={`area-${i}-x`}>
                <Input id={`area-${i}-x`} type="number" min={0} max={100} step={1} required value={Number.isFinite(area.xPct) ? Math.round(area.xPct * 100) : ""} onChange={(e) => setArea(i, { xPct: num(e) / 100 })} />
              </Field>
              <Field label="Tâm dọc (%)" htmlFor={`area-${i}-y`}>
                <Input id={`area-${i}-y`} type="number" min={0} max={100} step={1} required value={Number.isFinite(area.yPct) ? Math.round(area.yPct * 100) : ""} onChange={(e) => setArea(i, { yPct: num(e) / 100 })} />
              </Field>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() =>
              set("print_areas", [
                ...s.print_areas,
                { key: "", label: "", side: "front", widthCm: 10, heightCm: 10, xPct: 0.5, yPct: 0.5 },
              ])
            }
          >
            <Plus /> Thêm vùng in
          </Button>
        </div>
      </Section>

      <Section title="Đơn hàng">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Thời hạn tự hủy đơn (giờ)" htmlFor="expire-hours" hint="Đơn chưa thanh toán quá thời hạn sẽ chuyển sang Hết hạn (BR07)">
            <Input id="expire-hours" type="number" min={1} step={1} required value={Number.isFinite(s.order_expire_hours) ? s.order_expire_hours : ""} onChange={(e) => set("order_expire_hours", num(e))} />
          </Field>
          <Field label="Độ phân giải file in (DPI)" htmlFor="export-dpi" hint="Mặc định 200 DPI (NFR05)">
            <Input id="export-dpi" type="number" min={72} max={600} step={1} required value={Number.isFinite(s.export_dpi) ? s.export_dpi : ""} onChange={(e) => set("export_dpi", num(e))} />
          </Field>
        </div>
      </Section>

      <Section title="Tài khoản bán hàng" hint="Nhận tiền đặt áo, nội dung chuyển khoản dạng TUA0001.">
        <BankFields prefix="bank-sales" value={s.bank_sales} onChange={(v) => set("bank_sales", v)} />
      </Section>

      <Section title="Tài khoản quỹ" hint="Nhận tiền quyên góp, nội dung chuyển khoản dạng UH0001 (BR04).">
        <BankFields prefix="bank-fund" value={s.bank_fund} onChange={(v) => set("bank_fund", v)} />
      </Section>

      <Section title="Quyên góp">
        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyInput id="donation-min" label="Số tiền tối thiểu" value={s.donation_min} onChange={(v) => set("donation_min", v)} />
          <MoneyInput id="donation-goal" label="Mục tiêu quyên góp" value={s.donation_goal} onChange={(v) => set("donation_goal", v)} />
        </div>
      </Section>

      <div className="sticky bottom-0 flex flex-col gap-3 border-t bg-muted/80 py-4 backdrop-blur">
        <FormError state={state} />
        <SubmitButton pending={pending}>Lưu cài đặt</SubmitButton>
      </div>
    </form>
  );
}
