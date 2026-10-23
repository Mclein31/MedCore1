// Dashboard clips for script V4. Each clip maps to a scene in script/MEDCORE_SCRIPT_V4.md.
// setup() runs off-camera; run() is recorded. Use ui.click for every on-camera click (cursor + SFX log).
// Close any open modal (the app's overlays close from their first header button, not Escape).
async function closeOverlay(ui) {
  const root = ui.page.locator('[data-overlay-root]');
  for (let i = 0; i < 3 && (await root.count()); i++) {
    await root.last().getByRole('button', { name: 'Close', exact: true }).last().click().catch(() => {});
    await ui.pause(500);
  }
}

export const CLIPS = [
  {
    name: 'dash-overview',
    purpose: 'S4 hero + S10 AI executive briefing',
    async setup(ui) { await ui.nav('Overview').click(); },
    async run(ui) {
      await ui.pause(800);
      await ui.shot('01-overview');
      await ui.page.getByText(/^Updated:/).first().waitFor({ timeout: 90000 });
      const expand = ui.page.getByRole('button', { name: /Refresh/ }).first().locator('xpath=following-sibling::button[1]');
      await ui.click(expand);
      await ui.pause(2600);
      await ui.shot('01b-overview-briefing');
      await ui.page.mouse.move(900, 600);
      await ui.scroll(380);
      await ui.pause(2000);
    },
  },
  {
    name: 'dash-ledger',
    purpose: 'S5 Pain 1: statutory deduction waterfall',
    async setup(ui) { await ui.nav('Encounters & Ledgers').click(); },
    async run(ui) {
      const search = ui.page.getByRole('combobox', { name: 'Universal search' });
      await ui.click(search);
      await search.pressSequentially('Grace Reyes', { delay: 70 });
      await ui.pause(700);
      await ui.click(ui.page.getByRole('option').filter({ hasText: 'Grace Reyes' }).first());
      await ui.pause(1400);
      await ui.click(ui.tab('Itemized Charges & Waterfall'));
      await ui.pause(900);
      // Walk the cursor along the formula: gross → PhilHealth → HMO → net due.
      for (const t of [/^Gross/, /^PhilHealth/, /^HMO/]) {
        await ui.moveTo(ui.page.getByText(t).filter({ hasText: '₱' }).first(), { ms: 420 });
        await ui.pause(500);
      }
      await ui.pause(1200);
      await ui.shot('03-ledger-waterfall');
      await ui.page.mouse.move(1000, 700);
      await ui.scroll(300);
      await ui.pause(1600);
    },
  },
  {
    name: 'dash-hmo',
    purpose: 'S6 Pain 2: one roster for every HMO LOA',
    async setup(ui) { await ui.nav('Approvals & Disputes').click(); },
    async run(ui) {
      await ui.pause(600);
      await ui.click(ui.tab('HMO Gateway Roster'));
      await ui.pause(1600);
      await ui.shot('04-hmo-roster');
      await ui.scroll(300);
      await ui.pause(1200);
    },
  },
  {
    name: 'dash-appeal',
    purpose: 'S6 Pain 2: AI-drafted HMO appeal for staff review',
    async setup(ui) { await ui.nav('Approvals & Disputes').click(); await ui.tab('Disputes & Promissory').click(); },
    async run(ui) {
      await ui.pause(800);
      await ui.click(ui.page.getByRole('button', { name: 'Draft Appeal', exact: true }).first());
      await ui.page.getByText(/Letterhead Preview/i).first().waitFor({ timeout: 90000 });
      await ui.pause(1500);
      await ui.shot('04c-ai-appeal');
      await ui.scroll(320);
      await ui.pause(1500);
    },
    tail: 800,
  },
  {
    name: 'dash-claims',
    purpose: 'S7 Pain 3: ClaimReady AI pre-flight scrub',
    async setup(ui) { await closeOverlay(ui); await ui.nav('Claims & eSOA XML').click(); },
    async run(ui) {
      await ui.pause(900);
      await ui.shot('05-claims');
      await ui.click(ui.page.getByRole('button', { name: 'AI Scrub', exact: true }).first());
      await ui.page.getByRole('heading', { name: /Clinical Forensic Scrubber/i }).waitFor({ timeout: 30000 });
      await ui.page.waitForFunction(() => !/Auditing CF4 narratives/.test(document.body.innerText), null, { timeout: 90000 }).catch(() => {});
      await ui.pause(1500);
      await ui.shot('05b-claims-ai-findings');
      await ui.page.mouse.move(900, 600);
      await ui.scroll(360);
      await ui.pause(1500);
    },
  },
  {
    name: 'dash-clearance',
    purpose: 'S8 Pain 4: six-stage discharge pipeline',
    async setup(ui) { await closeOverlay(ui); await ui.nav('Discharge Clearance').click(); },
    async run(ui) {
      await ui.pause(1000);
      await ui.shot('02-discharge-clearance');
      await ui.click(ui.tab('6-Stage Pipeline'));
      await ui.pause(2500);
      await ui.shot('02b-six-stage-pipeline');
      await ui.click(ui.tab('Master / Detail Queue'));
      await ui.pause(800);
      await ui.click(ui.page.locator('text=Grace Reyes >> visible=true').first());
      await ui.pause(2200);
      await ui.shot('02c-clearance-blocker');
    },
  },
  {
    name: 'dash-analytics',
    purpose: 'S10 leaders: RCM analytics',
    async setup(ui) {
      await ui.nav('RCM Analytics').click();
      await ui.page.waitForFunction(() => !document.querySelector('.animate-pulse'), null, { timeout: 90000 }).catch(() => {});
    },
    async run(ui) {
      await ui.pause(1200);
      await ui.shot('06-rcm-analytics');
      await ui.page.mouse.move(900, 600);
      await ui.scroll(700, 60);
      await ui.pause(1200);
      await ui.shot('06b-rcm-analytics-scroll');
      await ui.scroll(700, 60);
      await ui.pause(1200);
    },
  },
];
