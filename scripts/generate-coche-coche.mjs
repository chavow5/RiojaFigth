import sharp from 'sharp';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

const SRC_PATH = 'AA ARCHIVOS JAM/Caudillo Figth/personajes sinfondo/coche coche.png';

const transparent = (width, height) =>
  sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();

async function croppedBuffer(path) {
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width,
    maxX = 0,
    minY = info.height,
    maxY = 0;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > 30) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  const width = maxX - minX + 1,
    height = maxY - minY + 1;
  const buffer = await sharp(path)
    .extract({ left: minX, top: minY, width, height })
    .png()
    .toBuffer();
  return { buffer, width, height, ratio: width / height };
}

async function figure(src, h) {
  const w = Math.round(h * src.ratio);
  return {
    buffer: await sharp(src.buffer).resize(w, h, { fit: 'fill' }).png().toBuffer(),
    w,
    h,
  };
}

const svg = (markup, w, h) =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${markup}</svg>`,
    ),
  )
    .png()
    .toBuffer();

function windSpin(w, h) {
  // Swirling street whirlwind lines for the 'whirl' special move
  const cx = w / 2, cy = h / 2 + 30;
  const spirals = `
    <ellipse cx="${cx}" cy="${cy}" rx="180" ry="45" fill="none" stroke="#10b981" stroke-width="8" opacity="0.8" transform="rotate(-10 ${cx} ${cy})"/>
    <ellipse cx="${cx}" cy="${cy - 30}" rx="160" ry="38" fill="none" stroke="#34d399" stroke-width="6" opacity="0.9" transform="rotate(8 ${cx} ${cy - 30})"/>
    <ellipse cx="${cx}" cy="${cy + 30}" rx="190" ry="42" fill="none" stroke="#6ee7b7" stroke-width="7" opacity="0.75" transform="rotate(-5 ${cx} ${cy + 30})"/>
    <ellipse cx="${cx}" cy="${cy - 70}" rx="130" ry="32" fill="none" stroke="#ffffff" stroke-width="5" opacity="0.85"/>
  `;
  return svg(spirals, w, h);
}

async function main() {
  console.log('Generating assets for Coché Coché (conde)...');
  const src = await croppedBuffer(SRC_PATH);
  console.log(`Source cropped: ${src.width}x${src.height} (ratio: ${src.ratio.toFixed(2)})`);

  // =========================================================================
  // 1. BUST: public/assets/bust-conde-v3.webp
  // =========================================================================
  console.log('1. Building bust-conde-v3.webp...');
  const BUST_H = 430;
  const BUST_W = Math.round(BUST_H * src.ratio); // ~252
  const croppedBust = await sharp(src.buffer)
    .resize(BUST_W, BUST_H)
    .png()
    .toBuffer();

  const bustBlank = await transparent(BUST_W + 4, BUST_H + 4);
  const bustWebp = await sharp(bustBlank)
    .composite([{ input: croppedBust, left: 2, top: 2 }])
    .webp({ lossless: true })
    .toBuffer();

  await fs.writeFile('public/assets/bust-conde-v3.webp', bustWebp);
  const bustHash = sha256(bustWebp);

  const busts = JSON.parse(await fs.readFile('shared/portrait-busts.json', 'utf8'));
  busts.conde = {
    file: 'bust-conde-v3',
    source: 'conde-v3',
    sourceSha256: bustHash,
    sha256: bustHash,
    frame: 0,
    bodyHeight: BUST_H,
    selectionHeight: 375,
    left: -Math.round(BUST_W / 2),
    center: 18,
    width: BUST_W,
    height: BUST_H,
    mirror: 1,
    rows: BUST_H,
    x: 2,
    y: 2,
  };
  await fs.writeFile('shared/portrait-busts.json', JSON.stringify(busts, null, 2) + '\n');
  console.log(`Saved bust-conde-v3.webp (${bustWebp.length} bytes, ${BUST_W}x${BUST_H})`);

  // =========================================================================
  // 2. COMBAT ATLAS: public/assets/conde-v3.webp (1774 x 887)
  // =========================================================================
  console.log('2. Building conde-v3.webp atlas (1774x887)...');
  const combatH = 418;
  const combatFig = await figure(src, combatH);
  const comps = [], components = [];
  // 8 poses offsets: 4 top row, 4 bottom row
  // row 0: idle, walk forward, punch, kick
  // row 1: guard/block, crouch, jump, special
  const offsets = [
    [0, 0],
    [6, 0],
    [14, 0],
    [18, 0],
    [-8, 4],
    [0, 8],
    [0, -10],
    [0, 0],
  ];

  for (let f = 0; f < 8; f++) {
    const col = f % 4, row = Math.floor(f / 4);
    const left = Math.round(col * 443.5) + 222 - Math.round(combatFig.w / 2) + offsets[f][0];
    const top = (row === 0 ? 432 : 870) - combatH + offsets[f][1];
    comps.push({ input: combatFig.buffer, left, top });
    components.push({
      minX: left,
      minY: top,
      maxX: left + combatFig.w - 1,
      maxY: top + combatH - 1,
    });
  }

  const atlas = await sharp(await transparent(1774, 887))
    .composite(comps)
    .webp({ lossless: true })
    .toBuffer();
  await fs.writeFile('public/assets/conde-v3.webp', atlas);

  const geometry = JSON.parse(await fs.readFile('shared/sprite-geometry.json', 'utf8'));
  let geoEntry = geometry.sprites.find((s) => s.id === 'conde');
  if (!geoEntry) {
    geoEntry = { id: 'conde', files: [] };
    geometry.sprites.push(geoEntry);
  }
  geoEntry.files = [
    {
      file: 'public/assets/conde-v3.webp',
      passed: true,
      width: 1774,
      height: 887,
      components,
    },
  ];
  await fs.writeFile('shared/sprite-geometry.json', JSON.stringify(geometry, null, 2) + '\n');
  console.log(`Saved conde-v3.webp (${atlas.length} bytes)`);

  // =========================================================================
  // 3. ENTRANCE SHEET: public/assets/conde-entrance-v1.webp (1536 x 1024)
  // =========================================================================
  console.log('3. Building conde-entrance-v1.webp (1536x1024)...');
  const entH = 405;
  const entFig = await figure(src, entH);
  const entComps = [], entFrames = [];
  const entOffsets = [
    [0, 0],
    [2, -4],
    [5, -8],
    [3, -4],
    [0, 0],
    [-2, 2],
  ];

  for (let i = 0; i < 6; i++) {
    const slotX = (i % 3) * 512, slotY = Math.floor(i / 3) * 512;
    const x = slotX + Math.round((512 - entFig.w) / 2) + entOffsets[i][0];
    const y = slotY + 490 - entH + entOffsets[i][1];
    entComps.push({ input: entFig.buffer, left: x, top: y });
    entFrames.push({
      x,
      y,
      width: entFig.w,
      height: entH,
      anchorX: Math.round(entFig.w / 2),
      anchorY: entH,
      bodyHeight: 400,
      slotX,
      slotY,
    });
  }

  const entrance = await sharp(await transparent(1536, 1024))
    .composite(entComps)
    .webp({ lossless: true })
    .toBuffer();
  await fs.writeFile('public/assets/conde-entrance-v1.webp', entrance);

  const entrances = JSON.parse(await fs.readFile('shared/entrance-assets.json', 'utf8'));
  entrances.conde = {
    file: 'conde-entrance-v1',
    cell: 512,
    bodyHeight: 400,
    baseline: 492,
    anchorX: 256,
    width: 1536,
    height: 1024,
    frames: entFrames,
  };
  await fs.writeFile('shared/entrance-assets.json', JSON.stringify(entrances, null, 2) + '\n');
  console.log(`Saved conde-entrance-v1.webp (${entrance.length} bytes)`);

  // =========================================================================
  // 4. ATTACK SHEET: public/assets/attack-conde-bond-v1.webp (2048 x 1024)
  // =========================================================================
  console.log('4. Building attack-conde-bond-v1.webp (2048x1024)...');
  // 8 poses in 4x2 grid of 512x512
  // Row 0: ready, guard, run, jump
  // Row 1: punch, kick, hurt, whirl
  const attH = 430;
  const attFig = await figure(src, attH);
  const spinEffect = await windSpin(512, 512);

  const attComps = [], attFrames = {};
  const poseList = [
    { name: 'ready', col: 0, row: 0, dx: 0, dy: 0 },
    { name: 'guard', col: 1, row: 0, dx: -10, dy: 6 },
    { name: 'run', col: 2, row: 0, dx: 15, dy: -4 },
    { name: 'jump', col: 3, row: 0, dx: 5, dy: -24 },
    { name: 'punch', col: 0, row: 1, dx: 25, dy: -2 },
    { name: 'kick', col: 1, row: 1, dx: 20, dy: 0 },
    { name: 'hurt', col: 2, row: 1, dx: -15, dy: 8 },
    { name: 'whirl', col: 3, row: 1, dx: 0, dy: 0, withSpin: true },
  ];

  for (const p of poseList) {
    const slotX = p.col * 512, slotY = p.row * 512;
    const x = slotX + Math.round((512 - attFig.w) / 2) + p.dx;
    const y = slotY + 486 - attH + p.dy;

    if (p.withSpin) {
      attComps.push({ input: spinEffect, left: slotX, top: slotY });
    }
    attComps.push({ input: attFig.buffer, left: x, top: y });

    attFrames[p.name] = {
      x,
      y,
      width: attFig.w,
      height: attH,
      anchorX: Math.round(attFig.w / 2),
      anchorY: attH,
      bodyHeight: 420,
    };
  }

  const attackImage = await sharp(await transparent(2048, 1024))
    .composite(attComps)
    .webp({ lossless: true })
    .toBuffer();
  await fs.writeFile('public/assets/attack-conde-bond-v1.webp', attackImage);

  const attacks = JSON.parse(await fs.readFile('shared/attack-assets.json', 'utf8'));
  attacks.conde = {
    file: 'attack-conde-bond-v1',
    frames: attFrames,
  };
  await fs.writeFile('shared/attack-assets.json', JSON.stringify(attacks, null, 2) + '\n');
  console.log(`Saved attack-conde-bond-v1.webp (${attackImage.length} bytes)`);

  // =========================================================================
  // 5. UPDATE FIGHTERS METADATA (shared/fighters.json & shared/fighters.all.json)
  // =========================================================================
  console.log('5. Updating fighters metadata...');
  const cocheFighter = {
    id: 'conde',
    sprite: 'conde-v3',
    name: 'Coché Coché',
    shortName: 'Coché',
    title: 'Ícono del 4 de Junio',
    role: 'IMPREDECIBLE',
    color: '#10b981',
    description:
      'Inconfundible personaje del folklore urbano riojano, nacido en las calles del barrio 4 de Junio. Con su paso característico y carisma popular, desconcierta a sus rivales con embestidas y giros impredecibles.',
    speed: 5.4,
    damage: 1.04,
    armor: 0.98,
    stats: [4, 4, 3],
    ability: 'whirl',
    special: 'Giro del 4 de Junio',
    combos: [
      'Paso Inconfundible',
      'Arremetida Barrial',
      'Giro Sorpresa',
    ],
    category: 'culture',
    portraitLift: 0.02,
  };

  const roster = JSON.parse(await fs.readFile('shared/fighters.json', 'utf8'));
  const existingRosterIdx = roster.findIndex((f) => f.id === 'conde');
  if (existingRosterIdx >= 0) {
    roster[existingRosterIdx] = cocheFighter;
  } else {
    roster.push(cocheFighter);
  }
  await fs.writeFile('shared/fighters.json', JSON.stringify(roster, null, 2) + '\n');

  const allFighters = JSON.parse(await fs.readFile('shared/fighters.all.json', 'utf8'));
  const allIdx = allFighters.findIndex((f) => f.id === 'conde');
  if (allIdx >= 0) {
    allFighters[allIdx] = { ...allFighters[allIdx], ...cocheFighter };
  } else {
    allFighters.push(cocheFighter);
  }
  await fs.writeFile('shared/fighters.all.json', JSON.stringify(allFighters, null, 2) + '\n');

  // =========================================================================
  // 6. UPDATE PRESENTATIONS
  // =========================================================================
  console.log('6. Updating presentations...');
  const presentations = JSON.parse(await fs.readFile('shared/presentations.json', 'utf8'));
  presentations.conde = {
    ...presentations.conde,
    introName: 'Giro del 4 de Junio',
    selectionName: 'El inconfundible Coché Coché',
    color: '#10b981',
  };
  await fs.writeFile('shared/presentations.json', JSON.stringify(presentations, null, 2) + '\n');

  console.log('Done! All assets and configurations for Coché Coché generated successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
