import "server-only";
import { z } from "zod";
import { DONATION_CODE_RE } from "@/lib/donations/schema";
import { getSettings } from "@/lib/settings";
import { createServiceClient } from "@/lib/supabase/server";
import { donationContent, isBankConfigured, vietQrUrl } from "@/lib/vietqr";
import type { Donation, DonationStatus } from "@/types/db";

export const DONATION_STATUS_LABEL: Record<DonationStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  CANCELLED: "Đã hủy",
};

// ─── Public: the donation QR page (FR08) ───────────────────────────────────

export type DonationTransfer = {
  qrUrl: string;
  bankId: string;
  accountNo: string;
  accountName: string;
  amount: number;
  content: string;
};

export type DonationView = {
  code: string;
  amount: number;
  displayName: string;
  isPublic: boolean;
  /** "Không hiển thị": off the donor wall. */
  isHidden: boolean;
  status: DonationStatus;
  statusLabel: string;
  createdAt: string;
  /** Transfer details for the fund account (BR04), only while the donation is PENDING. */
  transfer: DonationTransfer | null;
};

/** The donation behind a QR-page link, or null when the code/token pair doesn't match. */
export async function getDonationByToken(code: string, token: string): Promise<DonationView | null> {
  if (!DONATION_CODE_RE.test(code) || !z.uuid().safeParse(token).success) return null;
  const [{ data }, settings] = await Promise.all([
    createServiceClient()
      .from("donations")
      .select("code, amount, display_name, is_public, is_hidden, status, created_at")
      .eq("code", code)
      .eq("access_token", token)
      .maybeSingle<Pick<Donation, "code" | "amount" | "display_name" | "is_public" | "is_hidden" | "status" | "created_at">>(),
    getSettings(),
  ]);
  if (!data) return null;

  const bank = settings.bank_fund;
  const content = donationContent(data.code);
  const transfer =
    data.status === "PENDING" && isBankConfigured(bank)
      ? {
          qrUrl: vietQrUrl(bank, data.amount, content),
          bankId: bank.bankId,
          accountNo: bank.accountNo,
          accountName: bank.accountName,
          amount: data.amount,
          content,
        }
      : null;

  return {
    code: data.code,
    amount: data.amount,
    displayName: data.display_name,
    isPublic: data.is_public,
    isHidden: data.is_hidden,
    status: data.status,
    statusLabel: DONATION_STATUS_LABEL[data.status],
    createdAt: data.created_at,
    transfer,
  };
}

// ─── Admin list (FR18) ─────────────────────────────────────────────────────

export const DONATION_PAGE_SIZE = 50;

export const donationFiltersSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional().catch(undefined),
  q: z.string().trim().max(100).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});

export type DonationFilters = z.infer<typeof donationFiltersSchema>;

export type AdminDonation = Pick<
  Donation,
  "id" | "code" | "display_name" | "contact" | "amount" | "message" | "is_public" | "is_hidden" | "status" | "created_at" | "confirmed_at"
> & { confirmer: { full_name: string } | null };

export async function listAdminDonations(filters: DonationFilters): Promise<{ rows: AdminDonation[]; total: number }> {
  const page = filters.page ?? 1;
  let query = createServiceClient()
    .from("donations")
    .select(
      "id, code, display_name, contact, amount, message, is_public, is_hidden, status, created_at, confirmed_at, confirmer:profiles!donations_confirmed_by_fkey(full_name)",
      { count: "exact" },
    );
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.q) {
    // Strip characters that have a meaning in PostgREST filter syntax.
    const q = filters.q.replace(/[,()%*\\]/g, " ").trim();
    if (q) query = query.or(`code.ilike.%${q}%,display_name.ilike.%${q}%,contact.ilike.%${q}%`);
  }
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * DONATION_PAGE_SIZE, page * DONATION_PAGE_SIZE - 1)
    .returns<AdminDonation[]>();
  if (error) throw new Error(`Không đọc được danh sách quyên góp: ${error.message}`);
  return { rows: data ?? [], total: count ?? 0 };
}

/** Counters for the list and dashboard: how many per status, and the confirmed total. */
export async function getDonationCounts(): Promise<{ byStatus: Record<DonationStatus, number>; confirmedTotal: number }> {
  const { data, error } = await createServiceClient()
    .from("donations")
    .select("status, amount")
    .returns<Pick<Donation, "status" | "amount">[]>();
  if (error) throw new Error(`Không đọc được số liệu quyên góp: ${error.message}`);
  const byStatus: Record<DonationStatus, number> = { PENDING: 0, CONFIRMED: 0, CANCELLED: 0 };
  let confirmedTotal = 0;
  for (const d of data ?? []) {
    byStatus[d.status] += 1;
    if (d.status === "CONFIRMED") confirmedTotal += d.amount;
  }
  return { byStatus, confirmedTotal };
}
