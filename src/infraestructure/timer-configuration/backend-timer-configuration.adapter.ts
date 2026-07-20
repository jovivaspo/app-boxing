import type { z } from "zod";

import { timerConfigurationNotFound } from "@/domain/errors/timer-configuration-errors";
import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type { TimerConfigurationRepositoryPort } from "@/application/ports/timer-configuration-repository.port";
import { timerConfigurationDtoSchema } from "@/infraestructure/timer-configuration/dto/timer-configuration.dto";
import { toTimerConfiguration } from "@/infraestructure/timer-configuration/mappers/timer-configuration.mapper";

/** Issues the request, mapping a network failure to a generic `Error` (D6). */
async function requestJson(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (cause) {
    throw new Error("Timer configuration backend request failed", { cause });
  }
}

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
async function parseBody<T>(
  response: Response,
  schema: z.ZodType<T>
): Promise<T> {
  let rawBody: unknown;
  try {
    rawBody = await response.json();
  } catch (cause) {
    throw new Error("Timer configuration backend response is not valid JSON", {
      cause,
    });
  }

  const parsed = schema.safeParse(rawBody);
  if (!parsed.success) {
    throw new Error("Timer configuration backend response failed validation");
  }
  return parsed.data;
}

/**
 * Creates the `TimerConfigurationRepositoryPort` implementation backed by the
 * real HTTP backend — used for the logged-in path. Reads `BACKEND_URL`
 * (required — no hardcoded fallback) and throws immediately (fail-closed) if
 * it is not configured.
 *
 * Non-404 failures (network error, non-2xx status, non-JSON body, or Zod
 * validation failure) all throw a generic `Error` (D6) — no domain error
 * exists for backend unavailability in this slice.
 */
export function createBackendTimerConfigurationAdapter(): TimerConfigurationRepositoryPort {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    throw new Error("BACKEND_URL is not configured");
  }

  const baseUrl = `${backendUrl}/api/v1/timer-configurations`;

  return {
    async create(
      config: Omit<TimerConfiguration, "id">
    ): Promise<TimerConfiguration> {
      const response = await requestJson(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      ensureOk(response);
      const dto = await parseBody(response, timerConfigurationDtoSchema);
      return toTimerConfiguration(dto);
    },

    async list(): Promise<TimerConfiguration[]> {
      const response = await requestJson(baseUrl, { method: "GET" });
      ensureOk(response);
      const dtos = await parseBody(
        response,
        timerConfigurationDtoSchema.array()
      );
      return dtos.map(toTimerConfiguration);
    },

    async update(config: TimerConfiguration): Promise<TimerConfiguration> {
      const response = await requestJson(`${baseUrl}/${config.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      ensureOk(response, config.id);
      const dto = await parseBody(response, timerConfigurationDtoSchema);
      return toTimerConfiguration(dto);
    },

    async delete(id: string): Promise<void> {
      const response = await requestJson(`${baseUrl}/${id}`, {
        method: "DELETE",
      });
      ensureOk(response, id);
    },
  };
}
