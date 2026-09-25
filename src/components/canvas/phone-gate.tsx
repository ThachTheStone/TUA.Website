"use client";

import { Mail, MessageCircle, Monitor, Phone } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Contact } from "@/lib/settings";
import { useIsPhone } from "@/lib/use-is-phone";

/** Vietnamese mobile number → Zalo chat link (Zalo uses the phone number as the id). */
function zaloUrl(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9 ? `https://zalo.me/${digits}` : null;
}

/**
 * FR03/NFR02: the canvas only runs on computers and tablets. On a phone it shows how to get
 * help from the organizers and where to buy instead; the canvas code is never loaded there.
 */
export function PhoneGate({ contact, back, children }: { contact: Contact; back?: { href: string; label: string }; children: React.ReactNode }) {
  const isPhone = useIsPhone();
  if (isPhone === null) {
    return <div className="flex h-[calc(100dvh-3.5rem)] items-center justify-center text-muted-foreground">Đang tải…</div>;
  }
  if (!isPhone) return <>{children}</>;

  const zalo = contact.phone ? zaloUrl(contact.phone) : null;
  const hasContact = contact.phone || contact.facebook || contact.email;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <Monitor className="size-10 text-muted-foreground" aria-hidden />
        <h1 className="text-xl font-bold">Tính năng tự thiết kế cần máy tính hoặc máy tính bảng</h1>
        <p className="text-sm text-muted-foreground">
          Màn hình điện thoại quá nhỏ để vẽ chính xác. Bạn hãy mở trang này trên máy tính hoặc máy tính bảng. Áo đã thiết kế sẽ nằm trong giỏ hàng
          của tài khoản, nên bạn vẫn đặt hàng được trên điện thoại.
        </p>
      </div>

      {hasContact && (
        <section className="flex flex-col gap-2 rounded-xl border p-4">
          <h2 className="font-semibold">Cần hỗ trợ thiết kế? Liên hệ Ban tổ chức</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {contact.phone && (
              <li className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 underline underline-offset-4">
                  <Phone className="size-4" /> {contact.phone}
                </a>
                {zalo && (
                  <a href={zalo} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                    Nhắn Zalo
                  </a>
                )}
              </li>
            )}
            {contact.facebook && (
              <li>
                <a href={contact.facebook} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 underline underline-offset-4">
                  <MessageCircle className="size-4" /> Facebook
                </a>
              </li>
            )}
            {contact.email && (
              <li>
                <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 underline underline-offset-4">
                  <Mail className="size-4" /> {contact.email}
                </a>
              </li>
            )}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-3">
        <Button asChild size="lg" className="h-12">
          <Link href="/mau-ao">Xem áo mẫu</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12">
          <Link href="/ao-tron">Mua áo trơn</Link>
        </Button>
        {back && (
          <Button asChild variant="ghost">
            <Link href={back.href}>{back.label}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
