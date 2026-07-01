import { Menu } from "lucide-react"

import { cn } from "@/lib/utils"

export function LoginHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <a
          href="#"
          className="text-base font-semibold tracking-tight text-foreground"
        >
          AuthShell
        </a>
        <nav aria-label="Principal" className="flex items-center gap-1">
          <a
            href="#"
            aria-current="page"
            className={cn(
              "border-b-2 border-zinc-900 px-3 py-1.5 text-sm font-medium text-foreground",
              "hover:text-foreground"
            )}
          >
            Iniciar Sesión
          </a>
          <span
            aria-disabled="true"
            className="cursor-not-allowed px-3 py-1.5 text-sm font-medium text-muted-foreground"
          >
            Registrarse
          </span>
          <a
            href="#"
            className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Ayuda
          </a>
          <button
            type="button"
            aria-label="Abrir menú"
            className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>
        </nav>
      </div>
    </header>
  )
}
