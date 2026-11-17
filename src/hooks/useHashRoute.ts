import { useEffect, useState } from 'react';

export type RouteName = 'despachar' | 'rastrear' | 'cotizar' | 'red';

export interface Route {
  name: RouteName;
  param?: string;
}

const ROUTES: RouteName[] = ['despachar', 'rastrear', 'cotizar', 'red'];

function parse(hash: string): Route {
  const [name, param] = hash.replace(/^#\/?/, '').split('/');
  if (!ROUTES.includes(name as RouteName)) {
    return { name: 'despachar' };
  }
  return { name: name as RouteName, param: param ? decodeURIComponent(param) : undefined };
}

export function navigate(name: RouteName, param?: string): void {
  window.location.hash = `/${name}${param ? `/${encodeURIComponent(param)}` : ''}`;
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}
