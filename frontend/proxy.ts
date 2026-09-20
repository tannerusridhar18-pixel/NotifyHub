import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the admin login page itself
  if (pathname === "/admin" || pathname === "/admin/") {
    return NextResponse.next();
  }

  const hasAccess = request.cookies.has("NH_ACCESS");
  if (!hasAccess) {
    const destination = request.nextUrl.clone();
    destination.pathname = pathname.startsWith("/admin") ? "/admin" : "/auth/login";
    destination.search = "";
    return NextResponse.redirect(destination);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
