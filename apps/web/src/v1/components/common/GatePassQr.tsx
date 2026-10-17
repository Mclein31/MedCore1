import { gatePassMatrix, gatePassQrSize } from '@/v1/shared/gatePassQr';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

export default function GatePassQr({ payload }: { payload: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(268);
  const matrix = useMemo(() => gatePassMatrix(payload), [payload]);
  useLayoutEffect(() => {
    const measure = () => {
      if (frame.current) setAvailable(frame.current.clientWidth - 24);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    if (frame.current) observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  const size = gatePassQrSize(matrix.size, available);
  return (
    <div
      ref={frame}
      className="mx-auto flex w-full max-w-[294px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-3"
    >
      <svg
        role="img"
        aria-label="Hospital-signed discharge gate pass QR"
        width={size}
        height={size}
        viewBox={`0 0 ${matrix.size} ${matrix.size}`}
        shapeRendering="crispEdges"
      >
        <rect width={matrix.size} height={matrix.size} fill="#fff" />
        <path d={matrix.path} fill="#000" />
      </svg>
    </div>
  );
}
