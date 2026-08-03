import Image from "next/image";
import Link from "next/link";

import type { TopbarProps } from "./topbar.types";

/**
 * Shared, session-aware topbar rendered by both `/` and `/login` (D-1,
 * `app-shell` capability). Presentational only, zero client JS — logout is a
 * plain POST form (D-3, mobile hamburger deferred).
 */
export function Topbar({ session }: TopbarProps) {
  return (
    <header className="border-border bg-background sticky top-0 z-50 border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo-iron-pulse.png"
            alt="Iron Pulse"
            width={40}
            height={40}
            className="h-10 w-10"
            priority
          />
        </Link>

        <nav aria-label="Principal" className="flex items-center gap-1">
          {session ? (
            <>
              <Link
                href="/profile"
                className="text-muted-foreground hover:text-foreground px-3 py-1.5 font-mono text-xs tracking-widest uppercase"
              >
                Perfil
              </Link>
              <Link
                href="/timers"
                className="text-muted-foreground hover:text-foreground px-3 py-1.5 font-mono text-xs tracking-widest uppercase"
              >
                Mis Timers
              </Link>
              <form action="/api/logout" method="post">
                <button
                  type="submit"
                  className="text-muted-foreground hover:text-foreground px-3 py-1.5 font-mono text-xs tracking-widest uppercase"
                >
                  Cerrar Sesión
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-foreground border-primary border-b-2 px-3 py-1.5 font-mono text-xs tracking-widest uppercase"
              >
                Iniciar Sesión
              </Link>
              <span
                aria-disabled="true"
                className="text-muted-foreground cursor-not-allowed px-3 py-1.5 font-mono text-xs tracking-widest uppercase"
              >
                Registrarse
              </span>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
