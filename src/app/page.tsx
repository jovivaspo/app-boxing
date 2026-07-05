import { redirect } from "next/navigation";

import { createCookieSessionAdapter } from "@/infraestructure/session/cookie-session.adapter";
import { getCurrentSession } from "@/application/use-cases/get-current-session";

// Force per-request rendering: `getCurrentSession()` reaches `cookies()`
// only through the session adapter. If `SESSION_SECRET`/`BACKEND_URL` are
// ever unset at build time, the session adapter fails closed to `null`
// BEFORE calling `cookies()`, which would otherwise let Next.js's
// build-time static analysis miss the dynamic-API usage entirely and bake
// this session-gated redirect into a static page. Session-gated routes
// must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getCurrentSession({
    session: createCookieSessionAdapter(),
  })();

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-3xl font-semibold tracking-tight">
        ¡Hola, {session.user.name}!
      </h1>
      <p className="text-muted-foreground">
        Estás autenticado correctamente.
      </p>
      <div className="flex gap-3">
        <a
          href="/profile"
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Ver perfil
        </a>
        <form action="/api/logout" method="post">
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
