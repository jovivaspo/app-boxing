import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { createGetCurrentSessionUseCase } from "@/infraestructure/composition";

// See src/app/page.tsx for why session-gated routes must force dynamic
// rendering rather than rely on Next.js's build-time dynamic-API detection.
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await createGetCurrentSessionUseCase()();

  if (!session) {
    redirect("/login");
  }

  const { user } = session;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        {/* Avatar */}
        <div className="relative flex size-24 items-center justify-center overflow-hidden rounded-full bg-zinc-100 ring-2 ring-zinc-200">
          {user.pictureUrl ? (
            <Image
              src={user.pictureUrl}
              alt={user.name}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="text-3xl font-semibold text-zinc-500">
              {user.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Name & Role */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {user.name}
          </h1>
          <span className="mt-1 inline-block rounded-full bg-zinc-100 px-3 py-0.5 text-xs font-medium uppercase tracking-wider text-zinc-600">
            {user.role}
          </span>
        </div>

        {/* Info */}
        <div className="w-full space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="h-px bg-zinc-100" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">ID</span>
            <span className="font-medium tabular-nums text-zinc-500">
              {user.id.slice(0, 8)}…
            </span>
          </div>
          <div className="h-px bg-zinc-100" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Miembro desde</span>
            <span className="font-medium">
              {new Date(user.createdAt).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex w-full gap-3">
          <Link
            href="/"
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Inicio
          </Link>
          <form action="/api/logout" method="post" className="flex-1">
            <button
              type="submit"
              className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
