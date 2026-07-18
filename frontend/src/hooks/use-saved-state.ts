"use client";

import { useEffect, useState } from "react";

export function useSavedState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(key);
      if (storedValue) {
        setValue(JSON.parse(storedValue) as T);
      }
    } catch {
      // Ignore local storage parse errors and fall back to defaults.
    } finally {
      setHasHydrated(true);
    }
  }, [key]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore local storage write failures in restricted environments.
    }
  }, [hasHydrated, key, value]);

  return [value, setValue, hasHydrated] as const;
}
