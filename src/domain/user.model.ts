export interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  role: Role;
  picture: string | null;
}

export type Role = "admin" | "user";
