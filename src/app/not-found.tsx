import type { Metadata } from "next";
import { HomeLinks, StatusPage } from "@/components/common/status-page";

export const metadata: Metadata = { title: "Không tìm thấy trang" };

/** Unknown URLs (outside any layout with a header). */
export default function NotFound() {
  return (
    <StatusPage code="404" title="Không tìm thấy trang" message="Trang bạn tìm không tồn tại hoặc đã ngừng hiển thị.">
      <HomeLinks />
    </StatusPage>
  );
}
