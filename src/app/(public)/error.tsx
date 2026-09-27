"use client";

import { useEffect } from "react";
import { HomeLinks, StatusPage } from "@/components/common/status-page";
import { Button } from "@/components/ui/button";

export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <StatusPage title="Có lỗi xảy ra" message="Trang chưa tải được. Vui lòng thử lại; nếu vẫn lỗi, hãy liên hệ Ban tổ chức.">
      <Button type="button" onClick={reset}>
        Thử lại
      </Button>
      <HomeLinks />
    </StatusPage>
  );
}
