// Renders the PayShield shield into PWA icons and, when an android/ folder exists, into the Android launcher icons.
import sharp from 'sharp';
import { readFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const mark = readFileSync('public/icon.svg', 'utf8').replace(/<svg[^>]*>/, '').replace('</svg>', '');
const tile = (size, pad) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
     <rect width="64" height="64" fill="#070A10"/>
     <g transform="translate(${pad} ${pad}) scale(${(64 - 2 * pad) / 64})">${mark}</g>
   </svg>`);

await sharp(tile(192, 6)).png().toFile('public/icon-192.png');
await sharp(tile(512, 6)).png().toFile('public/icon-512.png');
await sharp(tile(512, 12)).png().toFile('public/icon-maskable.png');
console.log('PWA icons written');

const res = 'android/app/src/main/res';
if (existsSync(res)) {
  const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [d, s] of Object.entries(sizes)) {
    const dir = join(res, `mipmap-${d}`);
    mkdirSync(dir, { recursive: true });
    for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) await sharp(tile(s, 6)).png().toFile(join(dir, name));
    await sharp(tile(Math.round(s * 2.25), 16)).png().toFile(join(dir, 'ic_launcher_foreground.png'));
  }
  // Drop the default adaptive-icon XML so Android uses our PNGs everywhere.
  rmSync(join(res, 'mipmap-anydpi-v26'), { recursive: true, force: true });
  // Splash: plain dark background with the shield.
  for (const dir of ['drawable', 'drawable-port-xxhdpi', 'drawable-land-xxhdpi']) {
    const p = join(res, dir);
    if (existsSync(join(p, 'splash.png'))) {
      const meta = await sharp(join(p, 'splash.png')).metadata();
      const w = meta.width, h = meta.height, s = Math.round(Math.min(w, h) * 0.28);
      const icon = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 64 64">${mark}</svg>`)).png().toBuffer();
      await sharp({ create: { width: w, height: h, channels: 4, background: '#070A10' } }).composite([{ input: icon, gravity: 'center' }]).png().toFile(join(p, 'splash.png'));
    }
  }
  console.log('Android icons and splash written');
}
