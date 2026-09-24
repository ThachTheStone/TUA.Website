import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Refreshes the Supabase session cookie on every page (staff and buyers share it) and
// bounces logged-out visitors away from /admin and /tai-khoan.
// Role, is_active and the customer row are checked again server-side.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (user) return response;

  const { pathname, search } = request.nextUrl;
  const redirectTo = (path: string, query = "") => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = query;
    return NextResponse.redirect(url);
  };

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") return redirectTo("/admin/login");
  if (pathname.startsWith("/tai-khoan")) {
    return redirectTo("/dang-nhap", `?next=${encodeURIComponent(pathname + search)}`);
  }
  return response;
}

export const config = {
  // Every page except static assets, images and the cron API.
  matcher: ["/((?!_next/static|_next/image|api/cron|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
