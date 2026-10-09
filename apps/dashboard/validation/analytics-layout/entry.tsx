import React from 'react';
import { createRoot } from 'react-dom/client';
import { MedCoreProvider } from '../../src/context/MedCoreContext';
import { RcmAnalyticsPage } from '../../src/pages/RcmAnalyticsPage';

// Layout-only fixture: actual React page and public seed data, no backend calls
// or credentials. Nothing here is included in the production entry point.
window.fetch = async () => new Response(JSON.stringify({ authenticated: false }), {
  status: 200, headers: { 'Content-Type': 'application/json' }
});

const pairs = [
  ['Hospital Multi-Payer Financing Waterfall', 'Accounts Receivable (AR) Aging Profile'],
  ['Department Discharge Turnaround Bottleneck Radar', 'Pre-Flight Claims Scrutiny Pipeline'],
  ['Trapped Capital by Friction Source (Pareto Distribution)', 'Departmental Exception Density & Bed Friction'],
  ['Commercial HMO Carrier Performance Matrix', 'Patient Out-of-Pocket (OOP) 3-Driver Decomposition']
];
const output = document.getElementById('layout-results')!;
const rounding = (value: number) => Math.round(value * 10) / 10;
function measure() {
  const cards = pairs.flat().map(name => {
    const heading = [...document.querySelectorAll('h3')].find(h => h.textContent?.trim() === name);
    const card = heading?.closest<HTMLElement>('.h-full');
    if (!card) return { name, error: 'Missing card' };
    const rect = card.getBoundingClientRect();
    const children = [...card.children].map(child => child.getBoundingClientRect());
    const padding = parseFloat(getComputedStyle(card).paddingBottom);
    const gap = parseFloat(getComputedStyle(card).rowGap) || 0;
    const last = children[children.length - 1];
    const svg = card.querySelector('svg[viewBox^="0 0 600"]');
    const svgBox = svg?.getBoundingClientRect();
    const viewHeight = Number(svg?.getAttribute('viewBox')?.split(' ')[3]);
    return {
      name, top: rounding(rect.top), bottom: rounding(rect.bottom),
      unusedBottom: rounding(rect.bottom - last.bottom - padding - 1),
      sectionHeights: children.map(child => rounding(child.height)),
      largestGap: rounding(Math.max(0, ...children.slice(1).map((child, i) => child.top - children[i].bottom))),
      allowedGap: rounding(gap),
      ...(svg && svgBox ? { viewBox: svg.getAttribute('viewBox'), svgHeight: rounding(svgBox.height), aspectGap: rounding(Math.abs(svgBox.height - viewHeight * svgBox.width / 600)) } : {})
    };
  });
  const desktop = matchMedia('(min-width: 1280px)').matches;
  const errors = cards.flatMap(card => {
    if ('error' in card) return [card.error];
    return [
      ...(card.unusedBottom > 2 ? [`Unused bottom space: ${card.name}`] : []),
      ...(desktop && card.largestGap > card.allowedGap + 2 ? [`Empty section gap: ${card.name}`] : []),
      ...(desktop && card.aspectGap !== undefined && card.aspectGap > 2 ? ['Department chart has nonuniform scale/unused plot height'] : [])
    ];
  });
  for (let index = 0; index < cards.length; index += 2) {
    const a = cards[index], b = cards[index + 1];
    if (desktop && !('error' in a) && !('error' in b) && Math.abs(a.bottom - b.bottom) > 2) errors.push(`Pair misaligned: ${a.name}`);
  }
  const money = [...document.querySelectorAll<HTMLElement>('#medcore-app-root *')].filter(element =>
    element.childElementCount === 0 && /^[+\u2212-]?₱/.test(element.textContent?.trim() || '') &&
    element.getBoundingClientRect().height > 0 && Number(getComputedStyle(element).fontWeight) >= 600
  );
  const moneyFonts = money.map(element => parseFloat(getComputedStyle(element).fontSize));
  if (moneyFonts.some(size => size < 14)) errors.push('Primary money text is too small');
  if (money.some(element => element.scrollWidth > element.clientWidth + 2)) errors.push('Primary amount overflow');
  const names = ['waterfall', 'aging', 'bottleneck', 'claims', 'pareto', 'department', 'carriers', 'oop'];
  output.textContent = JSON.stringify({ viewport: innerWidth, passed: errors.length === 0, errors,
    moneyFontRange: [rounding(Math.min(...moneyFonts)), rounding(Math.max(...moneyFonts))],
    // Compact enough for native accessibility snapshots to retain every card.
    cards: cards.map((card, index) => 'error' in card ? card : [
      names[index], card.unusedBottom, card.sectionHeights, card.largestGap,
      ...(card.viewBox ? [card.viewBox, card.aspectGap] : [])
    ])
  });
}
document.getElementById('measure-layout')!.addEventListener('click', measure);
const plotChanges = new MutationObserver(() => requestAnimationFrame(measure));
plotChanges.observe(document.getElementById('medcore-app-root')!, { subtree: true, attributes: true, attributeFilter: ['viewBox'] });
window.addEventListener('afterprint', () => requestAnimationFrame(measure));
createRoot(document.getElementById('medcore-app-root')!).render(<MedCoreProvider><RcmAnalyticsPage /></MedCoreProvider>);
requestAnimationFrame(() => requestAnimationFrame(measure));
