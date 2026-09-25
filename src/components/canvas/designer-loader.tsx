"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DesignerProps } from "@/components/canvas/designer";
import { PhoneGate } from "@/components/canvas/phone-gate";
import type { Contact } from "@/lib/settings";

// Konva needs `window`, so the designer is client-only.
const Designer = dynamic(() => import("@/components/canvas/designer").then((m) => m.Designer), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100dvh-3.5rem)] items-center justify-center text-muted-foreground">
      Đang tải bảng vẽ…
    </div>
  ),
});

export function DesignerLoader({ contact, ...props }: Omit<DesignerProps, "onSaved"> & { contact: Contact }) {
  const router = useRouter();
  const [session, setSession] = useState(0);
  const [editItemId, setEditItemId] = useState(props.editItemId);

  return (
    <PhoneGate contact={contact}>
      <Designer
        key={session}
        {...props}
        editItemId={editItemId}
        onSaved={() => {
          setEditItemId(null);
          setSession((n) => n + 1);
          if (props.editItemId) router.replace("/thiet-ke", { scroll: false });
        }}
      />
    </PhoneGate>
  );
}
