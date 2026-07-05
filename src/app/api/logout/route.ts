import { NextRequest, NextResponse } from "next/server";

import { createSignOutUseCase } from "@/infraestructure/composition";

export async function POST(request: NextRequest) {
  await createSignOutUseCase()();

  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });
}
