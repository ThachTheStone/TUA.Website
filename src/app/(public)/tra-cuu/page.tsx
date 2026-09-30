import type { Metadata } from "next";
import { LookupForm } from "@/components/order/lookup-form";
import { PageHeader } from "@/components/public/page-header";

export const metadata: Metadata = { title: "Tra cứu đơn hàng" };

export default function LookupPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
      <PageHeader title="Tra cứu đơn hàng" description="Nhập mã đơn (ví dụ TUA0001) và số điện thoại bạn dùng khi đặt hàng." />
      <LookupForm />
    </div>
  );
}
