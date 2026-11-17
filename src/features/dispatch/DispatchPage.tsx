import { useState, type FormEvent } from 'react';
import { ApiError, describeError } from '../../api/http';
import { confirmOrder, createOrder } from '../../api/services';
import type { Department, Order, ShippingType } from '../../api/types';
import { Barcode } from '../../components/Barcode';
import { PageHead } from '../../components/PageHead';
import { EMPTY_PLACE, PlacePicker, toPlace, type PlaceValue } from '../../components/PlacePicker';
import { Slip } from '../../components/Slip';
import { Stamp } from '../../components/Stamp';
import { ZoneRuler } from '../../components/ZoneRuler';
import { useDepartments } from '../../hooks/useDepartments';
import { navigate } from '../../hooks/useHashRoute';
import { newKey } from '../../lib/ids';
import {
  formatFare,
  formatKg,
  parseKg,
  SHIPPING_LABEL,
  SHIPPING_TYPES,
  shortId,
  STATUS_LABEL,
} from '../../lib/format';
import { rememberOrder } from '../../lib/recentOrders';

interface ItemDraft {
  key: string;
  name: string;
  weight: string;
}

type Phase =
  | { kind: 'editing' }
  | { kind: 'sending' }
  | { kind: 'refused'; message: string }
  | { kind: 'failed'; message: string }
  | { kind: 'created'; order: Order; confirming: boolean; confirmError: string | null };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const newItem = (): ItemDraft => ({ key: newKey(), name: '', weight: '' });

function departmentName(departments: Department[], value: PlaceValue): string {
  if (value.departmentId === null) return '—';
  return departments.find((d) => d.id === value.departmentId)?.name ?? `Dpto ${value.departmentId}`;
}

export function DispatchPage() {
  const departments = useDepartments();
  const [email, setEmail] = useState('');
  const [origin, setOrigin] = useState<PlaceValue>(EMPTY_PLACE);
  const [destination, setDestination] = useState<PlaceValue>(EMPTY_PLACE);
  const [shippingType, setShippingType] = useState<ShippingType>('STANDARD');
  const [items, setItems] = useState<ItemDraft[]>(() => [newItem()]);
  const [radicado, setRadicado] = useState(newKey);
  const [phase, setPhase] = useState<Phase>({ kind: 'editing' });

  const originPlace = toPlace(origin);
  const destinationPlace = toPlace(destination);
  const weights = items.map((item) => parseKg(item.weight));
  const totalKg = weights.reduce<number>((sum, kg) => sum + (kg ?? 0), 0);
  const itemsValid = items.every((item, i) => item.name.trim() !== '' && weights[i] !== null);
  const locked = phase.kind === 'sending' || phase.kind === 'created';
  const canSend = !locked && EMAIL.test(email.trim()) && originPlace !== null && destinationPlace !== null && itemsValid;

  /**
   * Same radicado means "the same request": Orders answers a repeated key with the order it
   * already has. Once the data changes it is a different request, so it gets a new key.
   */
  function edit<T>(setter: (value: T) => void) {
    return (value: T) => {
      if (phase.kind === 'refused' || phase.kind === 'failed') {
        setRadicado(newKey());
        setPhase({ kind: 'editing' });
      }
      setter(value);
    };
  }

  const updateItem = edit((patch: { key: string } & Partial<ItemDraft>) =>
    setItems((list) => list.map((item) => (item.key === patch.key ? { ...item, ...patch } : item))),
  );
  const addItem = edit(() => setItems((list) => [...list, newItem()]));
  const removeItem = edit((key: string) => setItems((list) => list.filter((item) => item.key !== key)));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSend || !originPlace || !destinationPlace) return;
    setPhase({ kind: 'sending' });
    try {
      const order = await createOrder({
        idempotencyKey: radicado,
        customerEmail: email.trim(),
        origin: originPlace,
        destination: destinationPlace,
        shippingType,
        products: items.map((item, i) => ({ name: item.name.trim(), weightKg: weights[i] ?? 0 })),
      });
      rememberOrder({
        id: order.id,
        savedAt: new Date().toISOString(),
        route: `${departmentName(departments.list, origin)} → ${departmentName(departments.list, destination)}`,
      });
      setPhase({ kind: 'created', order, confirming: false, confirmError: null });
    } catch (error) {
      const message = describeError(error);
      const refused = error instanceof ApiError && error.service === 'orders' && error.status === 400;
      setPhase(refused ? { kind: 'refused', message } : { kind: 'failed', message });
    }
  }

  async function handleConfirm(order: Order) {
    setPhase({ kind: 'created', order, confirming: true, confirmError: null });
    try {
      const confirmed = await confirmOrder(order.id);
      navigate('rastrear', confirmed.id);
    } catch (error) {
      setPhase({ kind: 'created', order, confirming: false, confirmError: describeError(error) });
    }
  }

  function startOver() {
    setOrigin(EMPTY_PLACE);
    setDestination(EMPTY_PLACE);
    setShippingType('STANDARD');
    setItems([newItem()]);
    setRadicado(newKey());
    setPhase({ kind: 'editing' });
  }

  return (
    <>
      <PageHead code="01" kicker="Formulario de despacho" title="Radicar un envío">
        Orders guarda el pedido y le pide a Coverage que valide origen y destino contra API Colombia en el momento. Si el
        municipio no existe, el pedido no se admite.
      </PageHead>

      <div className="layout">
        <form className="form" onSubmit={handleSubmit} noValidate>
          <fieldset className="form__body" disabled={locked}>
            <div className="cell">
              <label className="field" htmlFor="dispatch-email">
                <span className="cell__label">
                  <span className="cell__code">R</span>Remitente · correo para los avisos
                </span>
                <input
                  id="dispatch-email"
                  className="input"
                  type="email"
                  autoComplete="email"
                  placeholder="cliente@correo.com"
                  value={email}
                  onChange={(e) => edit(setEmail)(e.target.value)}
                />
              </label>
            </div>

            <PlacePicker
              code="A"
              legend="Origen · donde se recoge"
              value={origin}
              onChange={edit(setOrigin)}
              departments={departments.list}
              departmentsError={departments.error}
            />
            <PlacePicker
              code="B"
              legend="Destino · donde se entrega"
              value={destination}
              onChange={edit(setDestination)}
              departments={departments.list}
              departmentsError={departments.error}
            />

            <div className="cell">
              <label className="field" htmlFor="dispatch-shipping-type">
                <span className="cell__label">
                  <span className="cell__code">S</span>Servicio · tipo de envío
                </span>
                <select
                  id="dispatch-shipping-type"
                  className="input"
                  value={shippingType}
                  onChange={(e) => edit(setShippingType)(e.target.value as ShippingType)}
                >
                  {SHIPPING_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {SHIPPING_LABEL[type]}
                    </option>
                  ))}
                </select>
              </label>
              <p className="hint">Informativo: la tarifa depende solo de la zona y del peso.</p>
            </div>

            <div className="cell">
              <p className="cell__label">
                <span className="cell__code">C</span>Contenido · piezas del envío
              </p>
              <table className="items">
                <thead>
                  <tr>
                    <th scope="col" className="items__n">
                      Nº
                    </th>
                    <th scope="col">Descripción</th>
                    <th scope="col" className="items__w">
                      Peso (kg)
                    </th>
                    <th scope="col" className="items__x">
                      <span className="sr-only">Quitar</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.key}>
                      <td className="items__n">{String(index + 1).padStart(2, '0')}</td>
                      <td>
                        <input
                          className="input"
                          aria-label={`Descripción de la pieza ${index + 1}`}
                          placeholder="Caja mediana"
                          value={item.name}
                          onChange={(e) => updateItem({ key: item.key, name: e.target.value })}
                        />
                      </td>
                      <td className="items__w">
                        <input
                          className="input input--mono"
                          inputMode="decimal"
                          aria-label={`Peso de la pieza ${index + 1} en kilogramos`}
                          placeholder="0,0"
                          value={item.weight}
                          onChange={(e) => updateItem({ key: item.key, weight: e.target.value })}
                        />
                      </td>
                      <td className="items__x">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => removeItem(item.key)}
                          disabled={items.length === 1}
                          aria-label={`Quitar la pieza ${index + 1}`}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>
                      <button type="button" className="btn btn--small btn--dashed" onClick={() => addItem(undefined)}>
                        + Agregar pieza
                      </button>
                    </td>
                    <td className="items__w items__total">{formatKg(totalKg)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </fieldset>

          <div className="form__actions">
            <button type="submit" className="btn btn--stamp" disabled={!canSend}>
              {phase.kind === 'sending' ? 'Validando con Coverage…' : 'Radicar pedido'}
            </button>
            <span className="hint">Todos los campos son obligatorios.</span>
          </div>
        </form>

        <aside className="stub" aria-label="Talón del radicado">
          <section className="stub__section">
            <p className="kicker">Talón · radicado</p>
            <Barcode value={radicado} />
            <p className="barcode-text">{radicado}</p>
          </section>
          <div className="perf" aria-hidden="true" />
          <section className="stub__section">
            <dl className="kv">
              <dt>Piezas</dt>
              <dd>{items.length}</dd>
              <dt>Peso total</dt>
              <dd>{formatKg(totalKg)}</dd>
              <dt>Servicio</dt>
              <dd>{SHIPPING_LABEL[shippingType]}</dd>
              <dt>Ruta</dt>
              <dd>
                {departmentName(departments.list, origin)} → {departmentName(departments.list, destination)}
              </dd>
            </dl>
          </section>
          <div className="perf" aria-hidden="true" />
          <section className="stub__section stub__outcome" aria-live="polite">
            <Outcome phase={phase} onConfirm={handleConfirm} onRetry={handleSubmit} onStartOver={startOver} />
          </section>
        </aside>
      </div>
    </>
  );
}

interface OutcomeProps {
  phase: Phase;
  onConfirm: (order: Order) => void;
  onRetry: (event: FormEvent) => void;
  onStartOver: () => void;
}

function Outcome({ phase, onConfirm, onRetry, onStartOver }: OutcomeProps) {
  switch (phase.kind) {
    case 'editing':
      return (
        <p className="hint">
          El radicado identifica esta solicitud. Si la envías dos veces sin cambiar nada, Orders devuelve el mismo pedido
          en lugar de crear otro.
        </p>
      );
    case 'sending':
      return <p className="hint working">Orders → Coverage → API Colombia</p>;
    case 'refused':
      return (
        <>
          <Stamp tone="red" tilt={-6}>
            No admitido
          </Stamp>
          <p className="outcome__message">{phase.message}</p>
          <p className="hint">Corrige el origen o el destino. Al editar se genera un radicado nuevo.</p>
        </>
      );
    case 'failed':
      return (
        <>
          <Slip tone="error" title="Sin respuesta">
            {phase.message}
          </Slip>
          <button type="button" className="btn btn--small" onClick={onRetry}>
            Reintentar con el mismo radicado
          </button>
        </>
      );
    case 'created': {
      const { order } = phase;
      const validated = order.status === 'VALIDATED';
      return (
        <>
          <div className="outcome__head">
            <Stamp tone={validated ? 'green' : order.status === 'REJECTED' ? 'red' : 'wait'} tilt={-5}>
              {validated ? 'Admitido' : STATUS_LABEL[order.status]}
            </Stamp>
            <span className="outcome__id">Guía {shortId(order.id)}</span>
          </div>
          <ZoneRuler zone={order.zone} />
          {order.fare && <p className="amount">{formatFare(order.fare)}</p>}
          {phase.confirmError && (
            <Slip tone="error" title="No se pudo confirmar">
              {phase.confirmError}
            </Slip>
          )}
          <div className="stack">
            {validated && (
              <button type="button" className="btn btn--stamp" disabled={phase.confirming} onClick={() => onConfirm(order)}>
                {phase.confirming ? 'Confirmando…' : 'Confirmar y generar guía'}
              </button>
            )}
            <a className="btn btn--small" href={`#/rastrear/${encodeURIComponent(order.id)}`}>
              Ver en rastreo
            </a>
            <button type="button" className="btn btn--small btn--dashed" onClick={onStartOver}>
              Nuevo despacho
            </button>
          </div>
        </>
      );
    }
  }
}
