import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { describeError } from '../../api/http';
import { confirmOrder, getOrder, listNotices } from '../../api/services';
import type { CustomerNotice, Order, OrderStatus } from '../../api/types';
import { Barcode } from '../../components/Barcode';
import { PageHead } from '../../components/PageHead';
import { PlaceName } from '../../components/PlaceName';
import { Slip } from '../../components/Slip';
import { Stamp, type StampTone } from '../../components/Stamp';
import { StatusTrack } from '../../components/StatusTrack';
import { ZoneRuler } from '../../components/ZoneRuler';
import { navigate } from '../../hooks/useHashRoute';
import { usePolling } from '../../hooks/usePolling';
import {
  formatDateTime,
  formatFare,
  NOTICE_LABEL,
  NOTICE_STATUS_LABEL,
  SHIPPING_LABEL,
  shortId,
  ZONE_LABEL,
} from '../../lib/format';
import { readRecentOrders } from '../../lib/recentOrders';

/** States where something is still happening on the server without the user doing anything. */
const MOVING: OrderStatus[] = ['PENDING_VALIDATION', 'CONFIRMED', 'GUIDE_GENERATING'];
const POLL_MS = 3_000;

const NOTICE_TONE: Record<CustomerNotice['status'], StampTone> = { PENDING: 'wait', SENT: 'green', FAILED: 'red' };

export function TrackPage({ orderId }: { orderId?: string }) {
  const [query, setQuery] = useState(orderId ?? '');
  const [order, setOrder] = useState<Order | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notices, setNotices] = useState<CustomerNotice[] | null>(null);
  const [noticesError, setNoticesError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  /**
   * Orders and Notifications are asked independently: if one of them is down, the other
   * answer is still shown. That is the whole point of not sharing a database.
   */
  const load = useCallback(async (id: string, background: boolean) => {
    if (!background) setLoading(true);
    const [orderResult, noticesResult] = await Promise.allSettled([getOrder(id), listNotices(id)]);

    if (orderResult.status === 'fulfilled') {
      setOrder(orderResult.value);
      setOrderError(null);
      setRefreshError(null);
    } else if (background) {
      setRefreshError(describeError(orderResult.reason));
    } else {
      setOrder(null);
      setOrderError(describeError(orderResult.reason));
    }

    if (noticesResult.status === 'fulfilled') {
      setNotices(noticesResult.value);
      setNoticesError(null);
    } else {
      setNoticesError(describeError(noticesResult.reason));
    }

    setCheckedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    setQuery(orderId ?? '');
    setOrder(null);
    setNotices(null);
    setOrderError(null);
    setNoticesError(null);
    setRefreshError(null);
    setConfirmError(null);
    if (orderId) void load(orderId, false);
  }, [orderId, load]);

  const moving = order !== null && MOVING.includes(order.status);
  usePolling(() => (orderId ? load(orderId, true) : undefined), POLL_MS, moving);

  function handleLookup(event: FormEvent) {
    event.preventDefault();
    const id = query.trim();
    if (!id) return;
    if (id === orderId) void load(id, false);
    else navigate('rastrear', id);
  }

  async function handleConfirm(current: Order) {
    setConfirming(true);
    setConfirmError(null);
    try {
      setOrder(await confirmOrder(current.id));
      void load(current.id, true);
    } catch (error) {
      setConfirmError(describeError(error));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <>
      <PageHead code="02" kicker="Consulta de guía" title="Rastrear un pedido">
        El estado se consulta en Orders aunque la guía todavía se esté generando. Mientras haya trabajo en segundo plano, esta
        hoja se actualiza sola.
      </PageHead>

      <form className="lookup" onSubmit={handleLookup} role="search">
        <label className="sr-only" htmlFor="lookup-id">
          Número de guía
        </label>
        <input
          id="lookup-id"
          className="lookup__input"
          placeholder="Pega el id completo del pedido"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          spellCheck={false}
          autoComplete="off"
        />
        <button type="submit" className="btn btn--stamp" disabled={!query.trim() || loading}>
          {loading ? 'Buscando…' : 'Rastrear'}
        </button>
      </form>

      {!orderId && <RecentOrders />}

      {orderId && orderError && !order && (
        <Slip tone="error" title="No se pudo consultar el pedido">
          {orderError}
        </Slip>
      )}

      {order && (
        <div className="track-layout">
          <article className="ticket" aria-label={`Guía ${shortId(order.id)}`}>
            <div className="ticket__head">
              <p className="ticket__no">
                <small>Guía Nº</small>
                {shortId(order.id)}
              </p>
              <div>
                <Barcode value={order.id} />
                <p className="barcode-text">{order.id}</p>
              </div>
            </div>

            <div className="ticket__row">
              <div className="cell route">
                <p className="cell__label">
                  <span className="cell__code">A→B</span>Recorrido
                </p>
                <div className="route__line-up">
                  <PlaceName place={order.origin} />
                  <span className="route__arrow" aria-hidden="true" />
                  <PlaceName place={order.destination} />
                </div>
              </div>
            </div>

            <div className="ticket__row ticket__row--split">
              <div className="cell">
                <p className="cell__label">
                  <span className="cell__code">Z</span>Zona · {order.zone ? ZONE_LABEL[order.zone] : 'sin calcular'}
                </p>
                <ZoneRuler zone={order.zone} />
              </div>
              <div className="cell">
                <p className="cell__label">
                  <span className="cell__code">$</span>Tarifa
                </p>
                <p className="amount">{order.fare ? formatFare(order.fare) : '—'}</p>
              </div>
            </div>

            <div className="ticket__row">
              <div className="cell">
                <p className="cell__label">
                  <span className="cell__code">S</span>Servicio
                </p>
                <p>{order.shippingType ? SHIPPING_LABEL[order.shippingType] : '—'}</p>
              </div>
            </div>

            <div className="ticket__row">
              <div className="cell">
                <p className="cell__label">
                  <span className="cell__code">E</span>Estado
                  {moving && <span className="live-tag">actualizando cada 3 s</span>}
                </p>
                <StatusTrack status={order.status} />
                {refreshError && <p className="field-error">Última actualización falló: {refreshError}</p>}
              </div>
            </div>

            <div className="ticket__row">
              <div className="cell">
                <p className="cell__label">
                  <span className="cell__code">G</span>Guía en PDF
                </p>
                <GuideCell order={order} confirming={confirming} onConfirm={handleConfirm} />
                {confirmError && (
                  <Slip tone="error" title="No se pudo confirmar">
                    {confirmError}
                  </Slip>
                )}
              </div>
            </div>
          </article>

          <aside className="notices" aria-label="Avisos al cliente">
            <div className="notices__head">
              <p className="kicker">Avisos al cliente</p>
              <button type="button" className="btn btn--small" onClick={() => void load(order.id, true)}>
                Actualizar
              </button>
            </div>
            {noticesError ? (
              <Slip tone="error" title="Notifications no responde">
                {noticesError} El pedido se sigue consultando en Orders.
              </Slip>
            ) : notices === null ? (
              <p className="hint">Consultando Notifications…</p>
            ) : notices.length === 0 ? (
              <p className="hint">
                Todavía no hay avisos. Notifications los registra cuando le llega el evento por la cola, así que pueden tardar
                un poco después de confirmar.
              </p>
            ) : (
              <ol className="log">
                {notices.map((notice) => (
                  <li key={notice.id}>
                    <span className="log__type">{NOTICE_LABEL[notice.type]}</span>
                    <Stamp tone={NOTICE_TONE[notice.status]} tilt={-3} small>
                      {NOTICE_STATUS_LABEL[notice.status]}
                    </Stamp>
                    <span className="log__meta">
                      {formatDateTime(notice.createdAt)}
                      {notice.customerEmail ? ` · ${notice.customerEmail}` : ''}
                    </span>
                    {notice.errorMessage && <span className="log__error">{notice.errorMessage}</span>}
                  </li>
                ))}
              </ol>
            )}
            {checkedAt && (
              <p className="notices__foot">
                Consultado {checkedAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

interface GuideCellProps {
  order: Order;
  confirming: boolean;
  onConfirm: (order: Order) => void;
}

function GuideCell({ order, confirming, onConfirm }: GuideCellProps) {
  if (order.guideUrl) {
    return (
      <a className="btn btn--stamp" href={order.guideUrl} target="_blank" rel="noreferrer">
        Descargar guía
      </a>
    );
  }
  switch (order.status) {
    case 'VALIDATED':
      return (
        <div className="stack">
          <p className="hint">El pedido está validado y cotizado. Al confirmar, Orders publica el evento que dispara la guía.</p>
          <button type="button" className="btn btn--stamp" disabled={confirming} onClick={() => onConfirm(order)}>
            {confirming ? 'Confirmando…' : 'Confirmar y generar guía'}
          </button>
        </div>
      );
    case 'CONFIRMED':
    case 'GUIDE_GENERATING':
      return <p className="hint working">La guía se genera de forma asíncrona y queda en S3. Aparecerá aquí apenas esté lista.</p>;
    case 'REJECTED':
      return <p className="hint">Un pedido rechazado no genera guía.</p>;
    default:
      return <p className="hint">Primero hay que validar la cobertura.</p>;
  }
}

function RecentOrders() {
  const [recent] = useState(readRecentOrders);
  if (recent.length === 0) {
    return <p className="hint">Aún no has radicado pedidos desde este navegador. Pega un id arriba para consultarlo.</p>;
  }
  return (
    <section>
      <p className="kicker">Radicados desde este navegador</p>
      <ol className="recent">
        {recent.map((entry) => (
          <li key={entry.id}>
            <a href={`#/rastrear/${encodeURIComponent(entry.id)}`}>
              <span className="recent__id">{shortId(entry.id)}</span>
              <span className="recent__route">{entry.route}</span>
              <span className="recent__date">{formatDateTime(entry.savedAt)}</span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
