import { Separator } from "@/ui/components/shadcn/separator";

export function LoginFooter() {
  return (
    <footer className="border-border bg-background border-t">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
        <Separator />
        <div className="text-muted-foreground flex flex-col items-center justify-between gap-3 text-xs sm:flex-row">
          <span className="text-foreground font-medium">
            ELITE COMBAT LEAGUE
          </span>
          <nav aria-label="Legal">
            <ul
              role="list"
              className="flex flex-wrap items-center gap-x-4 gap-y-1"
            >
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Términos de Servicio
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Política de Privacidad
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors"
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
  );
}
