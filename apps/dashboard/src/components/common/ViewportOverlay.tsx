import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ViewportOverlayProps {
  children: React.ReactNode;
  className?: string;
  backdropClassName?: string;
  motion?: 'rise' | 'right' | 'fade';
  layer?: 'modal' | 'nested' | 'processing' | 'confirmation';
  onDismiss?: () => void;
  dialogLabel?: string;
}

// The viewport/scrim never transforms. Only the foreground child animates.
// Body portals also escape transformed page/checkout ancestors and sticky headers.
export function ViewportOverlay({ children, className = 'flex items-center justify-center p-4',
  backdropClassName = 'bg-slate-900/50 backdrop-blur-xs', motion = 'rise', layer = 'modal', onDismiss, dialogLabel
}: ViewportOverlayProps) {
  const root = useRef<HTMLDivElement>(null);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useEffect(() => {
    if (!dialogLabel || !root.current) return;
    const panel = root.current;
    const previous = document.activeElement as HTMLElement | null;
    const top = () => {
      const overlays = [...document.querySelectorAll<HTMLElement>('[data-overlay-root]')]
        .sort((a, b) => Number(a.style.zIndex) - Number(b.style.zIndex));
      return overlays[overlays.length - 1];
    };
    const controls = () => [...panel.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')]
      .filter(element => element.getClientRects().length > 0);
    const frame = requestAnimationFrame(() => { if (top() === panel) (controls()[0] || panel).focus(); });
    const keyboard = (event: KeyboardEvent) => {
      if (top() !== panel || event.defaultPrevented) return;
      if (event.key === 'Escape' && dismiss.current) { event.preventDefault(); dismiss.current(); }
      if (event.key !== 'Tab') return;
      const items = controls(), first = items[0], last = items[items.length - 1];
      if (!first) { event.preventDefault(); panel.focus(); return; }
      if (!panel.contains(document.activeElement) || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault(); (event.shiftKey ? last : first)?.focus();
      }
    };
    document.addEventListener('keydown', keyboard);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', keyboard);
      queueMicrotask(() => {
        const activeOverlay = top();
        if (previous?.isConnected && (!activeOverlay || activeOverlay.contains(previous))) previous.focus();
      });
    };
  }, [dialogLabel]);
  if (typeof document === 'undefined') return null;
  const zIndex = { modal: 1000, nested: 1100, processing: 1200, confirmation: 9999 }[layer];
  return createPortal(
    <div ref={root} className="viewport-overlay no-print" data-overlay-root data-overlay-layer={layer} style={{ zIndex }} role={dialogLabel ? 'dialog' : undefined} aria-modal={dialogLabel ? true : undefined} aria-label={dialogLabel} tabIndex={dialogLabel ? -1 : undefined}
      onClick={event => {
        // A nested portal must not dismiss the dialog that launched it.
        event.stopPropagation();
        const target = event.target as HTMLElement;
        if (target === event.currentTarget || target.hasAttribute('data-overlay-backdrop') || target.hasAttribute('data-overlay-stage')) onDismiss?.();
      }}>
      <div data-overlay-backdrop aria-hidden="true" className={`viewport-overlay-backdrop ${backdropClassName}`} />
      <div data-overlay-stage data-overlay-motion={motion} className={`viewport-overlay-stage ${className}`}>
        {children}
      </div>
    </div>, document.body
  );
}
