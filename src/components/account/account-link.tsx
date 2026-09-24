import { CircleUserRound } from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "@/components/account/logout-button";
import type { CustomerSession } from "@/lib/customers/session";

/** Header entry: "Đăng nhập" when signed out, account link + sign-out when signed in (FR26). */
export function AccountLink({ session }: { session: CustomerSession | null }) {
  if (!session) {
    return (
      <Link href="/dang-nhap" className="shrink-0 rounded-md px-3 py-2 font-medium hover:bg-muted">
        Đăng nhập
      </Link>
    );
  }
  const firstName = session.customer.full_name.trim().split(/\s+/).pop();
  return (
    <>
      <Link
        href="/tai-khoan"
        className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 hover:bg-muted"
        title="Tài khoản"
      >
        <CircleUserRound className="size-5" />
        <span className="max-w-24 truncate">{firstName}</span>
      </Link>
      <LogoutButton compact />
    </>
  );
}
