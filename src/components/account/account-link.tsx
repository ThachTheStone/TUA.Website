import { CircleUserRound } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { CustomerSession } from "@/lib/customers/session";

/**
 * Header entry (FR26): "Đăng nhập" when signed out; when signed in, an account icon styled like
 * the cart icon. Sign-out lives on the account page.
 */
export function AccountLink({ session }: { session: CustomerSession | null }) {
  if (!session) {
    return (
      <Button asChild variant="brand-outline" size="cta">
        <Link href="/dang-nhap">Đăng nhập</Link>
      </Button>
    );
  }
  return (
    <Link
      href="/tai-khoan"
      className="flex size-11 items-center justify-center rounded-full hover:bg-foreground/[0.06]"
      aria-label="Tài khoản"
      title="Tài khoản"
    >
      <CircleUserRound className="size-5" />
    </Link>
  );
}
