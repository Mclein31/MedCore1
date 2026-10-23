// V4 dashboard capture: real UI, visible cursor, click log for SFX, per-clip MP4 + key screenshots.
// Prereqs: local API on 8788 (STAFF_MFA_REQUIRED=false, local fictional DB only) and the web app on 5174.
// Run from repo root:  PLAYWRIGHT_CORE=<path to playwright-core> node docs/media/production/source/capture-dashboard.mjs [--only=name,name]
// Credentials: film.capture@stjude.example.test (local disposable account) with SEED_PASSWORD from the root .env.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { CLIPS } from './dashboard-clips.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const ROOT = resolve('docs/media/production');
const FOOTAGE = join(ROOT, 'footage/dashboard');
const SHOTS = join(ROOT, 'screenshots/dashboard');
const FRAMES = join(process.env.TMPDIR || '/tmp', 'medcore-dash-frames');
const BASE = process.env.DASHBOARD_URL || 'http://localhost:5174';
const EMAIL = process.env.FILM_STAFF_EMAIL || 'film.capture@stjude.example.test';
const PASSWORD = readFileSync('.env', 'utf8').match(/^SEED_PASSWORD=(.*)$/m)[1].trim().replace(/^["']|["']$/g, '');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
await mkdir(FOOTAGE, { recursive: true });
await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await context.addInitScript({ content: await readFile(join(ROOT, 'source/cursor.js'), 'utf8') });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);

// --- recording via CDP screencast (lossless-ish JPEG frames with real timestamps) ---
let frames = [];
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  frames.push({ t: metadata.timestamp, data });
  await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
async function encode(name, startedAt, endedAt) {
  await rm(FRAMES, { recursive: true, force: true });
  await mkdir(FRAMES, { recursive: true });
  const kept = frames.filter((f) => f.t >= startedAt - 0.5);
  if (!kept.length) throw Error('No frames for ' + name);
  const lines = [];
  for (let i = 0; i < kept.length; i++) {
    const file = join(FRAMES, `f${String(i).padStart(5, '0')}.jpg`);
    await writeFile(file, Buffer.from(kept[i].data, 'base64'));
    const from = Math.max(kept[i].t, startedAt);
    const to = i + 1 < kept.length ? kept[i + 1].t : endedAt;
    lines.push(`file '${file}'`, `duration ${Math.max(0.001, to - from).toFixed(4)}`);
  }
  lines.push(`file '${join(FRAMES, `f${String(kept.length - 1).padStart(5, '0')}.jpg`)}'`);
  await writeFile(join(FRAMES, 'list.txt'), lines.join('\n'));
  const out = join(FOOTAGE, name + '.mp4');
  const r = spawnSync(process.env.FFMPEG || 'ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0',
    '-i', join(FRAMES, 'list.txt'), '-vf', 'fps=30,scale=1920:1200:flags=lanczos,format=yuv420p', '-c:v', 'libx264',
    '-preset', 'slow', '-crf', '16', '-movflags', '+faststart', out]);
  if (r.status) throw Error(String(r.stderr));
  return out;
}

// --- cursor helpers exposed to clip definitions ---
let clicks = [];
let clipStart = 0;
const now = () => Date.now() / 1000;
const ui = {
  page,
  pause,
  async moveTo(locator, { ms = 520 } = {}) {
    await locator.scrollIntoViewIfNeeded();
    const b = await locator.boundingBox();
    if (!b) throw Error('No box for ' + locator);
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    await page.evaluate(([x, y, ms]) => window.__filmCursor?.move(x, y, ms), [x, y, ms]);
    await pause(ms + 60);
    return { x, y };
  },
  async click(locator, opts) {
    const { x, y } = await ui.moveTo(locator, opts);
    await page.evaluate(() => window.__filmCursor?.press());
    clicks.push({ t: +(now() - clipStart).toFixed(3), x: Math.round(x), y: Math.round(y) });
    await locator.click();
    await pause(450);
  },
  async scroll(dy, steps = 40) {
    for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await pause(28); }
  },
  async shot(name) { await page.screenshot({ path: join(SHOTS, name + '.png') }); },
  nav: (label) => page.getByRole('complementary', { name: 'Workspace navigation' }).getByRole('button', { name: label }).first(),
  tab: (label) => page.getByRole('tab', { name: label }).first(),
};

// --- sign in (not recorded) ---
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.getByLabel('Work email').fill(EMAIL);
await page.getByLabel('Password').fill(PASSWORD);
await page.getByRole('button', { name: 'Continue' }).click();
await page.waitForURL(/\/staff/);
await pause(2500);

const log = {};
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 });
for (const clip of CLIPS) {
  if (only && !only.includes(clip.name)) continue;
  if (clip.setup) await clip.setup(ui);
  await pause(400);
  frames = []; clicks = []; clipStart = now();
  await page.evaluate(() => window.scrollTo(0, 0));
  await clip.run(ui);
  await pause(clip.tail ?? 1200);
  const end = now();
  const out = await encode(clip.name, clipStart, end);
  log[clip.name] = { file: 'footage/dashboard/' + clip.name + '.mp4', seconds: +(end - clipStart).toFixed(2), clicks, purpose: clip.purpose };
  console.log('Recorded', clip.name, log[clip.name].seconds + 's', clicks.length, 'clicks');
}
await cdp.send('Page.stopScreencast');
const logPath = join(FOOTAGE, 'clicks.json');
let previous = {};
try { previous = JSON.parse(await readFile(logPath, 'utf8')); } catch {}
await writeFile(logPath, JSON.stringify({ ...previous, ...log }, null, 2));
await browser.close();
