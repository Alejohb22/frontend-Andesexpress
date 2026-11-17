import type { ReactNode } from 'react';

interface SlipProps {
  tone: 'error' | 'info';
  title: string;
  children?: ReactNode;
}

/** A small paper slip clipped to the form: errors and side notes. */
export function Slip({ tone, title, children }: SlipProps) {
  return (
    <div className={`slip slip--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <strong className="slip__title">{title}</strong>
      {children && <div className="slip__body">{children}</div>}
    </div>
  );
}
