"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";
import { flushCart } from "@/components/cart/cart-sync";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/customers/actions";

/** FR26 sign-out. Saves the cart to the account first; CartSync then empties this browser's cart. */
export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const [pending, startTransition] = useTransition();

  function logout() {
    startTransition(async () => {
      await flushCart().catch(() => {});
      await signOut();
    });
  }

  return (
    <Button
      type="button"
      variant={compact ? "ghost" : "outline"}
      size={compact ? "icon" : "default"}
      className={compact ? "size-10" : undefined}
      onClick={logout}
      disabled={pending}
      aria-label="Đăng xuất"
      title="Đăng xuất"
    >
      <LogOut />
      {!compact && (pending ? "Đang đăng xuất…" : "Đăng xuất")}
    </Button>
  );
}
