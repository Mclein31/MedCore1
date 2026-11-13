import type { NavRoute } from '@/v1/types/navigation';

/*
 * Loading placeholders that reuse the settled layout's own frames (classes, paddings,
 * card borders), so nothing moves when data replaces them. Bones use the existing
 * neutral tokens: slate-200 on the app canvas, slate-100 inside white cards — the same
 * pair the original page fallback and the AI briefing skeleton already used. Only the
 * bones pulse (Tailwind's existing animate-pulse, which reduced motion already stops);
 * card frames stay still.
 */

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/** A solid placeholder block. */
export function Bone({ className = '', card = false }: { className?: string; card?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cx('block rounded-md animate-pulse', card ? 'bg-slate-100' : 'bg-slate-200', className)}
    />
  );
}

/**
 * A placeholder for one line of text. `className` carries the real text classes
 * (size, line-height, margins) so the line box is exactly as tall as the real one.
 */
export function TextBone({
  className = '',
  width,
  card = false,
}: {
  className?: string;
  width: string;
  card?: boolean;
}) {
  return (
    <span aria-hidden="true" className={cx('block', className)}>
      <span
        className={cx(
          'inline-block h-[0.7em] rounded align-middle animate-pulse',
          card ? 'bg-slate-100' : 'bg-slate-200',
        )}
        style={{ width }}
      />
      {'​'}
    </span>
  );
}

/** Screen-reader announcement shared by every skeleton. */
function Busy({ label }: { label: string }) {
  return <span className="sr-only">{label}</span>;
}

const NAV_GROUPS = [4, 2, 6];

/** Mirrors SidebarNav: three labelled groups of 40px links plus the utility bar. */
function SidebarSkeleton() {
  return (
    <aside
      aria-hidden="true"
      className="workspace-sidebar h-full bg-white border-r border-slate-200 flex flex-col justify-between z-20 shrink-0 w-64 max-[900px]:w-14"
    >
      <div className="p-2 space-y-3 overflow-hidden">
        {NAV_GROUPS.map((count, group) => (
          <div key={group} className="space-y-1">
            <div className="px-3 pt-4 pb-2 max-[900px]:hidden">
              <TextBone className="text-[11px]" width={group === 2 ? '7.5rem' : '6rem'} />
            </div>
            {Array.from({ length: count }, (_, i) => (
              <div
                key={i}
                className="sidebar-link w-full h-10 flex items-center gap-3 px-3 py-2 max-[900px]:w-10 max-[900px]:mx-auto max-[900px]:justify-center max-[900px]:px-0"
              >
                <Bone className="w-4.5 h-4.5 shrink-0 rounded" />
                <TextBone
                  className="text-xs flex-1 max-[900px]:hidden"
                  width={`${58 + ((i * 17 + group * 11) % 32)}%`}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-slate-200 shrink-0">
        <div className="flex items-center justify-between px-1 py-1 h-[1.75rem]">
          <TextBone className="text-[10px] max-[900px]:hidden" width="7.5rem" />
        </div>
      </div>
    </aside>
  );
}

/** Mirrors GlobalCommandBar: brand on the left, search in the middle, bell and account on the right. */
function ToolbarSkeleton() {
  return (
    <header
      aria-hidden="true"
      className="workspace-toolbar no-print h-12 border-b border-slate-200 bg-white px-3 sm:px-4 grid grid-cols-[auto_minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,1fr)_minmax(160px,640px)_minmax(0,1fr)] items-center gap-3 z-30 shadow-2xs"
    >
      <div className="flex items-center gap-2 shrink-0">
        <img
          src="/logo/MedCore_Badge_Logo.png"
          alt=""
          width={380}
          height={356}
          decoding="async"
          className="h-7 w-auto"
        />
        <div className="space-y-1">
          <Bone card className="h-3.5 w-24" />
          <Bone card className="h-2.5 w-40 hidden lg:block" />
        </div>
      </div>
      <div className="min-w-0 w-full max-w-2xl justify-self-center">
        <Bone card className="h-8 w-full rounded-lg" />
      </div>
      <div className="flex items-center justify-self-end gap-2">
        <Bone card className="h-9 w-9 rounded-lg" />
        <div className="flex items-center gap-2 px-2 py-1">
          <Bone card className="h-7 w-7 rounded-full" />
          <span className="hidden sm:block space-y-1">
            <Bone card className="h-3 w-24" />
            <Bone card className="h-2.5 w-28" />
          </span>
        </div>
      </div>
    </header>
  );
}

/**
 * The whole workspace frame (toolbar, sidebar, page) shown before the session is known,
 * instead of three different full-screen loaders in a row.
 */
export function WorkspaceShellSkeleton({ label = 'Opening MedCore' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className="workspace-shell h-screen w-full overflow-hidden bg-slate-100 text-slate-900 flex flex-col font-sans antialiased"
    >
      <Busy label={`${label}…`} />
      <ToolbarSkeleton />
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <SidebarSkeleton />
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <OverviewSkeleton />
        </main>
      </div>
    </div>
  );
}

function CardHeaderBones({ wide = false }: { wide?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Bone card className="w-7 h-7 rounded-lg" />
        <TextBone card className="text-sm" width={wide ? '10rem' : '8rem'} />
      </div>
      <Bone card className="h-5 w-24 rounded-full" />
    </div>
  );
}

/** Mirrors CommandCenterPage (Overview): heading, priority strip, briefing header, scorecards, queues. */
export function OverviewSkeleton() {
  return (
    <div aria-hidden="true" className="operations-page flex-1 flex flex-col h-full min-h-0 overflow-hidden">
      <div className="operations-heading">
        <div className="min-w-0">
          <TextBone className="text-xs" width="7.5rem" />
          <TextBone className="mt-1 text-2xl sm:text-3xl" width="9rem" />
          <TextBone className="mt-2 text-sm" width="20rem" />
        </div>
        <Bone className="h-11 w-40 rounded-full" />
      </div>
      <div className="operations-content flex-1 min-h-0 overflow-hidden">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="priority-action">
              <div className="flex items-center justify-between gap-2">
                <Bone card className="w-4 h-4 rounded" />
                <Bone card className="w-3.5 h-3.5 rounded" />
              </div>
              <TextBone card className="mt-3 text-base" width="6.5rem" />
              <TextBone card className="mt-1 text-xs" width="7rem" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-3">
              <Bone card className="w-8 h-8 rounded-lg shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <TextBone card className="text-sm" width="22rem" />
                  <Bone card className="h-[20.6px] w-28 rounded-full" />
                </div>
                <TextBone card className="text-xs mt-0.5" width="30rem" />
              </div>
            </div>
            <Bone card className="h-8 w-20 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="operations-card bg-white p-5 rounded-2xl border border-slate-200 space-y-4 flex flex-col justify-between"
            >
              <div>
                <CardHeaderBones />
                <div className="mt-3">
                  <TextBone card className="operations-metric" width="9rem" />
                  <TextBone card className="text-xs mt-0.5" width="8rem" />
                </div>
                {i === 0 ? (
                  // Census card: occupancy bar.
                  <Bone card className="w-full h-2 mt-3 rounded-full" />
                ) : (
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 mt-2">
                    <TextBone card width="7rem" />
                    <TextBone card width="6rem" />
                  </div>
                )}
              </div>
              <div className="h-8 pt-2 border-t border-slate-100 flex items-center justify-center">
                <TextBone card className="text-xs" width="11rem" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="operations-card bg-white rounded-2xl border border-slate-200 p-5 space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex flex-wrap gap-2 items-center justify-between pb-2 border-b border-slate-100">
                  <TextBone card className="text-sm" width="15rem" />
                  <Bone card className="h-[22px] w-32 rounded-full" />
                </div>
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((row) => (
                    <div key={row} className="queue-row p-3 flex items-center justify-between gap-3">
                      <div>
                        <TextBone card className="text-sm min-h-[32px] leading-[32px]" width="9rem" />
                        <TextBone card className="text-[11px] mt-0.5" width="8rem" />
                      </div>
                      <Bone card className="h-8 w-28 rounded-lg" />
                    </div>
                  ))}
                </div>
              </div>
              <Bone card className="h-8 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
      {/* Docked VelocityRecoveryPulse footer. */}
      <footer className="min-h-12 py-2 border-t border-slate-200 bg-slate-50 px-6 flex items-center justify-between z-10 shrink-0 text-xs">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          {['20rem', '13rem', '11rem', '19.5rem', '17rem'].map((width) => (
            <TextBone key={width} width={width} />
          ))}
        </div>
      </footer>
    </div>
  );
}

/** Mirrors the shared operations page frame (heading + content panels) for the other workspaces. */
export function OperationsPageSkeleton() {
  return (
    <div aria-hidden="true" className="operations-page flex-1 flex flex-col h-full min-h-0 overflow-hidden">
      <div className="operations-heading">
        <div className="min-w-0">
          <TextBone className="text-xs" width="7.5rem" />
          <TextBone className="mt-1 text-2xl sm:text-3xl" width="16rem" />
          <TextBone className="mt-2 text-sm" width="24rem" />
        </div>
      </div>
      <div className="operations-content flex-1 min-h-0 overflow-hidden">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Bone key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Bone className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}

/** The page placeholder for a workspace route while its code or census is loading. */
export function RouteSkeleton({ route }: { route: NavRoute }) {
  return (
    <>
      <Busy label="Loading workspace…" />
      {route === 'COMMAND_CENTER' ? <OverviewSkeleton /> : <OperationsPageSkeleton />}
    </>
  );
}
