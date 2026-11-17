import { useEffect, useId, useState } from 'react';
import { listCities } from '../api/geo';
import { describeError } from '../api/http';
import type { City, Department, Place } from '../api/types';

export interface PlaceValue {
  departmentId: number | null;
  cityId: number | null;
  /** Typing raw API Colombia ids makes it possible to try a municipality that does not exist. */
  manual: boolean;
}

export const EMPTY_PLACE: PlaceValue = { departmentId: null, cityId: null, manual: false };

export function toPlace(value: PlaceValue): Place | null {
  return value.departmentId && value.cityId ? { departmentId: value.departmentId, cityId: value.cityId } : null;
}

function toId(raw: string): number | null {
  const value = Number(raw);
  return raw !== '' && Number.isInteger(value) && value > 0 ? value : null;
}

interface PlacePickerProps {
  code: string;
  legend: string;
  value: PlaceValue;
  onChange: (next: PlaceValue) => void;
  departments: Department[];
  departmentsError: string | null;
}

export function PlacePicker({ code, legend, value, onChange, departments, departmentsError }: PlacePickerProps) {
  const id = useId();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCities([]);
    setError(null);
    if (value.manual || value.departmentId === null) {
      return;
    }
    let active = true;
    setLoading(true);
    listCities(value.departmentId)
      .then((list) => {
        if (active) setCities(list);
      })
      .catch((reason: unknown) => {
        if (active) setError(describeError(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [value.departmentId, value.manual]);

  const departmentPlaceholder = departmentsError
    ? 'Catálogo no disponible'
    : departments.length
      ? 'Elige un departamento'
      : 'Consultando API Colombia…';
  const cityPlaceholder =
    value.departmentId === null ? 'Primero el departamento' : loading ? 'Cargando municipios…' : 'Elige un municipio';

  return (
    <fieldset className="cell place">
      <legend className="cell__label">
        <span className="cell__code">{code}</span>
        {legend}
      </legend>

      {value.manual ? (
        <div className="grid-2">
          <label className="field" htmlFor={`${id}-dep`}>
            <span className="field__label">ID departamento</span>
            <input
              id={`${id}-dep`}
              className="input input--mono"
              inputMode="numeric"
              placeholder="ej. 2"
              value={value.departmentId ?? ''}
              onChange={(e) => onChange({ ...value, departmentId: toId(e.target.value.trim()) })}
            />
          </label>
          <label className="field" htmlFor={`${id}-city`}>
            <span className="field__label">ID municipio</span>
            <input
              id={`${id}-city`}
              className="input input--mono"
              inputMode="numeric"
              placeholder="ej. 999999"
              value={value.cityId ?? ''}
              onChange={(e) => onChange({ ...value, cityId: toId(e.target.value.trim()) })}
            />
          </label>
        </div>
      ) : (
        <div className="grid-2">
          <label className="field" htmlFor={`${id}-dep`}>
            <span className="field__label">Departamento</span>
            <select
              id={`${id}-dep`}
              className="input"
              value={value.departmentId ?? ''}
              disabled={departments.length === 0}
              onChange={(e) => onChange({ ...value, departmentId: toId(e.target.value), cityId: null })}
            >
              <option value="">{departmentPlaceholder}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field" htmlFor={`${id}-city`}>
            <span className="field__label">Municipio</span>
            <select
              id={`${id}-city`}
              className="input"
              value={value.cityId ?? ''}
              disabled={cities.length === 0}
              onChange={(e) => onChange({ ...value, cityId: toId(e.target.value) })}
            >
              <option value="">{cityPlaceholder}</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {!value.manual && (departmentsError || error) && <p className="field-error">{error ?? departmentsError}</p>}

      <label className="check">
        <input
          type="checkbox"
          checked={value.manual}
          onChange={(e) => onChange({ departmentId: null, cityId: null, manual: e.target.checked })}
        />
        Escribir los IDs de API Colombia a mano
      </label>
    </fieldset>
  );
}
