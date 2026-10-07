import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { QR_PATTERNS, qrPath } from '../src/lib/qrPatterns';

if (process.platform !== 'darwin') throw new Error('This independent decoding check requires macOS Vision. Run it on macOS; the general suite checks QR geometry on every platform.');
const folder = mkdtempSync(join(tmpdir(), 'medcore-qr-'));
const paths: string[] = [];
const expected: string[] = [];
for (const [rail, pattern] of Object.entries(QR_PATTERNS)) {
  // Rasterize the exact geometry used by PaymentQr, without interpolation.
  const modules = [...qrPath(pattern.rows).matchAll(/M(\d+) (\d+)h1v1h-1z/g)].map(match => [Number(match[1]), Number(match[2])]);
  for (const size of [135, 180, 225, 270]) {
    const scale = size / pattern.rows.length;
    const stride = Math.ceil(size * 3 / 4) * 4;
    const bmp = Buffer.alloc(54 + stride * size, 255);
    bmp.write('BM'); bmp.writeUInt32LE(bmp.length, 2); bmp.writeUInt32LE(0, 6); bmp.writeUInt32LE(54, 10);
    bmp.writeUInt32LE(40, 14); bmp.writeInt32LE(size, 18); bmp.writeInt32LE(size, 22);
    bmp.writeUInt16LE(1, 26); bmp.writeUInt16LE(24, 28); bmp.writeUInt32LE(0, 30); bmp.writeUInt32LE(stride * size, 34);
    bmp.fill(0, 38, 54);
    for (const [x, y] of modules) for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const offset = 54 + (size - 1 - (y * scale + dy)) * stride + (x * scale + dx) * 3;
      bmp.fill(0, offset, offset + 3);
    }
    const path = join(folder, `${rail}-${size}.bmp`); writeFileSync(path, bmp);
    paths.push(path); expected.push(pattern.payload);
  }
}
const result = spawnSync('swift', ['-module-cache-path', join(folder, 'swift-cache'), resolve('__tests__/verifyQr.swift'), ...paths], { encoding: 'utf8', timeout: 60000 });
assert.equal(result.status, 0, result.stderr || String(result.error));
assert.deepEqual(result.stdout.trim().split('\n'), expected);
console.log(`[PASS] Independent QR decoding: ${paths.length} rendered patterns (135, 180, 225, 270px); existing payloads preserved.`);
