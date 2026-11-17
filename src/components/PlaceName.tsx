import { useEffect, useState } from 'react';
import { findCity, listDepartments } from '../api/geo';
import type { Place } from '../api/types';

interface Names {
  city: string;
  department: string;
}

/** Orders only stores ids; names are looked up in API Colombia and fall back to the ids. */
export function PlaceName({ place }: { place: Place }) {
  const [names, setNames] = useState<Names | null>(null);

  useEffect(() => {
    let active = true;
    setNames(null);
    Promise.all([findCity(place.cityId), listDepartments()])
      .then(([city, departments]) => {
        if (!active) return;
        setNames({
          city: city?.name ?? `Municipio ${place.cityId}`,
          department: departments.find((d) => d.id === place.departmentId)?.name ?? `Departamento ${place.departmentId}`,
        });
      })
      .catch(() => {
        // API Colombia unreachable: the ids below are still shown.
      });
    return () => {
      active = false;
    };
  }, [place.cityId, place.departmentId]);

  return (
    <span className="place-name">
      <strong>{names?.city ?? `Municipio ${place.cityId}`}</strong>
      <span>{names?.department ?? `Departamento ${place.departmentId}`}</span>
      <code>
        dep {place.departmentId} · mun {place.cityId}
      </code>
    </span>
  );
}
