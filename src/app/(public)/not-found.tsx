import { HomeLinks, StatusPage } from "@/components/common/status-page";

export default function PublicNotFound() {
  return (
    <StatusPage code="404" title="Không tìm thấy trang" message="Trang bạn tìm không tồn tại hoặc đã ngừng hiển thị.">
      <HomeLinks />
    </StatusPage>
  );
}
