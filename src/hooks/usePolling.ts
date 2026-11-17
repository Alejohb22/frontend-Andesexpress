import { useEffect, useRef } from 'react';

/**
 * Runs `task` every `intervalMs` while `enabled`. The next run is scheduled only after the
 * previous one settles, so a slow backend never gets overlapping requests.
 */
export function usePolling(task: () => unknown, intervalMs: number, enabled: boolean): void {
  const latest = useRef(task);

  useEffect(() => {
    latest.current = task;
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    let timer: number | undefined;

    const tick = async () => {
      try {
        await latest.current();
      } finally {
        if (!cancelled) {
          timer = window.setTimeout(tick, intervalMs);
        }
      }
    };

    timer = window.setTimeout(tick, intervalMs);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [intervalMs, enabled]);
}
