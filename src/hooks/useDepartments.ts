import { useEffect, useState } from 'react';
import { listDepartments } from '../api/geo';
import { describeError } from '../api/http';
import type { Department } from '../api/types';

export interface DepartmentsState {
  list: Department[];
  error: string | null;
}

export function useDepartments(): DepartmentsState {
  const [state, setState] = useState<DepartmentsState>({ list: [], error: null });

  useEffect(() => {
    let active = true;
    listDepartments()
      .then((list) => {
        if (active) setState({ list, error: null });
      })
      .catch((error: unknown) => {
        if (active) setState({ list: [], error: describeError(error) });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
