import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  if (request.cookies.has("NH_ACCESS")) return NextResponse.next();

  const destination = request.nextUrl.clone();
  destination.pathname = request.nextUrl.pathname.startsWith("/admin/") ? "/admin" : "/auth/login";
  destination.search = "";
  return NextResponse.redirect(destination);
}

export const config = {
  matcher: ["/admin/dashboard", "/dashboard/student", "/dashboard/faculty"],
};
