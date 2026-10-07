"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { PICKUP_LOCATIONS } from "@/lib/orders/pickup";
import { cn } from "@/lib/utils";

// FR07/FR16 "Địa điểm hẹn": a well-known spot at the school, or any other place typed in.

const OTHER = "__other";
const isPreset = (v: string) => (PICKUP_LOCATIONS as readonly string[]).includes(v);

export const nativeSelectClass =
  "h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30";

/** Controlled: `value` is the final text (preset name or what was typed). */
export function PickupLocationPicker({
  id,
  value,
  onChange,
  invalid,
  compact = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  /** Admin forms: 36px controls instead of the public 44px. */
  compact?: boolean;
}) {
  const [other, setOther] = useState(() => value !== "" && !isPreset(value));
  const selected = isPreset(value) ? value : other ? OTHER : "";
  return (
    <div className="flex flex-col gap-2">
      <select
        id={id}
        value={selected}
        required
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          const v = e.target.value;
          setOther(v === OTHER);
          onChange(v === OTHER ? "" : v);
        }}
        className={cn(nativeSelectClass, compact && "h-9")}
      >
        <option value="" disabled>
          Chọn địa điểm…
        </option>
        {PICKUP_LOCATIONS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
        <option value={OTHER}>Địa điểm khác (tự nhập)</option>
      </select>
      {other && (
        <Input
          aria-label="Địa điểm khác"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={200}
          required
          aria-invalid={invalid || undefined}
          placeholder="Ví dụ: phòng học chung lớp, tên phòng…"
          className={compact ? "h-9" : undefined}
          autoFocus
        />
      )}
    </div>
  );
}

/** Uncontrolled version for FormData forms: posts the final text as `name`. */
export function PickupLocationField({ id, name, defaultValue = "" }: { id: string; name: string; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <>
      <PickupLocationPicker id={id} value={value} onChange={setValue} compact />
      <input type="hidden" name={name} value={value} />
    </>
  );
}
