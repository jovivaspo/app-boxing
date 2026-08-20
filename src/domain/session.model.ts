import type { User } from "@/domain/user.model";

export interface Session {
  token: string;
  user: User;
}
