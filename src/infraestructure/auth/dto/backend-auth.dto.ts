import { z } from "zod";

/**
 * Raw shape returned by `POST /api/v1/auth/google`. Validated at the
 * infrastructure boundary only — never leaks past the mapper into the domain.
 */
export const backendAuthResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.string(),
    pictureUrl: z.string().optional(),
    createdAt: z.string(),
  }),
});

export type BackendAuthResponseDto = z.infer<typeof backendAuthResponseSchema>;
