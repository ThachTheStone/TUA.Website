"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { CONTENT_BLOCKS } from "@/lib/content";
import { vnLocalToISO } from "@/lib/format";
import { removeContentImage } from "@/lib/storage";
import {
  OK,
  cleanupImage,
  fail,
  optionalText,
  readForm,
  requiredText,
  resolveImage,
  sortOrder,
} from "@/lib/admin/form";
import type { ActionResult } from "@/types/action";

// FR17: content management (Admin only, SRS §3).

function refresh(adminPath: string) {
  revalidatePath("/");
  revalidatePath(adminPath);
}

// ─── Content blocks (story, event) ─────────────────────────────────────────

const blockSchema = z.object({
  title: optionalText(200, "Tiêu đề"),
  body: optionalText(10000, "Nội dung"),
});

export async function updateContentBlock(
  key: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  if (!CONTENT_BLOCKS.some((b) => b.key === key)) return fail("Mục nội dung không tồn tại");

  const parsed = blockSchema.safeParse(readForm(formData, ["title", "body"]));
  if (!parsed.success) return fail(parsed.error);

  const supabase = createServiceClient();
  const { data: current } = await supabase
    .from("content_blocks")
    .select("image_url")
    .eq("key", key)
    .maybeSingle();
  const previous = current?.image_url ?? null;

  const image = await resolveImage(formData, "story", previous);
  if (!image.ok) return image;

  const { error } = await supabase
    .from("content_blocks")
    .upsert({ key, ...parsed.data, image_url: image.url });
  await cleanupImage(previous, image, !error);
  if (error) return fail("Không lưu được nội dung. Vui lòng thử lại");

  refresh("/admin/noi-dung");
  return OK;
}

// ─── Artworks (Top 5) ──────────────────────────────────────────────────────

const artworkSchema = z.object({
  child_name: optionalText(100, "Tên bé"),
  description: optionalText(1000, "Mô tả"),
  sort_order: sortOrder,
});

function readArtwork(formData: FormData) {
  return artworkSchema.safeParse(readForm(formData, ["child_name", "description", "sort_order"]));
}

export async function createArtwork(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  const parsed = readArtwork(formData);
  if (!parsed.success) return fail(parsed.error);

  const image = await resolveImage(formData, "artworks", null);
  if (!image.ok) return image;
  if (!image.url) return fail("Vui lòng chọn ảnh tranh");

  const { error } = await createServiceClient()
    .from("artworks")
    .insert({ ...parsed.data, image_url: image.url });
  await cleanupImage(null, image, !error);
  if (error) return fail("Không thêm được tranh. Vui lòng thử lại");

  refresh("/admin/noi-dung/top-5");
  return OK;
}

export async function updateArtwork(
  id: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  const parsed = readArtwork(formData);
  if (!parsed.success) return fail(parsed.error);

  const supabase = createServiceClient();
  const { data: current } = await supabase.from("artworks").select("image_url").eq("id", id).maybeSingle();
  if (!current) return fail("Tranh không tồn tại");

  // An artwork always needs an image, so "removeImage" is ignored here.
  formData.delete("removeImage");
  const image = await resolveImage(formData, "artworks", current.image_url);
  if (!image.ok) return image;

  const { error } = await supabase
    .from("artworks")
    .update({ ...parsed.data, image_url: image.url })
    .eq("id", id);
  await cleanupImage(current.image_url, image, !error);
  if (error) return fail("Không lưu được tranh. Vui lòng thử lại");

  refresh("/admin/noi-dung/top-5");
  return OK;
}

export async function deleteArtwork(id: string): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  const { data, error } = await createServiceClient()
    .from("artworks")
    .delete()
    .eq("id", id)
    .select("image_url")
    .maybeSingle();
  if (error) return fail("Không xóa được tranh. Vui lòng thử lại");
  await removeContentImage(data?.image_url);

  refresh("/admin/noi-dung/top-5");
  return OK;
}

// ─── Promotions ────────────────────────────────────────────────────────────

const promotionSchema = z
  .object({
    title: requiredText(200, "Tiêu đề"),
    description: optionalText(2000, "Mô tả"),
    price_text: optionalText(100, "Giá"),
    starts_at: z.string().transform(vnLocalToISO),
    ends_at: z.string().transform(vnLocalToISO),
    is_active: z.boolean(),
  })
  .refine((p) => !p.starts_at || !p.ends_at || p.starts_at <= p.ends_at, {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu",
  });

function readPromotion(formData: FormData) {
  return promotionSchema.safeParse(
    readForm(formData, ["title", "description", "price_text", "starts_at", "ends_at"], ["is_active"]),
  );
}

export async function createPromotion(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  const parsed = readPromotion(formData);
  if (!parsed.success) return fail(parsed.error);

  const image = await resolveImage(formData, "promotions", null);
  if (!image.ok) return image;

  const { error } = await createServiceClient()
    .from("promotions")
    .insert({ ...parsed.data, image_url: image.url });
  await cleanupImage(null, image, !error);
  if (error) return fail("Không thêm được khuyến mãi. Vui lòng thử lại");

  refresh("/admin/noi-dung/khuyen-mai");
  return OK;
}

export async function updatePromotion(
  id: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  const parsed = readPromotion(formData);
  if (!parsed.success) return fail(parsed.error);

  const supabase = createServiceClient();
  const { data: current } = await supabase.from("promotions").select("image_url").eq("id", id).maybeSingle();
  if (!current) return fail("Khuyến mãi không tồn tại");

  const image = await resolveImage(formData, "promotions", current.image_url);
  if (!image.ok) return image;

  const { error } = await supabase
    .from("promotions")
    .update({ ...parsed.data, image_url: image.url })
    .eq("id", id);
  await cleanupImage(current.image_url, image, !error);
  if (error) return fail("Không lưu được khuyến mãi. Vui lòng thử lại");

  refresh("/admin/noi-dung/khuyen-mai");
  return OK;
}

export async function deletePromotion(id: string): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  const { data, error } = await createServiceClient()
    .from("promotions")
    .delete()
    .eq("id", id)
    .select("image_url")
    .maybeSingle();
  if (error) return fail("Không xóa được khuyến mãi. Vui lòng thử lại");
  await removeContentImage(data?.image_url);

  refresh("/admin/noi-dung/khuyen-mai");
  return OK;
}
