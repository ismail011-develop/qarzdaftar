import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PUBLIC_API = ["/api/cron/"];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const adminHost = process.env.ADMIN_HOST;
  if (adminHost && req.headers.get("host") === adminHost && path === "/") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: CookieToSet[]) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();   // validates the JWT with Supabase Auth

  const isApi = path.startsWith("/api/");
  const isProtected = path.startsWith("/app") || path.startsWith("/admin") || (isApi && !PUBLIC_API.some((p) => path.startsWith(p)));
  if (!user && isProtected) {
    if (isApi) return NextResponse.json({ error: { code: "not_authenticated" } }, { status: 401 });
    const url = req.nextUrl.clone(); url.pathname = "/login"; url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if (user && path.startsWith("/admin")) {
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (isAdmin !== true) return NextResponse.redirect(new URL("/app", req.url));
  }
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js).*)"] };
