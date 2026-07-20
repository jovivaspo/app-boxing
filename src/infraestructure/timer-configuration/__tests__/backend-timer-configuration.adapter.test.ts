import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createBackendTimerConfigurationAdapter } from "../backend-timer-configuration.adapter";

const BACKEND_URL = "http://backend.test";
const BASE_PATH = `${BACKEND_URL}/api/v1/timer-configurations`;

const validDto = {
  id: "config-1",
  name: "Amateur bout",
  rounds: 4,
  roundDuration: 120,
  restDuration: 60,
  warnBeforeEnd: true,
  bellSound: false,
};

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

describe("createBackendTimerConfigurationAdapter", () => {
  beforeEach(() => {
    vi.stubEnv("BACKEND_URL", BACKEND_URL);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("should throw when BACKEND_URL is not configured", () => {
    vi.stubEnv("BACKEND_URL", "");

    expect(() => createBackendTimerConfigurationAdapter()).toThrow();
  });

  it("should POST the config to the base path and resolve with the mapped configuration", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(validDto, true, 201) as Response
    );
    const adapter = createBackendTimerConfigurationAdapter();
    const { id: _id, ...configWithoutId } = validDto;

    const result = await adapter.create(configWithoutId);

    expect(fetch).toHaveBeenCalledWith(BASE_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(configWithoutId),
    });
    expect(result).toEqual(validDto);
  });

  it("should GET the base path and resolve with the mapped configuration list", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([validDto]) as Response);
    const adapter = createBackendTimerConfigurationAdapter();

    const result = await adapter.list();

    expect(fetch).toHaveBeenCalledWith(BASE_PATH, { method: "GET" });
    expect(result).toEqual([validDto]);
  });

  it("should PUT the config to /{id} and resolve with the mapped configuration", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(validDto) as Response);
    const adapter = createBackendTimerConfigurationAdapter();

    const result = await adapter.update(validDto);

    expect(fetch).toHaveBeenCalledWith(`${BASE_PATH}/${validDto.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validDto),
    });
    expect(result).toEqual(validDto);
  });

  it("should reject with timerConfigurationNotFound when update receives a 404", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({}, false, 404) as Response
    );
    const adapter = createBackendTimerConfigurationAdapter();

    await expect(adapter.update(validDto)).rejects.toMatchObject({
      _tag: "TimerConfigurationNotFound",
    });
  });

  it("should DELETE /{id} and resolve with no value", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(undefined, true, 204) as Response
    );
    const adapter = createBackendTimerConfigurationAdapter();

    const result = await adapter.delete(validDto.id);

    expect(fetch).toHaveBeenCalledWith(`${BASE_PATH}/${validDto.id}`, {
      method: "DELETE",
    });
    expect(result).toBeUndefined();
  });

  it("should reject with timerConfigurationNotFound when delete receives a 404", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({}, false, 404) as Response
    );
    const adapter = createBackendTimerConfigurationAdapter();

    await expect(adapter.delete(validDto.id)).rejects.toMatchObject({
      _tag: "TimerConfigurationNotFound",
    });
  });

  describe("generic failure handling (D6 — no domain error, plain Error)", () => {
    const { id: _id, ...configWithoutId } = validDto;

    const operations = {
      create: () =>
        createBackendTimerConfigurationAdapter().create(configWithoutId),
      list: () => createBackendTimerConfigurationAdapter().list(),
      update: () => createBackendTimerConfigurationAdapter().update(validDto),
      delete: () =>
        createBackendTimerConfigurationAdapter().delete(validDto.id),
    } as const;

    function rows(...names: (keyof typeof operations)[]) {
      return names.map((name) => [name, operations[name]] as const);
    }

    async function expectGenericError(run: () => Promise<unknown>) {
      let caught: unknown;
      try {
        await run();
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(Error);
      expect((caught as { _tag?: unknown })._tag).toBeUndefined();
    }

    it.each(rows("create", "list", "update", "delete"))(
      "should reject %s with a generic Error when fetch rejects (network failure)",
      async (_name, run) => {
        vi.mocked(fetch).mockRejectedValue(new Error("network down"));

        await expectGenericError(run);
      }
    );

    it.each(rows("create", "list", "update", "delete"))(
      "should reject %s with a generic Error on a non-404 non-2xx status",
      async (_name, run) => {
        vi.mocked(fetch).mockResolvedValue(
          jsonResponse({}, false, 500) as Response
        );

        await expectGenericError(run);
      }
    );

    // delete has no response body, so it can't hit a JSON-parse failure.
    it.each(rows("create", "list", "update"))(
      "should reject %s with a generic Error when the response body is not valid JSON",
      async (_name, run) => {
        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => {
            throw new Error("invalid json");
          },
        } as unknown as Response);

        await expectGenericError(run);
      }
    );

    // delete has no response body to validate; list validates an array shape
    // (different mock body), so it gets its own case right below instead of
    // sharing this table's single-object mock.
    it.each(rows("create", "update"))(
      "should reject %s with a generic Error when the response fails DTO validation",
      async (_name, run) => {
        vi.mocked(fetch).mockResolvedValue(
          jsonResponse({ id: "config-1" }) as Response
        );

        await expectGenericError(run);
      }
    );

    it("should reject list with a generic Error when the response fails DTO validation", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse([{ id: "config-1" }]) as Response
      );

      await expectGenericError(operations.list);
    });
  });
});
