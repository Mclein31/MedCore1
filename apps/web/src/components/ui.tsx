import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  forwardRef,
  type ComponentType,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white font-semibold shadow-xs hover:bg-brand-800 disabled:bg-brand-600/50',
  secondary:
    'bg-white text-slate-700 font-semibold border border-line shadow-xs hover:bg-slate-50 disabled:text-subtle',
  danger: 'bg-rose-600 text-white font-semibold shadow-xs hover:bg-rose-700 disabled:bg-rose-600/50',
  ghost: 'text-brand-800 font-medium hover:bg-brand-100 disabled:text-subtle',
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean; size?: 'sm' | 'md' }
>(function Button(
  { variant = 'primary', busy, size = 'md', className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cx(
        'press inline-flex items-center justify-center gap-2 rounded-lg transition-colors disabled:cursor-not-allowed',
        size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
      {children}
    </button>
  );
});

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  /** Receives the props to spread on the control: id plus the ARIA wiring for hint and error. */
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: true }) => ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass =
  'h-10 w-full rounded-lg border border-control bg-white px-3 text-sm text-ink placeholder:text-subtle transition-colors focus:border-brand-600 aria-[invalid=true]:border-rose-600 disabled:border-line disabled:bg-elevated';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cx(inputClass, className)} {...rest} />;
});

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(inputClass, 'pr-8', className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(inputClass, 'h-auto min-h-24 py-2', className)} {...rest} />;
}

export function Card({
  title,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx('rounded-2xl border border-line bg-surface', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle px-5 py-4">
          {title && <h2 className="text-[15px] font-semibold text-ink">{title}</h2>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

type Tone = 'neutral' | 'brand' | 'good' | 'warn' | 'bad' | 'info';
// The v1 status badge: tinted pill with a colored dot.
const TONES: Record<Tone, { pill: string; dot: string }> = {
  neutral: { pill: 'bg-elevated text-muted', dot: 'bg-muted' },
  brand: { pill: 'bg-brand-100 text-brand-800', dot: 'bg-brand-600' },
  good: { pill: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-700' },
  warn: { pill: 'bg-amber-50 text-amber-700', dot: 'bg-amber-700' },
  bad: { pill: 'bg-rose-50 text-rose-700', dot: 'bg-rose-700' },
  info: { pill: 'bg-blue-50 text-blue-700', dot: 'bg-blue-700' },
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
        TONES[tone].pill,
      )}
    >
      <span aria-hidden className={cx('size-1.5 shrink-0 rounded-full', TONES[tone].dot)} />
      {children}
    </span>
  );
}

export function Alert({
  tone = 'bad',
  children,
}: {
  tone?: 'bad' | 'good' | 'info' | 'warn';
  children: ReactNode;
}) {
  const Icon = tone === 'good' ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={tone === 'bad' ? 'alert' : 'status'}
      className={cx(
        'flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm',
        tone === 'bad' && 'border-rose-200 bg-rose-50 text-rose-800',
        tone === 'good' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
        tone === 'info' && 'border-blue-200 bg-blue-50 text-blue-800',
        tone === 'warn' && 'border-amber-200 bg-amber-50 text-amber-900',
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-10 text-sm text-subtle justify-center">
      <Loader2 aria-hidden className="size-4 animate-spin" />
      {label}…
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {children && <div className="mt-1 text-sm text-subtle">{children}</div>}
    </div>
  );
}

/** Native <dialog>: focus trapping, Escape to close and inert background come from the browser. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="dialog-title"
      className={cx(
        'm-auto w-[calc(100%-2rem)] rounded-2xl border border-line bg-white p-0 text-ink shadow-xl',
        wide ? 'max-w-2xl' : 'max-w-md',
      )}
    >
      {open && (
        <div className="p-6">
          <h2 id="dialog-title" className="text-lg font-bold tracking-tight">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          <div className="mt-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}

/** The v1 "priority action" tile: icon, arrow, a large value and a label. */
export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'ink',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  tone?: 'ink' | 'warn' | 'bad';
}) {
  return (
    <div className="priority-action flex min-h-[110px] min-w-0 flex-col rounded-2xl border border-line bg-surface p-4">
      {Icon && <Icon aria-hidden className="size-4 text-subtle" />}
      <p
        className={cx(
          'tabular mt-auto pt-3 text-lg font-semibold tracking-tight [overflow-wrap:anywhere]',
          tone === 'warn' ? 'text-amber-700' : tone === 'bad' ? 'text-rose-700' : 'text-ink',
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-subtle">{hint}</p>}
    </div>
  );
}

export function Table({
  head,
  children,
  caption,
}: {
  head: ReactNode[];
  children: ReactNode;
  caption?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-line text-[11px] tracking-wide text-muted uppercase">
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-3 py-2.5 font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line-subtle [&_tr:hover]:bg-[#f5f9fb]">{children}</tbody>
      </table>
    </div>
  );
}

/** v1 page heading: small eyebrow, large title, and pill-shaped primary actions on the right. */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs text-muted">{eyebrow}</p>}
        <h1 className="mt-0.5 text-[2rem] leading-tight font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap gap-2 [&_button]:h-10 [&_button]:rounded-full [&_button]:px-5">
          {actions}
        </div>
      )}
    </div>
  );
}
