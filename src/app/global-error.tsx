"use client";

// Last resort when the root layout itself fails: no app styles are guaranteed, so keep it plain.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="vi">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "5rem 1rem" }}>
        <h1 style={{ fontSize: "1.5rem" }}>Có lỗi xảy ra</h1>
        <p style={{ color: "#666" }}>Website chưa tải được. Vui lòng thử lại sau ít phút.</p>
        <button type="button" onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1rem", cursor: "pointer" }}>
          Thử lại
        </button>
      </body>
    </html>
  );
}
