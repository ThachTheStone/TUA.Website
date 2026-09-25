import type { Metadata } from "next";
import { toCatalog } from "@/components/cart/catalog";
import { CheckoutForm } from "@/components/cart/checkout-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requireCustomer } from "@/lib/customers/session";
import { listProtoSummaries } from "@/lib/prototypes/queries";
import { getSettings } from "@/lib/settings";
import { isBankConfigured } from "@/lib/vietqr";

export const metadata: Metadata = { title: "Đặt hàng" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  // FR26: ordering needs an account; the details are pre-filled from it.
  const { email, customer } = await requireCustomer("/thanh-toan");
  const [settings, prototypes] = await Promise.all([getSettings(), listProtoSummaries()]);
  const contact = { customer_name: customer.full_name, phone: customer.phone ?? "", email };
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Đặt hàng</h1>
      {isBankConfigured(settings.bank_sales) ? (
        <CheckoutForm catalog={toCatalog(settings, prototypes)} contact={contact} />
      ) : (
        <Alert>
          <AlertDescription>Hệ thống đang tạm ngưng nhận đơn. Vui lòng quay lại sau.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
