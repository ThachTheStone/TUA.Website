"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { removeContentImage } from "@/lib/storage";
import {
  OK,
  cleanupImage,
  fail,
  optionalText,
  optionalUrl,
  readForm,
  requiredText,
  resolveImage,
  sortOrder,
} from "@/lib/admin/form";
import type { ActionResult } from "@/types/action";

// FR19: sponsor management (Admin only). Logos go to the public `content` bucket.

const sponsorSchema = z.object({
  name: requiredText(200, "Tên nhà tài trợ"),
  website_url: optionalUrl,
  tier: optionalText(50, "Hạng"),
  sort_order: sortOrder,
  is_active: z.boolean(),
});

function readSponsor(formData: FormData) {
  return sponsorSchema.safeParse(
    readForm(formData, ["name", "website_url", "tier", "sort_order"], ["is_active"]),
  );
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/vinh-danh");
  revalidatePath("/admin/nha-tai-tro");
}

export async function createSponsor(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  const parsed = readSponsor(formData);
  if (!parsed.success) return fail(parsed.error);

  const image = await resolveImage(formData, "sponsors", null);
  if (!image.ok) return image;

  const { error } = await createServiceClient()
    .from("sponsors")
    .insert({ ...parsed.data, logo_url: image.url });
  await cleanupImage(null, image, !error);
  if (error) return fail("Không thêm được nhà tài trợ. Vui lòng thử lại");

  refresh();
  return OK;
}

export async function updateSponsor(
  id: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  const parsed = readSponsor(formData);
  if (!parsed.success) return fail(parsed.error);

  const supabase = createServiceClient();
  const { data: current } = await supabase.from("sponsors").select("logo_url").eq("id", id).maybeSingle();
  if (!current) return fail("Nhà tài trợ không tồn tại");

  const image = await resolveImage(formData, "sponsors", current.logo_url);
  if (!image.ok) return image;

  const { error } = await supabase
    .from("sponsors")
    .update({ ...parsed.data, logo_url: image.url })
    .eq("id", id);
  await cleanupImage(current.logo_url, image, !error);
  if (error) return fail("Không lưu được nhà tài trợ. Vui lòng thử lại");

  refresh();
  return OK;
}

export async function deleteSponsor(id: string): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  const { data, error } = await createServiceClient()
    .from("sponsors")
    .delete()
    .eq("id", id)
    .select("logo_url")
    .maybeSingle();
  if (error) return fail("Không xóa được nhà tài trợ. Vui lòng thử lại");
  await removeContentImage(data?.logo_url);

  refresh();
  return OK;
}
