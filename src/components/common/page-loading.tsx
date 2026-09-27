import { Loader2 } from "lucide-react";

/** Shown while a server-rendered page loads (every public page renders per request). */
export function PageLoading() {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
      <Loader2 className="size-5 animate-spin" aria-hidden />
      Đang tải…
    </div>
  );
}
