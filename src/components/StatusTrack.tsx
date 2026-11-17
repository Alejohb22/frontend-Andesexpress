import type { OrderStatus } from '../api/types';
import { STATUS_LABEL } from '../lib/format';
import { Stamp } from './Stamp';

const FLOW: OrderStatus[] = ['PENDING_VALIDATION', 'VALIDATED', 'CONFIRMED', 'GUIDE_GENERATING', 'GUIDE_READY'];

const HINT: Partial<Record<OrderStatus, string>> = {
  PENDING_VALIDATION: 'esperando a Coverage',
  VALIDATED: 'falta confirmar',
  CONFIRMED: 'evento publicado',
  GUIDE_GENERATING: 'en segundo plano',
};

const LIVE: OrderStatus[] = ['PENDING_VALIDATION', 'CONFIRMED', 'GUIDE_GENERATING'];

export function StatusTrack({ status }: { status: OrderStatus }) {
  if (status === 'REJECTED') {
    return (
      <div className="track-rejected">
        <Stamp tone="red" tilt={-7}>
          Rechazado
        </Stamp>
        <p>Coverage no reconoció el origen o el destino en API Colombia. El pedido quedó cerrado.</p>
      </div>
    );
  }

  const current = FLOW.indexOf(status);
  return (
    <ol className="track">
      {FLOW.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'todo';
        const live = state === 'current' && LIVE.includes(step);
        return (
          <li
            key={step}
            className={`track__step is-${state}${live ? ' is-live' : ''}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className="track__dot" aria-hidden="true" />
            <span className="track__label">{STATUS_LABEL[step]}</span>
            {state === 'current' && HINT[step] && <span className="track__hint">{HINT[step]}</span>}
          </li>
        );
      })}
    </ol>
  );
}
