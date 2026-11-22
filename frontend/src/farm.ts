/* The farmer's own farm code: from a personal SMS link (#/soil?farm=A), else remembered on this device.
   Shared by every farmer-facing screen, so the code is asked once. */

const KEY = "qatra.farm";

export function getFarmCode(): string | null {
  const fromLink = new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("farm");
  if (fromLink) return fromLink.trim().toUpperCase();
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveFarmCode(code: string | null) {
  try {
    if (code) window.localStorage.setItem(KEY, code);
    else window.localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: not critical */
  }
}
