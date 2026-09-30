import type { Metadata } from "next";
import { CheckoutForm } from "@/components/cart/checkout-form";
import { PageHeader } from "@/components/public/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loadCatalog } from "@/lib/catalog";
import { requireCustomer } from "@/lib/customers/session";
import { getSettings } from "@/lib/settings";
import { isBankConfigured } from "@/lib/vietqr";

export const metadata: Metadata = { title: "Đặt hàng" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  // FR26: ordering needs an account; the details are pre-filled from it.
  const { email, customer } = await requireCustomer("/thanh-toan");
  const [settings, catalog] = await Promise.all([getSettings(), loadCatalog()]);
  const contact = { customer_name: customer.full_name, phone: customer.phone ?? "", email };
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
      <PageHeader title="Đặt hàng" />
      {isBankConfigured(settings.bank_sales) ? (
        <CheckoutForm catalog={catalog} contact={contact} />
      ) : (
        <Alert>
          <AlertDescription>Hệ thống đang tạm ngưng nhận đơn. Vui lòng quay lại sau.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
