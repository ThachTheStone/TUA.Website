"use server";

import { z } from "zod";
import { getCustomer } from "@/lib/customers/session";
import { saveDesignAsset, signedAssetUrls, type AssetInfo } from "@/lib/design/assets.server";
import type { ActionResult } from "@/types/action";

// BR01: the only upload a buyer can make — the canvas "Chèn ảnh" tool, signed in.

export async function uploadDesignAsset(formData: FormData): Promise<ActionResult<AssetInfo>> {
  const session = await getCustomer();
  if (!session) return { ok: false, error: "Vui lòng đăng nhập để chèn ảnh" };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Chưa chọn ảnh" };
  try {
    return await saveDesignAsset(session.userId, file);
  } catch (err) {
    console.error("[assets] upload", err);
    return { ok: false, error: "Không tải được ảnh lên. Vui lòng thử lại." };
  }
}

const idsSchema = z.array(z.uuid()).max(50);

/** Fresh signed URLs for the buyer's own assets; unknown or foreign ids are left out. */
export async function getAssetUrls(ids: string[]): Promise<Record<string, string>> {
  const session = await getCustomer();
  const parsed = idsSchema.safeParse(ids);
  if (!session || !parsed.success) return {};
  return signedAssetUrls(parsed.data, session.userId);
}
