import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OrderFilters } from "@/lib/orders/admin-queries";
import { PAYMENT_LABEL, STATUS_LABEL } from "@/lib/orders/state-machine";

// FR13 filters as a plain GET form: the URL holds the filter, so it can be shared and
// works without JavaScript.

const selectClass = "h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs";

function Select({ name, label, value, options }: { name: string; label: string; value?: string; options: [string, string][] }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <select name={name} defaultValue={value ?? ""} className={selectClass}>
        <option value="">Tất cả</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

export function OrderFiltersForm({ filters }: { filters: OrderFilters }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
      <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs text-muted-foreground">
        Tìm kiếm
        <Input name="q" defaultValue={filters.q} placeholder="Mã đơn, tên khách, SĐT" className="h-9" />
      </label>
      <Select name="status" label="Trạng thái đơn" value={filters.status} options={Object.entries(STATUS_LABEL)} />
      <Select
        name="payment"
        label="Thanh toán"
        value={filters.payment}
        options={[...Object.entries(PAYMENT_LABEL), ["DEBT", "Còn nợ (đã giao)"]]}
      />
      <Select
        name="design"
        label="Thiết kế"
        value={filters.design}
        options={[
          ["PENDING", "Cần duyệt"],
          ["REJECTED", "Có thiết kế bị từ chối"],
        ]}
      />
      <Select name="source" label="Nguồn" value={filters.source} options={[["WEB", "Website"], ["WORKSHOP", "Workshop"]]} />
      <Select
        name="fulfillment"
        label="Nhận hàng"
        value={filters.fulfillment}
        options={[["PICKUP", "Nhận tại campus"], ["DELIVERY", "Giao hàng"]]}
      />
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Từ ngày
        <Input type="date" name="from" defaultValue={filters.from} className="h-9" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Đến ngày
        <Input type="date" name="to" defaultValue={filters.to} className="h-9" />
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="h-9">
          Lọc
        </Button>
        <Button asChild variant="ghost" size="sm" className="h-9">
          <Link href="/admin/don-hang">Xóa lọc</Link>
        </Button>
      </div>
    </form>
  );
}
