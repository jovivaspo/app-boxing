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
