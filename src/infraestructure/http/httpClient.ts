export type HttpClient = {
  get(url: string, init?: RequestInit): Promise<Response>;
  post(url: string, init?: RequestInit): Promise<Response>;
  put(url: string, init?: RequestInit): Promise<Response>;
  delete(url: string, init?: RequestInit): Promise<Response>;
};

function request(method: string) {
  return async (url: string, init?: RequestInit): Promise<Response> => {
    try {
      return await fetch(url, { ...init, method });
    } catch (cause) {
      throw Object.assign(new Error("HTTP request failed", { cause }), {
        name: "HttpRequestFailed",
      });
    }
  };
}

/**
 * Thin `fetch` wrapper. Never inspects the status code — non-2xx responses
 * resolve normally; only a network failure throws.
 *
 * @throws {Error} name `HttpRequestFailed` — network failure only.
 */
export function createHttpClient(): HttpClient {
  return {
    get: request("GET"),
    post: request("POST"),
    put: request("PUT"),
    delete: request("DELETE"),
  };
}
