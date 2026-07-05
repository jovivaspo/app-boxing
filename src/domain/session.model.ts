import type { User } from "@/domain/user.model";

export interface Session {
  token: string; // opaque backend JWT
  user: User;
}
