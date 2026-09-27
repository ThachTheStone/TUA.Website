import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Centered message for 404 and error pages, with ways back into the site. */
export function StatusPage({
  code,
  title,
  message,
  children,
}: {
  code?: string;
  title: string;
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-20 text-center">
      {code && <p className="text-5xl font-bold tracking-tight text-muted-foreground">{code}</p>}
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{message}</p>
      <div className="flex flex-wrap justify-center gap-3">{children}</div>
    </div>
  );
}

export function HomeLinks() {
  return (
    <>
      <Button asChild>
        <Link href="/">Về trang chủ</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/mau-ao">Xem áo mẫu</Link>
      </Button>
    </>
  );
}
