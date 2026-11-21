import { API_BASE_URL, USE_MOCKS } from "../config";

type Method = "GET" | "POST" | "PATCH";

// All JSON files in src/mocks, loaded lazily so they are not bundled unless used.
const mocks = import.meta.glob<{ default: unknown }>("../mocks/*.json");

/** Segments that are followed by an id in the API paths (e.g. /api/batches/{id}). */
const ID_PARENTS = new Set(["batches", "farms", "requests"]);

/**
 * Maps a request to a mock file name:
 *   GET  /api/batches/SSUD-20260708/risk  -> batches_id_risk.json
 *   GET  /api/farms/C/compatibility?x=1   -> farms_id_compatibility.json
 *   POST /api/allocate                    -> post_allocate.json
 */
export function mockName(method: Method, path: string): string {
  const segs = path.split("?")[0].replace(/^\/?api\/?/, "").split("/").filter(Boolean);
  const named = segs.map((s, i) => (i > 0 && ID_PARENTS.has(segs[i - 1]) ? "id" : s));
  const prefix = method === "GET" ? "" : `${method.toLowerCase()}_`;
  return `${prefix}${named.join("_")}.json`;
}

async function fromMock<T>(method: Method, path: string): Promise<T> {
  const name = mockName(method, path);
  const load = mocks[`../mocks/${name}`];
  if (!load) throw new Error(`No mock file src/mocks/${name} for ${method} ${path}`);
  return (await load()).default as T;
}

export async function api<T>(path: string, method: Method = "GET", body?: unknown): Promise<T> {
  if (USE_MOCKS) return fromMock<T>(method, path);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export const get = <T>(path: string) => api<T>(path, "GET");
export const post = <T>(path: string, body?: unknown) => api<T>(path, "POST", body);
export const patch = <T>(path: string, body?: unknown) => api<T>(path, "PATCH", body);
