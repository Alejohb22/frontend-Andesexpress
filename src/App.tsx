import { Masthead } from './components/Masthead';
import { DispatchPage } from './features/dispatch/DispatchPage';
import { NetworkPage } from './features/network/NetworkPage';
import { QuotePage } from './features/quote/QuotePage';
import { TrackPage } from './features/track/TrackPage';
import { useHashRoute, type RouteName } from './hooks/useHashRoute';

const TABS: { route: RouteName; code: string; label: string }[] = [
  { route: 'despachar', code: '01', label: 'Despachar' },
  { route: 'rastrear', code: '02', label: 'Rastrear' },
  { route: 'cotizar', code: '03', label: 'Cotizar' },
  { route: 'red', code: '04', label: 'Red' },
];

export function App() {
  const route = useHashRoute();

  return (
    <div className="shell">
      <Masthead />
      <nav className="tabs" aria-label="Secciones">
        {TABS.map((tab) => (
          <a
            key={tab.route}
            className="tab"
            href={`#/${tab.route}`}
            aria-current={route.name === tab.route ? 'page' : undefined}
          >
            <span className="tab__code">{tab.code}</span>
            {tab.label}
          </a>
        ))}
      </nav>
      <main className="sheet">
        {route.name === 'despachar' && <DispatchPage />}
        {route.name === 'rastrear' && <TrackPage orderId={route.param} />}
        {route.name === 'cotizar' && <QuotePage />}
        {route.name === 'red' && <NetworkPage />}
      </main>
      <footer className="colophon">
        <span>Original · cliente</span>
        <span>Copia · mensajero</span>
        <span>Los IDs vienen de API Colombia, no son códigos DANE</span>
      </footer>
    </div>
  );
}
