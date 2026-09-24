import type { Metadata } from "next";
import { LookupForm } from "@/components/order/lookup-form";

export const metadata: Metadata = { title: "Tra cứu đơn hàng" };

export default function LookupPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Tra cứu đơn hàng</h1>
        <p className="text-muted-foreground">Nhập mã đơn (ví dụ TUA0001) và số điện thoại bạn dùng khi đặt hàng.</p>
      </div>
      <LookupForm />
    </div>
  );
}
