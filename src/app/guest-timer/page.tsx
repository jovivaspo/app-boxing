import { GuestTimerForm } from "@/ui/components/guest-timer-form";

export default function GuestTimerPage() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-4">
      <h1 className="text-2xl font-semibold tracking-tight">Guest Timer</h1>
      <GuestTimerForm />
    </main>
  );
}
