import { Button } from "@/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/components/card"
import { GoogleIcon } from "@/ui/components/google-icon"
import { SecurityBadges } from "@/ui/components/security-badges"

export function LoginCard() {
  return (
    <Card className="w-full max-w-[440px] rounded-2xl border-border p-4 sm:p-8">
      <CardHeader className="p-0">
        <CardTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Bienvenido
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Inicia sesión en tu cuenta
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 p-0 pt-6">
        <Button
          type="button"
          variant="default"
          size="lg"
          className="h-11 w-full justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
        >
          <GoogleIcon className="size-4" />
          <span>Continuar con Google</span>
        </Button>
        <SecurityBadges />
      </CardContent>
    </Card>
  )
}
