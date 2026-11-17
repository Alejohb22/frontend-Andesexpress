import { servicePath, type ServiceName } from './http';

export interface ProbeResult {
  up: boolean;
  ms: number;
  detail: string;
  at: number;
}

const PROBE_TIMEOUT_MS = 5_000;

/** One round trip to a service; never throws. */
export async function probe(service: ServiceName, path: string): Promise<ProbeResult> {
  const startedAt = performance.now();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  const elapsed = () => Math.round(performance.now() - startedAt);

  try {
    const response = await fetch(servicePath(service, path), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const ms = elapsed();
    const text = await response.text();
    const reported = reportedStatus(text);

    if (response.ok) {
      const up = reported === null || reported === 'UP';
      return { up, ms, detail: reported ?? `HTTP ${response.status}`, at: Date.now() };
    }
    if (response.status >= 500 && text.trim() === '') {
      return { up: false, ms, detail: 'sin respuesta', at: Date.now() };
    }
    return { up: false, ms, detail: reported ? `reporta ${reported}` : `HTTP ${response.status}`, at: Date.now() };
  } catch {
    return {
      up: false,
      ms: elapsed(),
      detail: controller.signal.aborted ? 'tiempo agotado' : 'sin respuesta',
      at: Date.now(),
    };
  } finally {
    window.clearTimeout(timer);
  }
}

/** Spring Actuator answers {"status":"UP"}; other bodies have no status field. */
function reportedStatus(text: string): string | null {
  try {
    const data: unknown = JSON.parse(text);
    if (data && typeof data === 'object' && 'status' in data && typeof data.status === 'string') {
      return data.status;
    }
    return null;
  } catch {
    return null;
  }
}
