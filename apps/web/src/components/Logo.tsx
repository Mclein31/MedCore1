import badge from '../assets/logo-badge.png';

export function Logo({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src={badge} alt="" aria-hidden width={32} height={30} className="size-8 object-contain" />
      <div className="leading-tight">
        <p className="font-semibold tracking-tight text-ink">MedCore</p>
        {subtitle && <p className="text-xs text-subtle">{subtitle}</p>}
      </div>
    </div>
  );
}
