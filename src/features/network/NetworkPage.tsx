import { useCallback, useEffect, useState } from 'react';
import { probe, type ProbeResult } from '../../api/health';
import type { ServiceName } from '../../api/http';
import { PageHead } from '../../components/PageHead';
import { usePolling } from '../../hooks/usePolling';

interface Station {
  service: ServiceName;
  name: string;
  role: string;
  address: string;
  storage: string;
  path: string;
}

const STATIONS: Station[] = [
  {
    service: 'orders',
    name: 'Orders',
    role: 'Recibe pedidos y lleva su ciclo de vida',
    address: 'localhost:8082',
    storage: 'PostgreSQL',
    path: '/actuator/health',
  },
  {
    service: 'coverage',
    name: 'Coverage',
    role: 'Valida la ruta y calcula la tarifa',
    address: 'localhost:8081',
    storage: 'DynamoDB o JSON',
    path: '/actuator/health',
  },
  {
    service: 'notifications',
    name: 'Notifications',
    role: 'Avisa al cliente por correo o webhook',
    address: 'localhost:8033',
    storage: 'DynamoDB',
    path: '/actuator/health',
  },
  {
    service: 'geo',
    name: 'API Colombia',
    role: 'Fuente oficial de departamentos y municipios',
    address: 'api-colombia.com',
    storage: 'Externa, sin SLA',
    path: '/Department/1',
  },
];

const POLL_MS = 10_000;
const HISTORY = 14;
const SLOW_MS = 1_200;

type History = Record<ServiceName, ProbeResult[]>;

const EMPTY_HISTORY: History = { orders: [], coverage: [], notifications: [], geo: [] };

export function NetworkPage() {
  const [history, setHistory] = useState<History>(EMPTY_HISTORY);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    const results = await Promise.all(STATIONS.map((station) => probe(station.service, station.path)));
    setHistory((previous) => {
      const next = { ...previous };
      STATIONS.forEach((station, i) => {
        next[station.service] = [...previous[station.service], results[i]].slice(-HISTORY);
      });
      return next;
    });
    setChecking(false);
  }, []);

  useEffect(() => {
    void check();
  }, [check]);
  usePolling(check, POLL_MS, true);

  return (
    <>
      <PageHead code="04" kicker="Tablero de estaciones" title="Estado de la red">
        Cada servicio corre por separado y puede caerse sin tumbar a los demás. Esta hoja los sondea cada 10 segundos desde tu
        navegador.
      </PageHead>

      <div className="network__bar">
        <button type="button" className="btn btn--small" onClick={() => void check()} disabled={checking}>
          {checking ? 'Sondeando…' : 'Sondear ahora'}
        </button>
      </div>

      <div className="stations">
        {STATIONS.map((station) => (
          <StationCard key={station.service} station={station} samples={history[station.service]} />
        ))}
      </div>

      <section className="topology" aria-label="Recorrido de un pedido entre servicios">
        <p className="kicker">Recorrido de un pedido</p>
        <div className="topology__lane">
          <span className="topology__kind">Síncrono · HTTP</span>
          <ol className="line">
            <li>Navegador</li>
            <li>Orders</li>
            <li>Coverage</li>
            <li>API Colombia</li>
          </ol>
        </div>
        <div className="topology__lane">
          <span className="topology__kind">Asíncrono · cola</span>
          <ol className="line line--async">
            <li>Orders</li>
            <li>SQS</li>
            <li>Notifications</li>
          </ol>
        </div>
        <div className="topology__lane">
          <span className="topology__kind">Asíncrono · guía</span>
          <ol className="line line--async">
            <li>Orders</li>
            <li className="is-pending">Lambda PDF</li>
            <li className="is-pending">S3</li>
          </ol>
        </div>
        <p className="hint">
          Las colas, la Lambda y S3 no se pueden sondear desde el navegador. Las que tienen borde punteado todavía no están
          construidas.
        </p>
      </section>
    </>
  );
}

function StationCard({ station, samples }: { station: Station; samples: ProbeResult[] }) {
  const last = samples.at(-1);
  const lamp = !last ? 'unknown' : !last.up ? 'down' : last.ms > SLOW_MS ? 'slow' : 'up';
  const stateLabel = { unknown: 'Sin datos', down: 'Caído', slow: 'Lento', up: 'En línea' }[lamp];
  const upCount = samples.filter((s) => s.up).length;

  return (
    <article className="station">
      <header className="station__head">
        <div>
          <h2 className="station__name">{station.name}</h2>
          <p className="station__role">{station.role}</p>
        </div>
        <span className={`lamp lamp--${lamp}`} role="img" aria-label={stateLabel} />
      </header>

      <div className="spark" aria-hidden="true">
        {samples.map((sample) => (
          <span
            key={sample.at}
            className={sample.up ? undefined : 'is-down'}
            style={{ height: `${Math.max(6, Math.min(100, (sample.ms / SLOW_MS) * 100))}%` }}
          />
        ))}
      </div>

      <dl className="kv">
        <dt>Estado</dt>
        <dd>{last ? `${stateLabel} · ${last.detail}` : 'Sondeando…'}</dd>
        <dt>Latencia</dt>
        <dd>{last ? `${last.ms} ms` : '—'}</dd>
        <dt>Disponible</dt>
        <dd>{samples.length ? `${upCount}/${samples.length} sondeos` : '—'}</dd>
        <dt>Dirección</dt>
        <dd>{station.address}</dd>
        <dt>Datos</dt>
        <dd>{station.storage}</dd>
      </dl>
    </article>
  );
}
