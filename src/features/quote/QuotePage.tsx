import { useState, type FormEvent } from 'react';
import { describeError } from '../../api/http';
import { validateCoverage } from '../../api/services';
import type { CoverageAnswer } from '../../api/types';
import { PageHead } from '../../components/PageHead';
import { EMPTY_PLACE, PlacePicker, toPlace, type PlaceValue } from '../../components/PlacePicker';
import { Slip } from '../../components/Slip';
import { Stamp } from '../../components/Stamp';
import { ZoneRuler } from '../../components/ZoneRuler';
import { useDepartments } from '../../hooks/useDepartments';
import { formatFare, formatKg, parseKg, ZONE_LABEL } from '../../lib/format';

type Result = { kind: 'idle' } | { kind: 'asking' } | { kind: 'answer'; answer: CoverageAnswer; kg: number } | { kind: 'error'; message: string };

export function QuotePage() {
  const departments = useDepartments();
  const [origin, setOrigin] = useState<PlaceValue>(EMPTY_PLACE);
  const [destination, setDestination] = useState<PlaceValue>(EMPTY_PLACE);
  const [weight, setWeight] = useState('');
  const [result, setResult] = useState<Result>({ kind: 'idle' });

  const originPlace = toPlace(origin);
  const destinationPlace = toPlace(destination);
  const kg = parseKg(weight);
  const canAsk = originPlace !== null && destinationPlace !== null && kg !== null && result.kind !== 'asking';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!originPlace || !destinationPlace || kg === null) return;
    setResult({ kind: 'asking' });
    try {
      const answer = await validateCoverage({ origin: originPlace, destination: destinationPlace, totalWeightKg: kg });
      setResult({ kind: 'answer', answer, kg });
    } catch (error) {
      setResult({ kind: 'error', message: describeError(error) });
    }
  }

  return (
    <>
      <PageHead code="03" kicker="Consulta directa a Coverage" title="Cotizar una ruta">
        Pregunta solo a Coverage, sin crear pedido. La zona sale de comparar departamentos (mismo, vecino o resto del país) y la
        tarifa suma una base por zona más un valor por kilo.
      </PageHead>

      <div className="layout">
        <form className="form" onSubmit={handleSubmit} noValidate>
          <fieldset className="form__body" disabled={result.kind === 'asking'}>
            <PlacePicker
              code="A"
              legend="Origen"
              value={origin}
              onChange={setOrigin}
              departments={departments.list}
              departmentsError={departments.error}
            />
            <PlacePicker
              code="B"
              legend="Destino"
              value={destination}
              onChange={setDestination}
              departments={departments.list}
              departmentsError={departments.error}
            />
            <div className="cell">
              <label className="field quote__weight" htmlFor="quote-weight">
                <span className="cell__label">
                  <span className="cell__code">P</span>Peso total en kilogramos
                </span>
                <input
                  id="quote-weight"
                  className="input input--mono"
                  inputMode="decimal"
                  placeholder="0,0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </label>
            </div>
          </fieldset>
          <div className="form__actions">
            <button type="submit" className="btn btn--stamp" disabled={!canAsk}>
              {result.kind === 'asking' ? 'Consultando…' : 'Cotizar'}
            </button>
          </div>
        </form>

        <aside className="stub" aria-label="Resultado de la cotización">
          <section className="stub__section stub__outcome" aria-live="polite">
            <QuoteResult result={result} />
          </section>
        </aside>
      </div>
    </>
  );
}

function QuoteResult({ result }: { result: Result }) {
  switch (result.kind) {
    case 'idle':
      return (
        <>
          <p className="kicker">Escala de zonas</p>
          <ZoneRuler zone={null} />
          <p className="hint">Completa la ruta y el peso para ver en qué escalón cae.</p>
        </>
      );
    case 'asking':
      return <p className="hint working">Coverage → API Colombia</p>;
    case 'error':
      return (
        <Slip tone="error" title="Coverage no pudo cotizar">
          {result.message}
        </Slip>
      );
    case 'answer': {
      const { answer, kg } = result;
      if (!answer.valid) {
        return (
          <>
            <Stamp tone="red" tilt={-6}>
              Sin cobertura
            </Stamp>
            <p className="outcome__message">{answer.message}</p>
            <p className="barcode-text">{answer.reason}</p>
          </>
        );
      }
      return (
        <>
          <p className="kicker">Zona · {ZONE_LABEL[answer.zone]}</p>
          <ZoneRuler zone={answer.zone} />
          <p className="amount amount--big">{formatFare(answer.fare)}</p>
          <p className="hint">Para {formatKg(kg)}. Al radicar, Orders vuelve a pedirle la tarifa a Coverage.</p>
        </>
      );
    }
  }
}
