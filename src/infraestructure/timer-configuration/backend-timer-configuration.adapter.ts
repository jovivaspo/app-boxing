import type { z } from "zod";

import { timerConfigurationNotFound } from "@/domain/errors/timer-configuration-errors";
import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type { TimerConfigurationRepositoryPort } from "@/application/ports/timer-configuration-repository.port";
import { timerConfigurationDtoSchema } from "@/infraestructure/timer-configuration/dto/timer-configuration.dto";
import { createHttpClient } from "@/infraestructure/http/httpClient";
import {
  toTimerConfiguration,
  toTimerConfigurationRequestBody,
} from "@/infraestructure/timer-configuration/mappers/timer-configuration.mapper";

/**
 * Fails fast on a non-2xx status. When `notFoundId` is passed, a 404 maps to
 * `timerConfigurationNotFound` (D5); every other non-2xx status throws a
 * generic `Error` (D6).
 */
function ensureOk(response: Response, notFoundId?: string): void {
  if (notFoundId !== undefined && response.status === 404) {
    throw timerConfigurationNotFound(notFoundId);
  }
  if (!response.ok) {
    throw new Error(
      `Timer configuration backend responded with status ${response.status}`
    );
  }
}

/** Parses and validates the JSON body against `schema`, or throws a generic `Error` (D6). */
async function parseDto<T>(
  response: Response,
  schema: z.ZodType<T>
): Promise<T> {
  let body: unknown;
  try {
    body = await response.json();
  } catch (cause) {
    throw new Error("Timer configuration backend response is not valid JSON", {
      cause,
    });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new Error("Timer configuration backend response failed validation");
  }
  return parsed.data;
}

/**
 * Creates the `TimerConfigurationRepositoryPort` implementation backed by the
 * real HTTP backend — used for the logged-in path. Reads `BACKEND_URL`
 * (required — no hardcoded fallback) and throws immediately (fail-closed) if
 * it is not configured. `token` is the session's opaque backend JWT
 * (`Session.token`), sent as a `Bearer` token on every request so the backend
 * can identify whose timer configurations are being read/written.
 *
 * Non-404 failures (network error, non-2xx status, non-JSON body, or Zod
 * validation failure) all throw a plain `Error` with no `_tag` (D6) — no
 * domain error exists for backend unavailability in this slice. Network
 * failures propagate `httpClient`'s generic, adapter-agnostic message
 * (`name: "HttpRequestFailed"`) uncaught; the other three are re-thrown here
 * with a timer-configuration-specific message (intentional asymmetry, D2 —
 * see design.md for the tradeoff).
 */
export function createBackendTimerConfigurationAdapter(
  token: string
): TimerConfigurationRepositoryPort {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    throw new Error("BACKEND_URL is not configured");
  }

  const baseUrl = `${backendUrl}/api/v1/timer-configurations`;
  const authHeader = { Authorization: `Bearer ${token}` };
  const http = createHttpClient();

  return {
    async create(
      config: Omit<TimerConfiguration, "id">
    ): Promise<TimerConfiguration> {
      const response = await http.post(baseUrl, {
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(toTimerConfigurationRequestBody(config)),
      });
      ensureOk(response);
      const dto = await parseDto(response, timerConfigurationDtoSchema);
      return toTimerConfiguration(dto);
    },

    async list(): Promise<TimerConfiguration[]> {
      const response = await http.get(baseUrl, {
        headers: { ...authHeader },
      });
      ensureOk(response);
      const dtos = await parseDto(
        response,
        timerConfigurationDtoSchema.array()
      );
      return dtos.map(toTimerConfiguration);
    },

    async getById(id: string): Promise<TimerConfiguration> {
      const response = await http.get(`${baseUrl}/${id}`, {
        headers: { ...authHeader },
      });
      ensureOk(response, id);
      const dto = await parseDto(response, timerConfigurationDtoSchema);
      return toTimerConfiguration(dto);
    },

    async update(config: TimerConfiguration): Promise<TimerConfiguration> {
      const response = await http.put(`${baseUrl}/${config.id}`, {
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(toTimerConfigurationRequestBody(config)),
      });
      ensureOk(response, config.id);
      const dto = await parseDto(response, timerConfigurationDtoSchema);
      return toTimerConfiguration(dto);
    },

    async delete(id: string): Promise<void> {
      const response = await http.delete(`${baseUrl}/${id}`, {
        headers: { ...authHeader },
      });
      ensureOk(response, id);
    },
  };
}
