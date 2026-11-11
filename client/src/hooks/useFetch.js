import { useCallback, useEffect, useRef, useState } from 'react';

/** Tiny data-fetching hook: { data, meta, loading, error, reload, setData } */
export default function useFetch(fn, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, meta: null, loading: enabled, error: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);

  const run = useCallback(async (silent = false) => {
    const id = ++seq.current;
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fnRef.current();
      if (id === seq.current) setState({ data: res.data, meta: res.meta || null, loading: false, error: null });
    } catch (e) {
      if (id === seq.current) setState((s) => ({ ...s, loading: false, error: e.message }));
    }
  }, []);

  useEffect(() => {
    if (enabled) run();
    return () => { seq.current++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);

  return { ...state, reload: () => run(true), refetch: () => run(false), setData: (data) => setState((s) => ({ ...s, data })) };
}

export function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
