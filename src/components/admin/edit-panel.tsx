import { ChevronDown } from "lucide-react";

/** Collapsible card used for each editable row in admin lists (server component, no JS). */
export function EditPanel({
  summary,
  actions,
  children,
  defaultOpen = false,
}: {
  summary: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group rounded-xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">{summary}</div>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-4 border-t p-4">
        {children}
        {actions && <div className="flex justify-end border-t pt-4">{actions}</div>}
      </div>
    </details>
  );
}
