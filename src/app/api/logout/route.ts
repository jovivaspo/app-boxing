import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete("jwt");
  cookieStore.delete("user");

  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });
}
