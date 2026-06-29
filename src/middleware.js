import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Public paths that don't need auth
  const publicPaths = ["/login", "/register", "/api/auth", "/api/demo", "/api/analytics"];
  const isPublic = publicPaths.some((path) => pathname.startsWith(path));

  // Allow public routes, static files, and the landing page
  if (isPublic || pathname === "/" || pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // Check for auth token on protected routes
  const token = request.cookies.get("token")?.value;

  if (!token && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/analytics/:path*"],
};
