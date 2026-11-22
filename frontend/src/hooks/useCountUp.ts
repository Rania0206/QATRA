import { useEffect, useRef, useState } from "react";

/** A whole number that counts from its previous value to `target` (ease-out, ~700 ms). No animation when the reader asked for reduced motion. */
export function useCountUp(target: number, ms = 700): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  const raf = useRef<number | undefined>(undefined);

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const start = from.current;
    if (reduce || start === target) {
      from.current = target;
      setShown(target);
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(start + (target - start) * eased);
      from.current = v;
      setShown(v);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current !== undefined) cancelAnimationFrame(raf.current);
    };
  }, [target, ms]);

  return shown;
}
