"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { sendOrderCreated, siteUrl } from "@/lib/email";
import { notifyOrder } from "@/lib/orders/notify";
import { createWorkshopOrder, saveScan, type WorkshopOrderInput } from "@/lib/orders/workshop";
import { getSettings } from "@/lib/settings";
import { requireRole } from "@/lib/supabase/auth";
import { isBankConfigured, vietQrUrl } from "@/lib/vietqr";
import type { ActionResult } from "@/types/action";

// FR16 server actions. Staff only (hard rule 8).

export async function uploadWorkshopScan(formData: FormData): Promise<ActionResult<{ path: string }>> {
  await requireRole();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Chưa chọn ảnh scan" };
  return saveScan(file);
}

export async function submitWorkshopOrder(input: WorkshopOrderInput): Promise<ActionResult<{ code: string }>> {
  const staff = await requireRole();
  const settings = await getSettings();
  if (input.method === "TRANSFER" && !isBankConfigured(settings.bank_sales)) {
    return { ok: false, error: "Chưa cấu hình tài khoản ngân hàng bán hàng trong Cài đặt" };
  }

  const result = await createWorkshopOrder(input, staff.userId);
  if (!result.ok) return result;
  const order = result.data;

  after(async () => {
    if (order.method === "CASH") {
      await notifyOrder(order.id, { kind: order.fullyPaid ? "FULLY_PAID" : "DEPOSIT_PAID" });
    } else if (order.email && order.expiresAt) {
      await sendOrderCreated({
        to: order.email,
        customerName: order.customerName,
        code: order.code,
        subtotal: order.subtotal,
        prepayAmount: order.prepay,
        expiresAt: order.expiresAt,
        qrUrl: vietQrUrl(settings.bank_sales, order.prepay, order.code),
        bank: settings.bank_sales,
        paymentUrl: siteUrl(`/thanh-toan/${order.code}?t=${order.accessToken}`),
      });
    }
  });

  revalidatePath("/admin/don-hang");
  revalidatePath("/admin");
  return { ok: true, data: { code: order.code } };
}
