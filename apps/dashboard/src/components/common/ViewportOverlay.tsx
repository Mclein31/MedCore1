import React from 'react';
import { createPortal } from 'react-dom';

interface ViewportOverlayProps {
  children: React.ReactNode;
  className?: string;
  backdropClassName?: string;
  motion?: 'rise' | 'right' | 'fade';
  layer?: 'modal' | 'nested' | 'processing' | 'confirmation';
  onDismiss?: () => void;
}

// The viewport/scrim never transforms. Only the foreground child animates.
// Body portals also escape transformed page/checkout ancestors and sticky headers.
export function ViewportOverlay({ children, className = 'flex items-center justify-center p-4',
  backdropClassName = 'bg-slate-900/50 backdrop-blur-xs', motion = 'rise', layer = 'modal', onDismiss
}: ViewportOverlayProps) {
  if (typeof document === 'undefined') return null;
  const zIndex = { modal: 1000, nested: 1100, processing: 1200, confirmation: 9999 }[layer];
  return createPortal(
    <div className="viewport-overlay no-print" data-overlay-root data-overlay-layer={layer} style={{ zIndex }}
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
