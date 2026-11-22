import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "./api";

export function useFetch<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fn());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []); // fn es estable en cada página (se define con useCallback o a nivel de módulo)

  useEffect(() => { void load(); }, [load]);
  return { data, loading, error, reload: load };
}
