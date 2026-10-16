import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/** Rendered entirely in the browser: secrets (like a TOTP seed) never go to a QR web service. */
export function QrCode({ value, label, size = 192 }: { value: string; label: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { margin: 1, width: size, errorCorrectionLevel: 'M' })
      .then((url) => !cancelled && setSrc(url))
      .catch(() => !cancelled && setSrc(null));
    return () => {
      cancelled = true;
    };
  }, [value, size]);
  return src ? (
    <img
      src={src}
      alt={label}
      width={size}
      height={size}
      className="rounded-lg border border-line bg-white p-2"
    />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="rounded-lg border border-line bg-slate-50"
      aria-hidden
    />
  );
}
