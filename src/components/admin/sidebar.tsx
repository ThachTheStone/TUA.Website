"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ClipboardList,
  FileText,
  HandHeart,
  Handshake,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookPen,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { logout } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/types/db";

type NavItem = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean };

// SRS §3: Staff handles orders/donations; Admin also manages content, sponsors, accounts and settings.
const NAV: NavItem[] = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/don-hang", label: "Đơn hàng", icon: ClipboardList },
  { href: "/admin/workshop", label: "Tạo đơn Workshop", icon: NotebookPen },
  { href: "/admin/quyen-gop", label: "Quyên góp", icon: HandHeart },
  { href: "/admin/noi-dung", label: "Nội dung", icon: FileText, adminOnly: true },
  { href: "/admin/nha-tai-tro", label: "Nhà tài trợ", icon: Handshake, adminOnly: true },
  { href: "/admin/tai-khoan", label: "Tài khoản", icon: Users, adminOnly: true },
  { href: "/admin/cai-dat", label: "Cài đặt", icon: Settings, adminOnly: true },
];

const ROLE_LABEL: Record<UserRole, string> = { ADMIN: "Admin", STAFF: "Staff" };

export function AdminSidebar({ name, role }: { name: string; role: UserRole }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((item) => !item.adminOnly || role === "ADMIN");

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <aside className="border-b bg-background md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:border-r md:border-b-0">
      <div className="flex items-center justify-between px-4 py-3 md:py-5">
        <Link href="/admin" className="font-semibold">
          TỰA · Quản trị
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Đóng menu" : "Mở menu"}
          aria-expanded={open}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>

      <div className={cn("flex-1 flex-col md:flex", open ? "flex" : "hidden")}>
        <nav className="flex flex-1 flex-col gap-1 px-2">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
                isActive(href) && "bg-muted font-medium",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-1 border-t p-2">
          <div className="px-3 py-2 text-sm">
            <div className="truncate font-medium">{name}</div>
            <div className="text-xs text-muted-foreground">{ROLE_LABEL[role]}</div>
          </div>
          <Link
            href="/admin/doi-mat-khau"
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted",
              isActive("/admin/doi-mat-khau") && "bg-muted font-medium",
            )}
          >
            <KeyRound className="size-4" />
            Đổi mật khẩu
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-destructive hover:bg-muted"
            >
              <LogOut className="size-4" />
              Đăng xuất
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
