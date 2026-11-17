import type { ReactNode } from 'react';

interface PageHeadProps {
  code: string;
  kicker: string;
  title: string;
  children?: ReactNode;
}

export function PageHead({ code, kicker, title, children }: PageHeadProps) {
  return (
    <header className="page-head">
      <span className="page-head__code" aria-hidden="true">
        {code}
      </span>
      <p className="kicker">{kicker}</p>
      <h1>{title}</h1>
      {children && <p className="lead">{children}</p>}
    </header>
  );
}
