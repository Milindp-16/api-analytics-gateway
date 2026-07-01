import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Public paths that don't need auth -> redundant backup logic
  const publicPaths = ["/login", "/register", "/api/auth", "/api/demo"];
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

//without matcher function the middleware will run on every request
export const config = {
  matcher: ["/dashboard/:path*", "/api/analytics/:path*"],
};
