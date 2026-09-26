"use server";

import { createDonation } from "@/lib/donations/service";
import type { DonationFormInput } from "@/lib/donations/schema";
import type { ActionResult } from "@/types/action";

// FR08: anyone can donate, no login needed (SRS §3). The server re-validates everything.

export async function createDonationAction(input: DonationFormInput): Promise<ActionResult<{ code: string; token: string }>> {
  try {
    return await createDonation(input);
  } catch (err) {
    console.error("[donations] create failed", err);
    return { ok: false, error: "Không tạo được khoản quyên góp. Vui lòng thử lại." };
  }
}
