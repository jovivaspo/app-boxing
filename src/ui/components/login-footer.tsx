import { Separator } from "@/ui/components/separator"

export function LoginFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
        <Separator />
        <div className="flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
          <span className="font-medium text-foreground">
            ELITE COMBAT LEAGUE
          </span>
          <nav aria-label="Legal">
            <ul role="list" className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <li>
                <a
                  href="#"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Términos de Servicio
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Política de Privacidad
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Contacto
                </a>
              </li>
            </ul>
          </nav>
          <span>© 2026 ELITE COMBAT LEAGUE</span>
        </div>
      </div>
    </footer>
  )
}
