import { MoneyError, parsePesos } from '@medcore/domain';
import { useState } from 'react';
import { Field, Input } from './ui';

/**
 * Peso entry that hands the caller exact centavos (or null while invalid).
 * Parsing is strict: "1,234.50" works, "1.234,50" or "12e3" do not.
 */
export function MoneyInput({
  label,
  hint,
  initialCents,
  onChange,
}: {
  label: string;
  hint?: string;
  initialCents?: number | null;
  onChange: (cents: number | null) => void;
}) {
  const [text, setText] = useState(
    initialCents === null || initialCents === undefined ? '' : (initialCents / 100).toFixed(2),
  );
  const [error, setError] = useState<string | undefined>();
  return (
    <Field label={label} hint={hint ?? 'In pesos, like 1,250.00'} error={error}>
      {(f) => (
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute left-3 top-2.5 text-sm text-subtle">
            ₱
          </span>
          <Input
            {...f}

            inputMode="decimal"
            autoComplete="off"
            className="tabular pl-7"
            value={text}
            onChange={(e) => {
              const value = e.target.value;
              setText(value);
              if (!value.trim()) {
                setError(undefined);
                return onChange(null);
              }
              try {
                onChange(parsePesos(value));
                setError(undefined);
              } catch (err) {
                setError(err instanceof MoneyError ? err.message : 'Enter a valid amount.');
                onChange(null);
              }
            }}
          />
        </div>
      )}
    </Field>
  );
}
