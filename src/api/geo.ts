import { ApiError, request } from './http';
import type { City, Department } from './types';

interface RawDepartment {
  id: number;
  name: string;
}

interface RawCity {
  id: number;
  name: string;
  departmentId?: number;
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'es');

let departments: Promise<Department[]> | null = null;
const citiesByDepartment = new Map<number, Promise<City[]>>();
const cityById = new Map<number, Promise<City | null>>();

/** Keeps successful lookups; a failed one is forgotten so the next call retries. */
function remember<K, V>(cache: Map<K, Promise<V>>, key: K, load: () => Promise<V>): Promise<V> {
  const existing = cache.get(key);
  if (existing) {
    return existing;
  }
  const pending = load();
  cache.set(key, pending);
  pending.catch(() => cache.delete(key));
  return pending;
}

export function listDepartments(): Promise<Department[]> {
  if (!departments) {
    const pending = request<RawDepartment[]>('geo', '/Department').then((list) =>
      list.map(({ id, name }) => ({ id, name })).sort(byName),
    );
    pending.catch(() => {
      departments = null;
    });
    departments = pending;
  }
  return departments;
}

export function listCities(departmentId: number): Promise<City[]> {
  return remember(citiesByDepartment, departmentId, () =>
    request<RawCity[]>('geo', `/Department/${departmentId}/cities`).then((list) =>
      list.map((c) => ({ id: c.id, name: c.name, departmentId: c.departmentId ?? departmentId })).sort(byName),
    ),
  );
}

/** Resolves to null when API Colombia says the municipality does not exist. */
export function findCity(cityId: number): Promise<City | null> {
  return remember(cityById, cityId, () =>
    request<RawCity>('geo', `/City/${cityId}`)
      .then((c): City => ({ id: c.id, name: c.name, departmentId: c.departmentId ?? 0 }))
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }
        throw error;
      }),
  );
}
