import { useCallback } from 'react';

/*
 * Exit motion for elements React removes outright (overlays, toasts). When the element
 * unmounts, an inert, aria-hidden copy is left in its place for ~150 ms and faded out
 * with the Web Animations API, so closing reads as the reverse of opening instead of a
 * cut. The real element is already gone: focus, state and the a11y tree are unaffected.
 * Skipped under reduced motion and wherever WAAPI is unavailable (tests, old browsers).
 */
export type ExitKind = 'overlay-rise' | 'overlay-right' | 'overlay-fade' | 'toast';

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function snapshot(node: HTMLElement) {
  const clone = node.cloneNode(true) as HTMLElement;
  const source = [node, ...node.querySelectorAll<HTMLElement>('*')];
  const copy = [clone, ...clone.querySelectorAll<HTMLElement>('*')];
  const scroll: [HTMLElement, number, number][] = [];
  source.forEach((element, index) => {
    const target = copy[index];
    if (!target) return;
    if (element.scrollTop || element.scrollLeft) scroll.push([target, element.scrollTop, element.scrollLeft]);
    if (element instanceof HTMLCanvasElement && target instanceof HTMLCanvasElement)
      target.getContext('2d')?.drawImage(element, 0, 0);
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)
      (target as HTMLTextAreaElement | HTMLSelectElement).value = element.value;
    if (
      element instanceof HTMLInputElement &&
      target instanceof HTMLInputElement &&
      element.type !== 'file'
    ) {
      target.value = element.value;
      target.checked = element.checked;
    }
  });
  for (const element of copy) {
    element.removeAttribute('id');
    element.removeAttribute('data-overlay-root');
  }
  clone.removeAttribute('role');
  clone.removeAttribute('aria-modal');
  clone.removeAttribute('aria-live');
  clone.setAttribute('aria-hidden', 'true');
  clone.setAttribute('inert', '');
  clone.classList.add('is-exiting');
  clone.style.pointerEvents = 'none';
  return { clone, scroll };
}

function animateOut(clone: HTMLElement, kind: ExitKind): Promise<unknown> {
  const panel = clone.querySelector<HTMLElement>('[data-overlay-stage] > *');
  const backdrop = clone.querySelector<HTMLElement>('[data-overlay-backdrop]');
  const animations: Animation[] = [];
  if (kind === 'overlay-right') {
    if (backdrop)
      animations.push(
        backdrop.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 200,
          easing: EASE_OUT,
          fill: 'forwards',
        }),
      );
    if (panel)
      animations.push(
        panel.animate([{ transform: 'none' }, { transform: 'translateX(100%)' }], {
          duration: 200,
          easing: EASE_DRAWER,
          fill: 'forwards',
        }),
      );
  } else if (kind === 'toast') {
    animations.push(
      clone.animate(
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: 'translateY(0.5rem)' },
        ],
        { duration: 150, easing: EASE_OUT, fill: 'forwards' },
      ),
    );
  } else {
    animations.push(
      clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: EASE_OUT, fill: 'forwards' }),
    );
    if (kind === 'overlay-rise' && panel)
      animations.push(
        panel.animate([{ transform: 'none' }, { transform: 'translateY(8px)' }], {
          duration: 150,
          easing: EASE_OUT,
          fill: 'forwards',
        }),
      );
  }
  return Promise.all(animations.map((animation) => animation.finished));
}

function leave(node: HTMLElement, kind: ExitKind) {
  if (!node.isConnected || typeof node.animate !== 'function' || prefersReducedMotion()) return;
  // Copy now, while the element is still laid out (scroll offsets, field values).
  const { clone, scroll } = snapshot(node);
  queueMicrotask(() => {
    // Still connected: a re-render or a StrictMode effect replay, not a real unmount.
    if (node.isConnected) return;
    document.body.appendChild(clone);
    for (const [element, top, left] of scroll) {
      element.scrollTop = top;
      element.scrollLeft = left;
    }
    void animateOut(clone, kind)
      .catch(() => {})
      .finally(() => clone.remove());
  });
}

/** Callback ref that plays a short exit when the element unmounts. Stable per `kind`. */
export function useExitSnapshotRef<T extends HTMLElement>(kind: ExitKind) {
  return useCallback(
    (node: T | null) => {
      if (!node) return;
      return () => leave(node, kind);
    },
    [kind],
  );
}
