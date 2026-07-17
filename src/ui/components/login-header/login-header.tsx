import { Menu } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

export function LoginHeader() {
  return (
    <header className="border-border bg-background border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <a href="#" className="flex items-center">
          <Image
            src="/logo-iron-pulse.png"
            alt="Iron Pulse"
            width={40}
            height={40}
            className="h-10 w-10"
            priority
          />
        </a>
        <nav aria-label="Principal" className="flex items-center gap-1">
          <a
            href="#"
            aria-current="page"
            className={cn(
              "border-primary text-foreground border-b-2 px-3 py-1.5 text-sm font-medium",
              "hover:text-foreground"
            )}
          >
            Iniciar Sesión
          </a>
          <span
            aria-disabled="true"
            className="text-muted-foreground cursor-not-allowed px-3 py-1.5 text-sm font-medium"
          >
            Registrarse
          </span>
          <a
            href="#"
            className="text-muted-foreground hover:text-foreground px-3 py-1.5 text-sm font-medium"
          >
            Ayuda
          </a>
          <button
            type="button"
            aria-label="Abrir menú"
            className="text-muted-foreground hover:bg-muted hover:text-foreground ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md"
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>
        </nav>
      </div>
    </header>
  );
}
