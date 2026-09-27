"use client";

import Link from "next/link";
import { useEffect } from "react";
import { StatusPage } from "@/components/common/status-page";
import { Button } from "@/components/ui/button";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <StatusPage
      title="Có lỗi xảy ra"
      message={`Trang quản trị chưa tải được.${error.digest ? ` Mã lỗi: ${error.digest}.` : ""} Vui lòng thử lại.`}
    >
      <Button type="button" onClick={reset}>
        Thử lại
      </Button>
      <Button asChild variant="outline">
        <Link href="/admin">Về Tổng quan</Link>
      </Button>
    </StatusPage>
  );
}
