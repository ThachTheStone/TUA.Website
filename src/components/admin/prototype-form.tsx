"use client";

/* eslint-disable @next/next/no-img-element -- local blob previews and signed URLs */
import { ArrowLeft, ArrowRight, Download, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Field } from "@/components/admin/form-kit";
import type { ColorOption } from "@/components/public/shirt-options";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { prepareProtoUpload, savePrototype, type SavePrototypeInput } from "@/lib/admin/prototype-actions";
import { readPngSize } from "@/lib/design/png";
import { newId } from "@/lib/design/types";
import { resolutionWarning } from "@/lib/prototypes/resolution";
import { slugify } from "@/lib/slug";
import { createBrowserSupabase } from "@/lib/supabase/client";

// FR28: create or edit one prototype. Files upload straight to storage through one-time
// signed URLs from the server (they're too big for a server action), then the form saves.

const MAX_IMAGES = 4;
const MAX_IMAGE_MB = 5;
const MAX_PRINT_MB = 20;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

type AreaInfo = { key: string; label: string; widthCm: number; heightCm: number };
export type ProtoFormData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  sort_order: number;
  stock_limit: number | null;
  /** Pieces in orders that are not cancelled or expired. */
  sold: number;
  is_active: boolean;
  image_urls: string[];
  files: { area: string; widthPx: number | null; heightPx: number | null; url: string | null }[];
};

type ImageItem = { key: string; url: string; file?: File };
type PrintItem = { file?: File; url: string | null; widthPx: number | null; heightPx: number | null };

const selectClass = "h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs";

async function upload(prototypeId: string, kind: "image" | "print", file: File, area?: string): Promise<string> {
  const slot = await prepareProtoUpload({ prototypeId, kind, area, contentType: file.type, size: file.size });
  if (!slot.ok) throw new Error(slot.error);
  const { error } = await createBrowserSupabase()
    .storage.from(slot.data.bucket)
    .uploadToSignedUrl(slot.data.path, slot.data.token, file, { contentType: file.type });
  if (error) throw new Error(`Không tải được "${file.name}" lên. Vui lòng thử lại.`);
  return slot.data.path;
}

export function PrototypeForm({
  prototype,
  colors,
  printAreas,
  dpi,
}: {
  prototype?: ProtoFormData;
  colors: ColorOption[];
  printAreas: AreaInfo[];
  dpi: number;
}) {
  const isNew = !prototype;
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initial = () => ({
    /** New prototypes get their id on first submit, then keep it so a retry reuses the upload folder. */
    id: prototype?.id ?? "",
    name: prototype?.name ?? "",
    slug: prototype?.slug ?? "",
    slugTouched: !!prototype,
    description: prototype?.description ?? "",
    color: prototype?.color ?? colors[0]?.key ?? "",
    sortOrder: prototype?.sort_order ?? 0,
    /** "" = no cap. */
    stockLimit: prototype?.stock_limit == null ? "" : String(prototype.stock_limit),
    isActive: prototype?.is_active ?? true,
    images: (prototype?.image_urls ?? []).map((url): ImageItem => ({ key: url, url })),
    prints: Object.fromEntries(
      (prototype?.files ?? []).map((f) => [f.area, { url: f.url, widthPx: f.widthPx, heightPx: f.heightPx }]),
    ) as Record<string, PrintItem>,
  });
  const [f, setF] = useState(initial);
  // Areas whose print file was replaced or removed in this edit.
  const [changedAreas, setChangedAreas] = useState<Set<string>>(new Set());
  const set = (patch: Partial<ReturnType<typeof initial>>) => setF((prev) => ({ ...prev, ...patch }));

  // Release local previews on unmount (removed images are released when removed).
  const imagesRef = useRef(f.images);
  imagesRef.current = f.images;
  useEffect(() => () => imagesRef.current.forEach((i) => i.file && URL.revokeObjectURL(i.url)), []);

  const id = (name: string) => `${prototype?.id ?? "new"}-${name}`;
  const settings = { print_areas: printAreas, export_dpi: dpi };

  function addImages(files: FileList | null) {
    if (!files) return;
    const picked = [...files];
    const bad = picked.find((file) => !IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_MB * 1024 * 1024);
    if (bad) return toast.error(`"${bad.name}": ảnh phải là JPG, PNG hoặc WebP, tối đa ${MAX_IMAGE_MB}MB`);
    const room = MAX_IMAGES - f.images.length;
    if (picked.length > room) toast.error(`Tối đa ${MAX_IMAGES} ảnh hiển thị`);
    set({
      images: [...f.images, ...picked.slice(0, Math.max(0, room)).map((file) => ({ key: newId(), url: URL.createObjectURL(file), file }))],
    });
  }

  function moveImage(index: number, by: -1 | 1) {
    const images = [...f.images];
    [images[index], images[index + by]] = [images[index + by], images[index]];
    set({ images });
  }

  async function pickPrint(area: string, file: File | undefined) {
    if (!file) return;
    if (file.type !== "image/png") return toast.error("File in phải là PNG");
    if (file.size > MAX_PRINT_MB * 1024 * 1024) return toast.error(`File in tối đa ${MAX_PRINT_MB}MB`);
    const size = readPngSize(new Uint8Array(await file.slice(0, 32).arrayBuffer()));
    if (!size) return toast.error("File in phải là PNG");
    set({ prints: { ...f.prints, [area]: { file, url: null, widthPx: size.width, heightPx: size.height } } });
    setChangedAreas((s) => new Set(s).add(area));
  }

  function removePrint(area: string) {
    const prints = { ...f.prints };
    delete prints[area];
    set({ prints });
    setChangedAreas((s) => new Set(s).add(area));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!f.images.length) return setError("Cần ít nhất 1 ảnh hiển thị");
    if (!Object.keys(f.prints).length) return setError("Cần file in cho ít nhất 1 vùng in");

    const protoId = f.id || crypto.randomUUID();
    if (!f.id) set({ id: protoId });

    startTransition(async () => {
      try {
        // Uploads run in parallel; the order of display images is kept.
        const newFiles = f.images.filter((i) => i.file).length + [...changedAreas].filter((a) => f.prints[a]?.file).length;
        let done = 0;
        const tick = (path: string) => {
          setProgress(`Đã tải ${++done}/${newFiles} file…`);
          return path;
        };
        if (newFiles) setProgress(`Đang tải ${newFiles} file…`);

        const imagesTask = Promise.all(
          f.images.map(async (image): Promise<SavePrototypeInput["images"][number]> =>
            image.file ? { path: tick(await upload(protoId, "image", image.file)) } : { url: image.url },
          ),
        );
        const printsTask = Promise.all(
          [...changedAreas].map(async (area): Promise<[string, string | null] | null> => {
            const file = f.prints[area]?.file;
            if (file) return [area, tick(await upload(protoId, "print", file, area))];
            return f.prints[area] ? null : [area, null];
          }),
        );
        const [images, printEntries] = await Promise.all([imagesTask, printsTask]);
        const prints: Record<string, string | null> = Object.fromEntries(printEntries.filter((e) => e !== null));

        setProgress("Đang lưu…");
        const result = await savePrototype({
          id: protoId,
          name: f.name,
          slug: f.slug,
          description: f.description,
          color: f.color,
          sort_order: f.sortOrder,
          stock_limit: f.stockLimit === "" ? null : Number(f.stockLimit),
          is_active: f.isActive,
          images,
          prints,
        });
        if (!result.ok) throw new Error(result.error);

        toast.success(isNew ? "Đã thêm mẫu áo" : "Đã lưu mẫu áo");
        result.data.warnings.forEach((w) => toast.warning(w, { duration: 10000 }));
        setChangedAreas(new Set());
        if (isNew) {
          f.images.forEach((i) => i.file && URL.revokeObjectURL(i.url));
          setF(initial());
        }
        // No router.refresh(): savePrototype's revalidatePath already sends the updated page.
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không lưu được mẫu áo. Vui lòng thử lại");
      } finally {
        setProgress(null);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <fieldset disabled={pending} className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tên mẫu" htmlFor={id("name")}>
            <Input
              id={id("name")}
              value={f.name}
              maxLength={120}
              required
              onChange={(e) => set({ name: e.target.value, ...(f.slugTouched ? {} : { slug: slugify(e.target.value) }) })}
            />
          </Field>
          <Field label="Đường dẫn" htmlFor={id("slug")} hint="Mã nhận diện mẫu, chữ thường không dấu">
            <Input
              id={id("slug")}
              value={f.slug}
              maxLength={80}
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              onChange={(e) => set({ slug: e.target.value.toLowerCase(), slugTouched: true })}
            />
          </Field>
        </div>

        <Field label="Mô tả" htmlFor={id("description")}>
          <Textarea id={id("description")} rows={3} maxLength={2000} value={f.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-[1fr_12rem_8rem]">
          <Field label="Màu áo" htmlFor={id("color")} hint="Mỗi mẫu có một màu áo cố định; khách chỉ chọn size">
            <select id={id("color")} className={selectClass} value={f.color} onChange={(e) => set({ color: e.target.value })}>
              {colors.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Giới hạn số lượng"
            htmlFor={id("stock")}
            hint={`Để trống = không giới hạn${prototype ? ` · Đã đặt ${prototype.sold}` : ""}`}
          >
            <Input
              id={id("stock")}
              type="number"
              min={0}
              max={100000}
              inputMode="numeric"
              placeholder="Không giới hạn"
              value={f.stockLimit}
              onChange={(e) => set({ stockLimit: e.target.value })}
            />
          </Field>
          <Field label="Thứ tự" htmlFor={id("sort")}>
            <Input
              id={id("sort")}
              type="number"
              min={0}
              max={9999}
              value={f.sortOrder}
              onChange={(e) => set({ sortOrder: Math.max(0, Math.min(9999, Math.floor(e.target.valueAsNumber) || 0)) })}
            />
          </Field>
        </div>

        <Field label={`Ảnh hiển thị (${f.images.length}/${MAX_IMAGES})`} htmlFor={id("images")} hint="JPG, PNG hoặc WebP, tối đa 5MB mỗi ảnh. Ảnh đầu tiên là ảnh đại diện.">
          {f.images.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {f.images.map((image, i) => (
                <div key={image.key} className="flex flex-col items-center gap-1">
                  <img src={image.url} alt="" loading="lazy" decoding="async" className="size-28 rounded-md border bg-muted object-cover" />
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Lên trước" disabled={i === 0} onClick={() => moveImage(i, -1)}>
                      <ArrowLeft />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      aria-label="Bỏ ảnh"
                      onClick={() => {
                        if (image.file) URL.revokeObjectURL(image.url);
                        set({ images: f.images.filter((x) => x !== image) });
                      }}
                    >
                      <X />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Ra sau" disabled={i === f.images.length - 1} onClick={() => moveImage(i, 1)}>
                      <ArrowRight />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {f.images.length < MAX_IMAGES && (
            <input
              id={id("images")}
              type="file"
              multiple
              accept={IMAGE_TYPES.join(",")}
              onChange={(e) => {
                addImages(e.target.files);
                e.target.value = "";
              }}
              className="text-sm file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-1.5 file:text-sm"
            />
          )}
        </Field>

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium">File in theo vùng in</p>
            <p className="text-xs text-muted-foreground">PNG nền trong suốt, tối đa 20MB mỗi file, ít nhất 1 vùng. Kích thước cần theo {dpi} DPI.</p>
          </div>
          {printAreas.map((area) => {
            const print = f.prints[area.key];
            const needW = Math.round((area.widthCm / 2.54) * dpi);
            const needH = Math.round((area.heightCm / 2.54) * dpi);
            const warning = print ? resolutionWarning({ area: area.key, widthPx: print.widthPx, heightPx: print.heightPx }, settings) : null;
            return (
              <div key={area.key} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {area.label}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({area.widthCm}×{area.heightCm} cm → {needW}×{needH}px)
                    </span>
                  </span>
                  {print && (
                    <span className="flex items-center gap-2 text-sm">
                      {print.file ? print.file.name : "File hiện tại"}
                      {print.widthPx && print.heightPx && (
                        <span className="text-xs text-muted-foreground">
                          {print.widthPx}×{print.heightPx}px
                        </span>
                      )}
                      {print.url && (
                        <a href={print.url} className="inline-flex items-center gap-1 text-xs underline underline-offset-4">
                          <Download className="size-3.5" /> Tải
                        </a>
                      )}
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => removePrint(area.key)}>
                        Bỏ
                      </Button>
                    </span>
                  )}
                </div>
                {warning && <p className="text-xs text-amber-700 dark:text-amber-400">{warning}</p>}
                <input
                  type="file"
                  accept="image/png"
                  aria-label={`File in ${area.label}`}
                  onChange={(e) => {
                    void pickPrint(area.key, e.target.files?.[0]);
                    e.target.value = "";
                  }}
                  className="text-sm file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-1.5 file:text-sm"
                />
              </div>
            );
          })}
          {!isNew && changedAreas.size > 0 && (
            <p className="text-xs text-muted-foreground">Đơn đã đặt trước đó vẫn giữ file in cũ; file mới áp dụng cho đơn đặt sau khi lưu.</p>
          )}
        </div>

        <label htmlFor={id("active")} className="flex items-center gap-2 text-sm">
          <input id={id("active")} type="checkbox" checked={f.isActive} onChange={(e) => set({ isActive: e.target.checked })} className="size-4 accent-primary" />
          Đang bán (hiển thị trên trang Áo mẫu)
        </label>
      </fieldset>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? (progress ?? "Đang lưu…") : isNew ? "Thêm mẫu áo" : "Lưu"}
      </Button>
    </form>
  );
}
