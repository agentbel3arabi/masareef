import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/", "/login", "/signup"];
const ONBOARDING_ROUTE = "/onboarding";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Unauthenticated: allow public routes, redirect everything else to /login
  if (!session) {
    if (PUBLIC_ROUTES.includes(pathname)) return response;
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated: redirect away from auth pages
  if (pathname === "/login" || pathname === "/signup") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Authenticated: check household for non-onboarding routes
  // TODO(perf): cookie-based optimization if middleware latency becomes measurable
  if (pathname !== ONBOARDING_ROUTE) {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const statusRes = await fetch(`${apiUrl}/api/v1/auth/household-status`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (statusRes.ok) {
        const { data } = await statusRes.json();
        if (!data.has_household) {
          return NextResponse.redirect(new URL(ONBOARDING_ROUTE, request.url));
        }
      }
    } catch {
      // If household-status call fails, allow through (don't block the user)
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logos|fonts).*)"],
};
