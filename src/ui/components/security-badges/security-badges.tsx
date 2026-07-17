import { FingerprintPattern, Lock, ShieldCheck } from "lucide-react";

/**
 * Row of three trust badges: verified, encrypted, secure.
 * Each badge pairs a Lucide icon with a Spanish label.
 */
export function SecurityBadges() {
  return (
    <ul
      role="list"
      className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs"
    >
      <li className="flex items-center gap-1.5">
        <ShieldCheck aria-hidden="true" className="size-3.5" />
        <span>Verificado</span>
      </li>
      <li className="flex items-center gap-1.5">
        <Lock aria-hidden="true" className="size-3.5" />
        <span>Encriptado</span>
      </li>
      <li className="flex items-center gap-1.5">
        <FingerprintPattern aria-hidden="true" className="size-3.5" />
        <span>Seguro</span>
      </li>
    </ul>
  );
}
