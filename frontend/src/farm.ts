/* The farmer's own farm code: from a personal SMS link (#/soil?farm=A; saved on this device), else the remembered one.
   Shared by every farmer-facing screen, so the code is asked once. */

const KEY = "qatra.farm";

export function getFarmCode(): string | null {
  const fromLink = new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("farm");
  if (fromLink) {
    const code = fromLink.trim().toUpperCase();
    saveFarmCode(code); // a personal link is an identification: ask only once across all screens
    return code;
  }
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
