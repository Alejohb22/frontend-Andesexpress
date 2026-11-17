const today = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());

/** Silhouette of a mountain range with the route running underneath. */
function Ridge() {
  return (
    <svg className="ridge" viewBox="0 0 600 40" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points="0,38 38,31 66,34 104,15 128,23 158,6 186,19 214,12 252,28 292,20 322,32 362,9 392,24 432,16 470,30 512,21 552,33 600,27"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
      <line x1="0" y1="39" x2="600" y2="39" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
      <circle className="ridge__pin" cx="362" cy="9" r="3.5" />
    </svg>
  );
}

export function Masthead() {
  return (
    <header className="masthead">
      <div>
        <p className="brand">
          <span className="brand__heavy">Andes</span>
          <span className="brand__narrow">Express</span>
        </p>
        <Ridge />
      </div>
      <dl className="masthead__meta">
        <div>
          <dt>Mostrador</dt>
          <dd>Despacho · última milla</dd>
        </div>
        <div>
          <dt>Cobertura</dt>
          <dd>Colombia · API Colombia</dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd>{today}</dd>
        </div>
      </dl>
    </header>
  );
}
