import type { Metadata } from "next";
import { requireRole } from "@/lib/supabase/auth";
import { listAccounts } from "@/lib/accounts";
import { formatDate } from "@/lib/format";
import {
  createAccount,
  resetAccountPassword,
  setAccountActive,
  updateAccountRole,
} from "@/lib/admin/account-actions";
import { CreateAccountForm, ResetPasswordForm, RoleSelect } from "@/components/admin/account-forms";
import { EditPanel } from "@/components/admin/edit-panel";
import { ConfirmActionButton } from "@/components/admin/form-kit";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Tài khoản" };

export default async function AccountsPage() {
  const admin = await requireRole(["ADMIN"]);
  const accounts = await listAccounts();

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Tài khoản</h1>
        <p className="text-sm text-muted-foreground">
          Staff xử lý đơn hàng và quyên góp. Admin có thêm quyền quản lý nội dung, nhà tài trợ, tài khoản và cài
          đặt.
        </p>
      </div>

      <EditPanel summary={<span className="font-medium">+ Tạo tài khoản</span>}>
        <CreateAccountForm action={createAccount} />
      </EditPanel>

      <div className="flex flex-col gap-3">
        {accounts.map((account) => {
          const isSelf = account.id === admin.userId;
          return (
            <EditPanel
              key={account.id}
              summary={
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">{account.full_name}</span>
                  {isSelf && <Badge variant="secondary">Bạn</Badge>}
                  <Badge variant={account.role === "ADMIN" ? "default" : "outline"}>
                    {account.role === "ADMIN" ? "Admin" : "Staff"}
                  </Badge>
                  {!account.is_active && <Badge variant="destructive">Đã vô hiệu hóa</Badge>}
                  <span className="w-full truncate text-xs text-muted-foreground">
                    {account.email} · Tạo {formatDate(account.created_at, { time: false })}
                  </span>
                </div>
              }
            >
              {isSelf ? (
                <p className="text-sm text-muted-foreground">
                  Bạn không thể tự đổi vai trò hoặc vô hiệu hóa tài khoản của mình. Đổi mật khẩu của bạn ở mục
                  &quot;Đổi mật khẩu&quot;.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium">Vai trò</span>
                    <RoleSelect role={account.role} action={updateAccountRole.bind(null, account.id)} />
                    <div className="flex-1" />
                    {account.is_active ? (
                      <ConfirmActionButton
                        action={setAccountActive.bind(null, account.id, false)}
                        confirmText={`Vô hiệu hóa tài khoản ${account.email}? Người này sẽ bị đăng xuất khỏi trang quản trị.`}
                        successMessage="Đã vô hiệu hóa tài khoản"
                      >
                        Vô hiệu hóa
                      </ConfirmActionButton>
                    ) : (
                      <ConfirmActionButton
                        action={setAccountActive.bind(null, account.id, true)}
                        successMessage="Đã kích hoạt lại tài khoản"
                        variant="outline"
                      >
                        Kích hoạt lại
                      </ConfirmActionButton>
                    )}
                  </div>
                  <div className="border-t pt-4">
                    <ResetPasswordForm id={account.id} action={resetAccountPassword.bind(null, account.id)} />
                  </div>
                </>
              )}
            </EditPanel>
          );
        })}
      </div>
    </div>
  );
}
