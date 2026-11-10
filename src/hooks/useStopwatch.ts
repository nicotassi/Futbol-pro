import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Cronómetro basado en marcas de tiempo (no se desfasa si el navegador
 * pausa los timers en segundo plano).
 */
export function useStopwatch() {
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startRef = useRef<number | null>(null);
  const baseRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (startRef.current !== null) {
        setElapsedMs(baseRef.current + (Date.now() - startRef.current));
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [running]);

  const start = useCallback(() => {
    startRef.current = Date.now();
    setRunning(true);
  }, []);

  const pause = useCallback(() => {
    if (startRef.current !== null) {
      baseRef.current += Date.now() - startRef.current;
      startRef.current = null;
    }
    setElapsedMs(baseRef.current);
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    startRef.current = null;
    baseRef.current = 0;
    setElapsedMs(0);
    setRunning(false);
  }, []);

  return { running, elapsedSeconds: Math.floor(elapsedMs / 1000), start, pause, reset };
}
