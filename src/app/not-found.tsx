import Link from "next/link";

import { Button } from "@/ui/components/shadcn/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4 text-center">
      <h1 className="font-heading text-primary text-[8rem] leading-[0.85] tracking-tighter italic sm:text-[10rem]">
        404
      </h1>

      <h2 className="font-heading border-primary border-l-4 pl-3 text-3xl uppercase italic">
        Fuera del ring
      </h2>

      <p className="text-muted-foreground max-w-[280px]">
        La página que buscás no existe o fue movida.
      </p>

      <Button
        asChild
        className="font-heading mt-4 h-16 w-full max-w-md rounded-none text-lg uppercase italic"
      >
        <Link href="/">Volver al inicio</Link>
      </Button>
    </main>
  );
}
