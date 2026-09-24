import type { Metadata } from "next";
import { toCatalog } from "@/components/cart/catalog";
import { CheckoutForm } from "@/components/cart/checkout-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getSettings } from "@/lib/settings";
import { isBankConfigured } from "@/lib/vietqr";

export const metadata: Metadata = { title: "Đặt hàng" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const settings = await getSettings();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Đặt hàng</h1>
      {isBankConfigured(settings.bank_sales) ? (
        <CheckoutForm catalog={toCatalog(settings)} />
      ) : (
        <Alert>
          <AlertDescription>Hệ thống đang tạm ngưng nhận đơn. Vui lòng quay lại sau.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
