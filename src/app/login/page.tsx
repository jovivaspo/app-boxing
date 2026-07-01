import { LoginCard } from "@/ui/components/login-card"
import { LoginFooter } from "@/ui/components/login-footer"
import { LoginHeader } from "@/ui/components/login-header"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <LoginHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <LoginCard />
      </main>
      <LoginFooter />
    </div>
  )
}
