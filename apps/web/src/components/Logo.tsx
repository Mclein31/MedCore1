export function Logo({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg aria-hidden viewBox="0 0 32 32" className="size-8">
        <rect width="32" height="32" rx="8" fill="#0f766e" />
        <path d="M13 7h6v6h6v6h-6v6h-6v-6H7v-6h6z" fill="#fff" />
      </svg>
      <div className="leading-tight">
        <p className="font-semibold tracking-tight text-ink">MedCore</p>
        {subtitle && <p className="text-xs text-subtle">{subtitle}</p>}
      </div>
    </div>
  );
}
