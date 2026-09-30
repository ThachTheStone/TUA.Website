"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";
import { flushCart } from "@/components/cart/cart-sync";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/customers/actions";

/** FR26 sign-out (account page only). Saves the cart to the account first; CartSync then empties this browser's cart. */
export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  function logout() {
    startTransition(async () => {
      await flushCart().catch(() => {});
      await signOut();
    });
  }

  return (
    <Button type="button" variant="brand-outline" size="cta" onClick={logout} disabled={pending}>
      <LogOut />
      {pending ? "Đang đăng xuất…" : "Đăng xuất"}
    </Button>
  );
}
