import type { Zone } from '../api/types';
import { ZONE_LABEL, ZONES } from '../lib/format';

/** The four fare zones drawn as rising steps: the farther, the higher. */
export function ZoneRuler({ zone }: { zone: Zone | null }) {
  return (
    <ol className="zone-ruler" aria-label="Zona tarifaria">
      {ZONES.map((candidate, index) => {
        const active = candidate === zone;
        return (
          <li key={candidate} className={active ? 'is-active' : undefined} aria-current={active ? 'true' : undefined}>
            <span className="zone-ruler__bar" aria-hidden="true" />
            <span className="zone-ruler__code">Z{index + 1}</span>
            <span className="zone-ruler__label">{ZONE_LABEL[candidate]}</span>
          </li>
        );
      })}
    </ol>
  );
}
