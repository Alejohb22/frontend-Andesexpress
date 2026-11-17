export type ServiceName = 'orders' | 'coverage' | 'notifications' | 'geo';

const BASE_PATH: Record<ServiceName, string> = {
  orders: '/svc/orders',
  coverage: '/svc/coverage',
  notifications: '/svc/notifications',
  geo: '/svc/geo',
};

export const SERVICE_LABEL: Record<ServiceName, string> = {
  orders: 'Orders',
  coverage: 'Coverage',
  notifications: 'Notifications',
  geo: 'API Colombia',
};

const DEFAULT_TIMEOUT_MS = 15_000;

export function servicePath(service: ServiceName, path: string): string {
  return `${BASE_PATH[service]}${path}`;
}

/** status 0 means the request never got an HTTP answer (network down, timeout). */
export class ApiError extends Error {
  readonly service: ServiceName;
  readonly status: number;

  constructor(service: ServiceName, status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.service = service;
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
  timeoutMs?: number;
}

export async function request<T>(service: ServiceName, path: string, options: RequestOptions = {}): Promise<T> {
  const label = SERVICE_LABEL[service];
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const hasBody = options.body !== undefined;

  let response: Response;
  try {
    response = await fetch(servicePath(service, path), {
      method: options.method ?? 'GET',
      headers: hasBody
        ? { Accept: 'application/json', 'Content-Type': 'application/json' }
        : { Accept: 'application/json' },
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      service,
      0,
      controller.signal.aborted ? `${label} tardó demasiado en responder.` : `${label} no respondió.`,
    );
  } finally {
    window.clearTimeout(timer);
  }

  const text = await response.text();
  if (!response.ok) {
    throw new ApiError(service, response.status, errorMessage(label, response.status, text));
  }
  if (!text) {
    return undefined as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(service, response.status, `${label} devolvió una respuesta que no es JSON.`);
  }
}

export function describeError(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
}

function errorMessage(label: string, status: number, body: string): string {
  const fromBody = readBodyMessage(body);
  if (fromBody) {
    return fromBody;
  }
  // The dev proxy answers an empty 5xx when the backend is not listening.
  if (status >= 500 && body.trim() === '') {
    return `${label} no respondió. Revisa que el servicio esté corriendo.`;
  }
  switch (status) {
    case 400:
      return `${label} rechazó la solicitud por datos inválidos.`;
    case 404:
      return `${label} no encontró lo que buscabas.`;
    case 409:
      return `${label} no permite esa operación en el estado actual.`;
    case 503:
      return `${label} no está disponible en este momento.`;
    default:
      return `${label} respondió HTTP ${status}.`;
  }
}

/** Backends answer either plain text, {"error": "..."} or Spring's default error JSON. */
function readBodyMessage(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed || trimmed.startsWith('<')) {
    return null;
  }
  if (!trimmed.startsWith('{')) {
    return trimmed.length <= 300 ? trimmed : null;
  }
  try {
    const data = JSON.parse(trimmed) as Record<string, unknown>;
    const isSpringDefault = 'timestamp' in data && 'path' in data;
    for (const key of ['message', 'detail', 'error']) {
      const value = data[key];
      if (typeof value === 'string' && value.trim() && !(isSpringDefault && key === 'error')) {
        return value;
      }
    }
    return null;
  } catch {
    return null;
  }
}
