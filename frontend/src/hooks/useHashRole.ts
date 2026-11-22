import { useCallback, useEffect, useState } from "react";
import { ROLE_IDS, type RoleId } from "../roles";

// The demo role lives in the URL hash next to the tab: "#/batches?role=onas". Other params (?farm=, ?view=) are kept.
// A link that drops the param does not reset the role: the hook puts it back.
const split = (hash: string): [string, URLSearchParams] => {
  const [path, query = ""] = hash.replace(/^#/, "").split("?");
  return [path, new URLSearchParams(query)];
};

const read = (): RoleId | null => {
  const r = split(window.location.hash)[1].get("role");
  return r && ROLE_IDS.includes(r) ? (r as RoleId) : null;
};

const write = (role: RoleId | null, replace: boolean, tab?: string) => {
  const [pathNow, q] = split(window.location.hash);
  const path = tab ? `/${tab}` : pathNow;
  if (role) q.set("role", role);
  else q.delete("role");
  const qs = q.toString();
  const hash = `#${path || "/"}${qs ? `?${qs}` : ""}`;
  if (hash === window.location.hash) return;
  if (replace) window.history.replaceState(null, "", hash);
  else window.location.hash = hash.slice(1);
};

export function useHashRole(): [RoleId | null, (r: RoleId | null, tab?: string) => void] {
  const [role, setRole] = useState<RoleId | null>(read);

  useEffect(() => {
    const onHash = () => {
      const fromUrl = read();
      if (fromUrl) setRole(fromUrl);
      else if (split(window.location.hash)[1].has("role")) setRole(null); // ?role= with an unknown value
      else setRole((r) => {
        if (r) write(r, true); // a link without the param: keep the role and restore it in the URL
        return r;
      });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  /** Choose a role (null = all sections). `tab`: open that tab at the same time. */
  const choose = useCallback((r: RoleId | null, tab?: string) => {
    setRole(r);
    write(r, false, tab);
  }, []);
  return [role, choose];
}
