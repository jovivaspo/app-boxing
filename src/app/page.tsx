import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const cookieStore = await cookies();
  const jwt = cookieStore.get("jwt")?.value;
  const userCookie = cookieStore.get("user")?.value;

  if (!jwt) {
    redirect("/login");
  }

  const userName = userCookie
    ? (JSON.parse(userCookie) as { name?: string }).name ?? "Usuario"
    : "Usuario";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-3xl font-semibold tracking-tight">
        ¡Hola, {userName}!
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
