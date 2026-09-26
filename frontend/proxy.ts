import { NextRequest, NextResponse } from "next/server";

export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
