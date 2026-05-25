import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const roles = req.nextauth.token?.roles as string[] ?? ["viewer"];

    if (pathname.startsWith("/WriterPage") && !roles.some((r) => ["writer", "editor", "admin"].includes(r))) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (pathname.startsWith("/EditorPage") && !roles.some((r) => ["editor", "admin"].includes(r))) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (pathname.startsWith("/AdminPage") && !roles.includes("admin")) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        const protectedPaths = ["/WriterPage", "/EditorPage", "/AdminPage", "/Profile"];
        if (protectedPaths.some((p) => pathname.startsWith(p))) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/WriterPage/:path*", "/EditorPage/:path*", "/AdminPage/:path*", "/Profile/:path*"],
};
