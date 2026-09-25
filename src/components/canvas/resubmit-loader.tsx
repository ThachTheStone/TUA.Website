"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { DesignerProps } from "@/components/canvas/designer";
import { PhoneGate } from "@/components/canvas/phone-gate";
import { uploadDesign } from "@/lib/cart/submit";
import type { DesignAreas } from "@/lib/design/types";
import type { Contact } from "@/lib/settings";
import { resubmitDesignAction } from "@/lib/orders/actions";

// FR29: the designer opened on a rejected shirt of a placed order.
const Designer = dynamic(() => import("@/components/canvas/designer").then((m) => m.Designer), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100dvh-3.5rem)] items-center justify-center text-muted-foreground">Đang tải bảng vẽ…</div>
  ),
});

type Props = Omit<DesignerProps, "onSaved" | "editItemId" | "signedIn" | "resubmit"> & {
  code: string;
  itemId: string;
  areas: DesignAreas;
  color: string;
  size: string;
  rejectReason: string | null;
  contact: Contact;
};

export function ResubmitLoader({ code, itemId, areas, color, size, rejectReason, contact, ...designer }: Props) {
  const router = useRouter();
  const hex = designer.colors.find((c) => c.key === color)?.hex ?? "#ffffff";

  async function submit(next: DesignAreas) {
    const uploadId = await uploadDesign(next, designer, hex);
    const result = await resubmitDesignAction({ code, itemId, uploadId });
    if (!result.ok) throw new Error(result.error);
    toast.success("Đã gửi lại thiết kế. Ban tổ chức sẽ duyệt sớm.");
    router.push(`/tai-khoan/don-hang/${code}`);
  }

  return (
    <PhoneGate contact={contact} back={{ href: `/tai-khoan/don-hang/${code}`, label: "Quay lại đơn hàng" }}>
      <Designer
        {...designer}
        editItemId={null}
        onSaved={() => {}}
        signedIn
        resubmit={{ areas, color, size, rejectReason, submit }}
      />
    </PhoneGate>
  );
}
