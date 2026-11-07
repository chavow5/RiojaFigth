import sharp from 'sharp';
import fs from 'node:fs/promises';

// Rebuilds every sprite sheet used by El Gallo (simon) and El Coe (gomez):
// combat atlas, entrance sheet and the arena-finale (ulti) attack sheet.

const SRC = {
  simon: 'AA ARCHIVOS JAM/Caudillo Figth/personajes sinfondo/Sergio Galleguillo.png',
  gomez: 'AA ARCHIVOS JAM/Caudillo Figth/personajes sinfondo/muni.png',
};
const ENTRANCE_FILE = { simon: 'simon-entrance-v1', gomez: 'gomez-defiant-entrance' };
const transparent = (width, height) =>
  sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();

// El Coe is painted facing left; combat sheets must face right (toward the rival).
const FLIP = { 'AA ARCHIVOS JAM/Caudillo Figth/personajes sinfondo/muni.png': true };

async function cropped(path) {
  if (FLIP[path]) {
    const flipped = await sharp(path).flop().png().toBuffer();
    return croppedBuffer(flipped);
  }
  return croppedBuffer(await sharp(path).png().toBuffer());
}

async function croppedBuffer(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > 30) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  const width = maxX - minX + 1, height = maxY - minY + 1;
  const buffer = await sharp(path).extract({ left: minX, top: minY, width, height }).png().toBuffer();
  return { buffer, ratio: width / height };
}

async function figure(src, h) {
  const w = Math.round(h * src.ratio);
  return { buffer: await sharp(src.buffer).resize(w, h, { fit: 'fill' }).png().toBuffer(), w, h };
}

// Figure with transparent headroom so a pose drawn at `poseHeight` shows the
// body at `visible` px (attack-art scales by the whole frame height).
async function padded(src, figH, poseHeight, visible) {
  const fig = await figure(src, figH);
  const frameH = Math.min(510, Math.round(figH * poseHeight / visible));
  const canvas = await transparent(fig.w, frameH);
  const buffer = await sharp(canvas).composite([{ input: fig.buffer, left: 0, top: frameH - figH }]).png().toBuffer();
  return { buffer, w: fig.w, h: frameH };
}

const svg = (markup, w, h) => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${markup}</svg>`)).png().toBuffer();

function flourCloud(variant) {
  const puffs = variant === 0
    ? [[150, 150, 95], [80, 180, 60], [225, 175, 65], [120, 95, 55], [195, 100, 58], [150, 215, 50]]
    : [[150, 140, 100], [70, 170, 66], [235, 160, 62], [105, 85, 50], [205, 80, 55], [160, 220, 46], [40, 120, 30]];
  const circles = puffs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fffdf6" stroke="#d9d2c0" stroke-width="5"/>`).join('');
  const specks = Array.from({ length: 26 }, (_, i) => {
    const a = i * 2.39 + variant, d = 70 + (i * 37) % 70;
    return `<circle cx="${150 + Math.cos(a) * d * 1.3}" cy="${150 + Math.sin(a) * d}" r="${3 + (i % 4)}" fill="#ffffff" opacity="0.9"/>`;
  }).join('');
  const leaves = [[60, 110, -30], [240, 120, 25], [150, 60, 5], [110, 230, 60], [215, 225, -50]]
    .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="16" ry="8" fill="#2f9e44" stroke="#1b5e20" stroke-width="2" transform="rotate(${r + variant * 20} ${x} ${y})"/>`).join('');
  return svg(`${circles}${specks}${leaves}`, 300, 270);
}

const dirtMound = () => svg(
  `<ellipse cx="160" cy="120" rx="150" ry="38" fill="#3b2a1a"/>
   <path d="M20 120 Q90 20 160 30 Q240 30 300 120 Z" fill="#7c4a24" stroke="#4a2c14" stroke-width="5"/>
   <circle cx="110" cy="70" r="9" fill="#9a6235"/><circle cx="200" cy="60" r="7" fill="#9a6235"/><circle cx="160" cy="95" r="10" fill="#5e3a1c"/>`,
  320, 160);

async function sheet(cols, rows, entries) {
  const comps = [], frames = {};
  entries.forEach(([name, art], i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const x = c * 512 + Math.round((512 - art.w) / 2), y = r * 512 + 504 - art.h;
    comps.push({ input: art.buffer, left: x, top: y });
    frames[name] = { x, y, width: art.w, height: art.h, anchorX: Math.round(art.w / 2), anchorY: art.h, bodyHeight: art.h };
  });
  const image = await sharp(await transparent(cols * 512, rows * 512)).composite(comps).webp({ lossless: true }).toBuffer();
  return { image, frames };
}

async function main() {
  const fighters = JSON.parse(await fs.readFile('shared/fighters.json', 'utf8'));
  const geometry = JSON.parse(await fs.readFile('shared/sprite-geometry.json', 'utf8'));
  const entrances = JSON.parse(await fs.readFile('shared/entrance-assets.json', 'utf8'));
  const attacks = JSON.parse(await fs.readFile('shared/attack-assets.json', 'utf8'));

  for (const id of ['simon', 'gomez']) {
    const src = await cropped(SRC[id]);
    const sprite = fighters.find(f => f.id === id).sprite;

    // 1. Combat atlas 1774x887 (8 poses, same layout as Armandito).
    const combat = await figure(src, 425);
    const comps = [], components = [];
    const offsets = [[0, 0], [6, 0], [14, 0], [18, 0], [-8, 4], [0, 8], [0, -12], [0, 0]];
    for (let f = 0; f < 8; f++) {
      const col = f % 4, row = Math.floor(f / 4);
      const left = Math.round(col * 443.5) + 222 - Math.round(combat.w / 2) + offsets[f][0];
      const top = (row === 0 ? 436 : 880) - 425 + offsets[f][1];
      comps.push({ input: combat.buffer, left, top });
      components.push({ minX: left, minY: top, maxX: left + combat.w - 1, maxY: top + 424 });
    }
    const atlas = await sharp(await transparent(1774, 887)).composite(comps).webp({ lossless: true }).toBuffer();
    await fs.writeFile(`public/assets/${sprite}.webp`, atlas);
    const geo = geometry.sprites.find(s => s.id === id).files[0];
    Object.assign(geo, { file: `public/assets/${sprite}.webp`, width: 1774, height: 887, passed: true, components });

    // 2. Entrance sheet 1536x1024 (6 frames).
    const ent = await figure(src, 405);
    const entComps = [], entFrames = [];
    for (let i = 0; i < 6; i++) {
      const slotX = (i % 3) * 512, slotY = Math.floor(i / 3) * 512;
      const x = slotX + Math.round((512 - ent.w) / 2), y = slotY + 492 - 405;
      entComps.push({ input: ent.buffer, left: x, top: y });
      entFrames.push({ x, y, width: ent.w, height: 405, slotX, slotY });
    }
    const entrance = await sharp(await transparent(1536, 1024)).composite(entComps).webp({ lossless: true }).toBuffer();
    await fs.writeFile(`public/assets/${ENTRANCE_FILE[id]}.webp`, entrance);
    entrances[id] = { file: ENTRANCE_FILE[id], cell: 512, bodyHeight: 400, baseline: 492, anchorX: 256, width: 1536, height: 1024, frames: entFrames };
    console.log(`${id}: atlas ${sprite}.webp + entrance ${ENTRANCE_FILE[id]}.webp`);
  }

  // 3. El Gallo ulti sheet: Gallo singing + flour clouds replacing the wooden horses.
  {
    const src = await cropped(SRC.simon);
    const gallo = await figure(src, 470);
    const cloudA = { buffer: await flourCloud(0), w: 300, h: 270 };
    const cloudB = { buffer: await flourCloud(1), w: 300, h: 270 };
    const { image, frames } = await sheet(3, 2, [
      ['ready', gallo], ['downstroke', gallo], ['upstroke', gallo],
      ['accent', gallo], ['horse-trot', cloudA], ['horse-spring', cloudB],
    ]);
    await fs.writeFile('public/assets/simon-cuatro-attack-v1.webp', image);
    attacks.simon = { file: 'simon-cuatro-attack-v1', frames };
    console.log('simon: ulti sheet with flour clouds');
  }

  // 4. El Coe ulti sheet: Coe charging on foot with his crew instead of horses.
  {
    const src = await cropped(SRC.gomez);
    const VISIBLE = 182;
    const pose = (h) => padded(src, 380, h, VISIBLE);
    const crew = await padded(src, 380, 204, VISIBLE);
    const crewTall = await padded(src, 380, 204 * 325 / 307, VISIBLE);
    const mound = { buffer: await dirtMound(), w: 320, h: 160 };
    const { image, frames } = await sheet(4, 2, [
      ['ready', await pose(234)], ['gallop-extended', await pose(204)],
      ['gallop-gathered', await pose(210)], ['brake', await pose(241)],
      ['trooper-extended', crew], ['trooper-gathered', crewTall],
      ['dismount', await pose(216)], ['horse-exit', mound],
    ]);
    await fs.writeFile('public/assets/gomez-cavalry-attack-v1.webp', image);
    attacks.gomez = { file: 'gomez-cavalry-attack-v1', frames };
    console.log('gomez: ulti sheet with COE crew');
  }

  await fs.writeFile('shared/sprite-geometry.json', JSON.stringify(geometry, null, 2) + '\n');
  await fs.writeFile('shared/entrance-assets.json', JSON.stringify(entrances, null, 2) + '\n');
  await fs.writeFile('shared/attack-assets.json', JSON.stringify(attacks, null, 2) + '\n');
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
