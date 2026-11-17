import { useMemo } from 'react';

interface Bar {
  x: number;
  width: number;
}

/**
 * Decorative barcode derived from the value: the same id always prints the same bars,
 * so a clerk can tell two guides apart at a glance. It is not a scannable symbology.
 */
function encode(value: string): { bars: Bar[]; width: number } {
  const widths: [number, number][] = [
    [2, 1],
    [1, 1],
  ];
  for (const char of value.replace(/-/g, '')) {
    const code = char.charCodeAt(0);
    widths.push([1 + (code % 3), 1 + ((code >> 2) % 2)]);
    widths.push([1 + ((code >> 3) % 2), 1 + ((code >> 1) % 3)]);
  }
  widths.push([1, 1], [2, 0]);

  const bars: Bar[] = [];
  let x = 0;
  for (const [width, gap] of widths) {
    bars.push({ x, width });
    x += width + gap;
  }
  return { bars, width: x };
}

interface BarcodeProps {
  value: string;
  height?: number;
}

export function Barcode({ value, height = 44 }: BarcodeProps) {
  const { bars, width } = useMemo(() => encode(value), [value]);
  return (
    <svg className="barcode" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" height={height} aria-hidden="true">
      {bars.map((bar) => (
        <rect key={bar.x} x={bar.x} y={0} width={bar.width} height={height} />
      ))}
    </svg>
  );
}
