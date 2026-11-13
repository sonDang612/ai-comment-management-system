"use client";

import { useEffect, useRef } from "react";

export function useDebouncedCallback<T>(callback: (value: T) => void, delayMs: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return {
    schedule: (value: T) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => callbackRef.current(value), delayMs);
    },
    flush: (value: T) => {
      clearTimeout(timerRef.current);
      callbackRef.current(value);
    },
  };
}
