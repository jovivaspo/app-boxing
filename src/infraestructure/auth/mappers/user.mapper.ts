import type { User } from "@/domain/user.model";
import type { Session } from "@/domain/session.model";
import type { BackendAuthResponseDto } from "@/infraestructure/auth/dto/backend-auth.dto";

export function toUser(dto: BackendAuthResponseDto["user"]): User {
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    role: dto.role,
    pictureUrl: dto.pictureUrl ?? null,
    createdAt: dto.createdAt,
  };
}

export function toSession(dto: BackendAuthResponseDto): Session {
  return {
    token: dto.token,
    user: toUser(dto.user),
  };
}
