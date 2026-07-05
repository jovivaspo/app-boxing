import { NextRequest, NextResponse } from "next/server";

import { createCookieSessionAdapter } from "@/infraestructure/session/cookie-session.adapter";
import { signOut } from "@/application/use-cases/sign-out";

export async function POST(request: NextRequest) {
  await signOut({ session: createCookieSessionAdapter() })();

  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });
}
