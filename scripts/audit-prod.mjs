#!/usr/bin/env node
// Dependency audit gate for what the server and web app actually ship.
//
// `npm audit --omit=dev -w <ws>` over-reports in this monorepo: a package that only the mobile app's
// React Native/Expo tooling or the vite/vitest dev tools install still counts for the api and web,
// because npm decides "dev only" for the whole tree, not per workspace. This gate fails only when an
// advisory at or above the level hits a package in the real production graph of the selected
// workspaces (`npm ls --omit=dev --all`). Everything else is printed as "not shipped" and does not
// fail. If npm's output can't be read, the gate fails instead of passing quietly.
//
// usage: node scripts/audit-prod.mjs [--audit-level=high] [-w <workspace> ...]
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const LEVELS = ['info', 'low', 'moderate', 'high', 'critical'];
const DEFAULT_WORKSPACES = ['@medcore/api', '@medcore/web', '@medcore/domain'];

/** Every package name in an `npm ls --json` tree. */
export function packageNames(tree) {
  const names = new Set();
  const walk = (deps) => {
    for (const [name, node] of Object.entries(deps ?? {})) {
      if (names.has(name) && !node?.dependencies) continue;
      names.add(name);
      walk(node?.dependencies);
    }
  };
  walk(tree?.dependencies);
  return names;
}

/** Split `npm audit --json` vulnerabilities at or above `level` into shipped (fail) and not shipped (report). */
export function classify(vulnerabilities, shipped, level = 'high') {
  const min = LEVELS.indexOf(level);
  if (min < 0) throw new Error(`unknown audit level '${level}'`);
  const fail = [];
  const report = [];
  for (const [name, v] of Object.entries(vulnerabilities ?? {})) {
    if (LEVELS.indexOf(v.severity) < min) continue;
    (shipped.has(name) ? fail : report).push({ name, severity: v.severity, range: v.range });
  }
  return { fail, report };
}

function npmJson(args) {
  // npm ls / npm audit exit non-zero when they find problems; the JSON on stdout is still the answer.
  const r = spawnSync('npm', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  try {
    return JSON.parse(r.stdout);
  } catch {
    throw new Error(
      `could not read the output of 'npm ${args.join(' ')}': ${(r.stderr || '').slice(0, 500)}`,
    );
  }
}

const out = (text) => process.stdout.write(`${text}\n`);

function main(argv) {
  let level = 'high';
  const workspaces = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--audit-level=')) level = argv[i].split('=')[1];
    else if (argv[i] === '-w') workspaces.push(argv[++i]);
  }
  const ws = (workspaces.length ? workspaces : DEFAULT_WORKSPACES).flatMap((w) => ['-w', w]);

  const shipped = packageNames(npmJson(['ls', '--omit=dev', '--all', '--json', ...ws]));
  if (shipped.size === 0) throw new Error('npm ls found no production packages; refusing to pass the audit');
  const audit = npmJson(['audit', '--omit=dev', '--json', ...ws]);
  if (!audit.vulnerabilities)
    throw new Error(`npm audit gave no result: ${JSON.stringify(audit).slice(0, 500)}`);

  const { fail, report } = classify(audit.vulnerabilities, shipped, level);
  const line = (v) => `  ${v.severity.padEnd(8)} ${v.name} (${v.range})`;
  out(`Production packages checked: ${shipped.size} (level: ${level})`);
  if (report.length) {
    out('Not shipped by these workspaces (dev or mobile tooling), reported only:');
    report.forEach((v) => out(line(v)));
  }
  if (fail.length) {
    console.error('Shipped packages with advisories at or above the level:');
    fail.forEach((v) => console.error(line(v)));
    console.error('Run `npm audit -w <workspace>` for details and upgrade them.');
    return 1;
  }
  out('No shipped package has an advisory at or above the level.');
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    console.error(`audit-prod: ${e.message}`);
    process.exitCode = 2;
  }
}
