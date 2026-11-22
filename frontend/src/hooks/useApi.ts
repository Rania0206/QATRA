import { useCallback, useEffect, useRef, useState } from "react";

export interface ApiState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
  reload: () => void;
}

// Runs `fn` on mount, on reload() and whenever `deps` change. Ignores results that arrive after unmount
// or after a newer call started. `fn` is read through a ref, so inline lambdas are fine.
export function useApi<T>(fn: () => Promise<T>, deps: readonly unknown[] = []): ApiState<T> {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const callId = useRef(0);
  const mounted = useRef(true);
  const [state, setState] = useState<Omit<ApiState<T>, "reload">>({
    data: undefined,
    loading: true,
    error: undefined,
  });

  const run = useCallback(() => {
    const id = ++callId.current;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    Promise.resolve()
      .then(() => fnRef.current())
      .then(
        (data) => {
          if (mounted.current && id === callId.current) setState({ data, loading: false, error: undefined });
        },
        (e: unknown) => {
          if (mounted.current && id === callId.current)
            setState({ data: undefined, loading: false, error: e instanceof Error ? e : new Error(String(e)) });
        },
      );
  }, []);

  // `deps` re-runs the call when an input changes (e.g. a selected id); results of older calls are ignored.
  useEffect(() => {
    mounted.current = true;
    run();
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, ...deps]);

  return { ...state, reload: run };
}
