import { useCallback, useEffect, useState } from "react";

// Tab state lives in the URL hash ("#/soil"), so reloads and deep links keep the tab.
// No router: just hashchange. Unknown or empty hashes fall back to `fallback`.
function parse(hash: string, ids: string[], fallback: string): string {
  const id = hash.replace(/^#\/?/, "").split(/[/?]/)[0];
  return ids.includes(id) ? id : fallback;
}

export function useHashTab(ids: string[], fallback: string): [string, (id: string) => void] {
  const [active, setActive] = useState(() => parse(window.location.hash, ids, fallback));

  useEffect(() => {
    const onHash = () => setActive(parse(window.location.hash, ids, fallback));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [ids, fallback]);

  const select = useCallback((id: string) => {
    const role = new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("role"); // the demo role follows the tab
    window.location.hash = `/${id}${role ? `?role=${encodeURIComponent(role)}` : ""}`; // fires hashchange, which updates state
  }, []);

  return [active, select];
}
