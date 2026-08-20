import {
  backendUnavailable,
  invalidCredentials,
} from "@/domain/errors/auth-errors";
import type { Session } from "@/domain/session.model";
import type { AuthPort } from "@/application/ports/auth.port";
import { backendAuthResponseSchema } from "@/infraestructure/auth/dto/backend-auth.dto";
import { createHttpClient } from "@/infraestructure/http/httpClient";
import { toSession } from "@/infraestructure/auth/mappers/user.mapper";

export function createBackendAuthAdapter(): AuthPort {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    throw backendUnavailable(undefined, "BACKEND_URL is not configured");
  }

  const http = createHttpClient();

  return {
    async exchange(idToken: string): Promise<Session> {
      let response: Response;
      try {
        response = await http.post(`${backendUrl}/api/v1/auth/google`, {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
      } catch (cause) {
        throw backendUnavailable(cause, "Auth backend request failed");
      }

      if (response.status === 401 || response.status === 403) {
        throw invalidCredentials();
      }

      if (!response.ok) {
        throw backendUnavailable(
          undefined,
          `Auth backend responded with status ${response.status}`
        );
      }

      let rawBody: unknown;
      try {
        rawBody = await response.json();
      } catch (cause) {
        throw backendUnavailable(
          cause,
          "Auth backend response is not valid JSON"
        );
      }

      const parsed = backendAuthResponseSchema.safeParse(rawBody);
      if (!parsed.success) {
        throw backendUnavailable(
          undefined,
          "Auth backend response failed validation"
        );
      }

      return toSession(parsed.data);
    },
  };
}
