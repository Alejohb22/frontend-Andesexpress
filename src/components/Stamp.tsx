import type { CSSProperties, ReactNode } from 'react';

export type StampTone = 'red' | 'green' | 'ink' | 'wait';

interface StampProps {
  tone?: StampTone;
  tilt?: number;
  small?: boolean;
  children: ReactNode;
}

export function Stamp({ tone = 'red', tilt = -4, small = false, children }: StampProps) {
  const style = { '--tilt': `${tilt}deg` } as CSSProperties;
  return (
    <span className={`stamp stamp--${tone}${small ? ' stamp--small' : ''}`} style={style}>
      {children}
    </span>
  );
}
