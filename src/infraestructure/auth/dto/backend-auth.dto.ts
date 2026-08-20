import { z } from "zod";

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
