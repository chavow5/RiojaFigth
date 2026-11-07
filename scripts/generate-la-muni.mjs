import sharp from 'sharp';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

const SRC_PATH = 'AA ARCHIVOS JAM/Caudillo Figth/personajes sinfondo/muni2.png';

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

function trafficCone(w, h) {
  const cx = w / 2 + 60, cy = h / 2 + 80;
  const markup = `
    <!-- Traffic Cone -->
    <polygon points="${cx},${cy - 120} ${cx + 45},${cy + 40} ${cx - 45},${cy + 40}" fill="#f97316" stroke="#c2410c" stroke-width="4"/>
    <polygon points="${cx - 15},${cy - 60} ${cx + 15},${cy - 60} ${cx + 25},${cy - 20} ${cx - 25},${cy - 20}" fill="#ffffff" opacity="0.95"/>
    <ellipse cx="${cx}" cy="${cy + 42}" rx="55" ry="12" fill="#ea580c"/>
    <!-- Motion lines -->
    <path d="M ${cx - 100} ${cy - 20} Q ${cx - 50} ${cy - 80} ${cx} ${cy - 140}" fill="none" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" opacity="0.8"/>
  `;
  return svg(markup, w, h);
}

async function main() {
  console.log('Generating assets for La Muni (javier)...');
  const src = await croppedBuffer(SRC_PATH);
  console.log(`Source cropped: ${src.width}x${src.height} (ratio: ${src.ratio.toFixed(2)})`);

  // =========================================================================
  // 1. BUST: public/assets/bust-javier-v43.webp
  // =========================================================================
  console.log('1. Building bust-javier-v43.webp...');
  const BUST_H = 430;
  const BUST_W = Math.round(BUST_H * src.ratio);
  const croppedBust = await sharp(src.buffer)
    .resize(BUST_W, BUST_H)
    .png()
    .toBuffer();

  const bustBlank = await transparent(BUST_W + 4, BUST_H + 4);
  const bustWebp = await sharp(bustBlank)
    .composite([{ input: croppedBust, left: 2, top: 2 }])
    .webp({ lossless: true })
    .toBuffer();

  await fs.writeFile('public/assets/bust-javier-v43.webp', bustWebp);
  const bustHash = sha256(bustWebp);

  const busts = JSON.parse(await fs.readFile('shared/portrait-busts.json', 'utf8'));
  busts.javier = {
    file: 'bust-javier-v43',
    source: 'javier-v43',
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
  console.log(`Saved bust-javier-v43.webp (${bustWebp.length} bytes, ${BUST_W}x${BUST_H})`);

  // =========================================================================
  // 2. COMBAT ATLAS: public/assets/javier-v43.webp (1774 x 887, 8 poses)
  // =========================================================================
  console.log('2. Building javier-v43.webp atlas (1774x887)...');
  const combatH = 418;
  const combatFig = await figure(src, combatH);
  const comps = [], components = [];
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
  await fs.writeFile('public/assets/javier-v43.webp', atlas);

  const geometry = JSON.parse(await fs.readFile('shared/sprite-geometry.json', 'utf8'));
  let geoEntry = geometry.sprites.find((s) => s.id === 'javier');
  if (!geoEntry) {
    geoEntry = { id: 'javier', files: [] };
    geometry.sprites.push(geoEntry);
  }
  geoEntry.files = [
    {
      file: 'public/assets/javier-v43.webp',
      passed: true,
      width: 1774,
      height: 887,
      components,
    },
  ];
  await fs.writeFile('shared/sprite-geometry.json', JSON.stringify(geometry, null, 2) + '\n');
  console.log(`Saved javier-v43.webp (${atlas.length} bytes)`);

  // =========================================================================
  // 3. ENTRANCE SHEET: public/assets/javier-v43-defiant-entrance.webp (1536 x 1024)
  // =========================================================================
  console.log('3. Building javier-v43-defiant-entrance.webp (1536x1024)...');
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
  await fs.writeFile('public/assets/javier-v43-defiant-entrance.webp', entrance);

  const entrances = JSON.parse(await fs.readFile('shared/entrance-assets.json', 'utf8'));
  entrances.javier = {
    file: 'javier-v43-defiant-entrance',
    cell: 512,
    bodyHeight: 400,
    baseline: 492,
    anchorX: 256,
    width: 1536,
    height: 1024,
    frames: entFrames,
  };
  await fs.writeFile('shared/entrance-assets.json', JSON.stringify(entrances, null, 2) + '\n');
  console.log(`Saved javier-v43-defiant-entrance.webp (${entrance.length} bytes)`);

  // =========================================================================
  // 4. ATTACK SHEET: public/assets/javier-scolding-attack-v1.webp (1024 x 1024)
  // =========================================================================
  console.log('4. Building javier-scolding-attack-v1.webp (1024x1024)...');
  const attH = 425;
  const attFig = await figure(src, attH);
  const cone = await trafficCone(512, 512);

  const attComps = [], attFrames = {};
  const poses = [
    { name: 'headshirt', col: 0, row: 0, dx: 0, dy: 0 },
    { name: 'fingerwag', col: 1, row: 0, dx: 15, dy: -4, withCone: true },
    { name: 'scold', col: 0, row: 1, dx: 10, dy: -2 },
    { name: 'point', col: 1, row: 1, dx: 20, dy: 4, withCone: true },
  ];

  for (const p of poses) {
    const slotX = p.col * 512, slotY = p.row * 512;
    const x = slotX + Math.round((512 - attFig.w) / 2) + p.dx;
    const y = slotY + 486 - attH + p.dy;
    if (p.withCone) {
      attComps.push({ input: cone, left: slotX, top: slotY });
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

  const attImg = await sharp(await transparent(1024, 1024))
    .composite(attComps)
    .webp({ lossless: true })
    .toBuffer();
  await fs.writeFile('public/assets/javier-scolding-attack-v1.webp', attImg);

  const attacks = JSON.parse(await fs.readFile('shared/attack-assets.json', 'utf8'));
  attacks.javier = {
    file: 'javier-scolding-attack-v1',
    frames: attFrames,
  };
  await fs.writeFile('shared/attack-assets.json', JSON.stringify(attacks, null, 2) + '\n');
  console.log(`Saved javier-scolding-attack-v1.webp (${attImg.length} bytes)`);

  // =========================================================================
  // 5. UPDATE ROSTER (shared/fighters.json & shared/fighters.all.json)
  // =========================================================================
  console.log('5. Updating fighters metadata...');
  const muniFighter = {
    id: 'javier',
    sprite: 'javier-v43',
    name: 'La Muni',
    shortName: 'La Muni',
    title: 'Fuerza Operativa Urbana',
    role: 'CONTROL',
    color: '#0284c7',
    description:
      'El brazo operativo de los servicios públicos de la capital riojana. Con herramientas de cuadrilla, conos de advertencia y despliegue urbano constante, barre con cualquier obstáculo que intente cortar el paso en la arena.',
    speed: 5.0,
    damage: 1.08,
    armor: 1.02,
    stats: [4, 4, 4],
    ability: 'spin',
    special: 'Barrido Municipal',
    combos: [
      'Barrido Urbano',
      'Corte de Tránsito',
      'Inspección General',
    ],
    category: 'founders',
    portraitLift: 0.02,
  };

  const roster = JSON.parse(await fs.readFile('shared/fighters.json', 'utf8'));
  const rosterIdx = roster.findIndex((f) => f.id === 'javier');
  if (rosterIdx >= 0) roster[rosterIdx] = muniFighter;
  else roster.push(muniFighter);
  await fs.writeFile('shared/fighters.json', JSON.stringify(roster, null, 2) + '\n');

  const allFighters = JSON.parse(await fs.readFile('shared/fighters.all.json', 'utf8'));
  const allIdx = allFighters.findIndex((f) => f.id === 'javier');
  if (allIdx >= 0) allFighters[allIdx] = { ...allFighters[allIdx], ...muniFighter };
  else allFighters.push(muniFighter);
  await fs.writeFile('shared/fighters.all.json', JSON.stringify(allFighters, null, 2) + '\n');

  // =========================================================================
  // 6. UPDATE PRESENTATIONS
  // =========================================================================
  console.log('6. Updating presentations...');
  const presentations = JSON.parse(await fs.readFile('shared/presentations.json', 'utf8'));
  presentations.javier = {
    ...presentations.javier,
    introName: 'Llegó la Cuadrilla',
    selectionName: 'La Muni al Servicio',
    color: '#0284c7',
  };
  await fs.writeFile('shared/presentations.json', JSON.stringify(presentations, null, 2) + '\n');

  // =========================================================================
  // 7. UPDATE FINALES
  // =========================================================================
  console.log('7. Updating finales...');
  let finales = await fs.readFile('shared/finales.ts', 'utf8');
  finales = finales.replace(
    /\[\s*"javier",\s*"Regaño de campeonato",[\s\S]*?"show",\s*\]/,
    `[
    "javier",
    "Operativo de Limpieza",
    "theater",
    "La Muni activa un operativo relámpago con conos y herramientas de cuadrilla, despejando la calzada y barriendo al rival fuera de combate.",
    "Conos de tránsito y cuadrilla municipal",
    "¡Zona de obras municipal!",
    "show",
  ]`,
  );
  await fs.writeFile('shared/finales.ts', finales);

  // =========================================================================
  // 8. UPDATE VICTORIES
  // =========================================================================
  console.log('8. Updating victories...');
  let vic = await fs.readFile('src/game/victories-classic.ts', 'utf8');
  vic = vic.replace(/name:\s*"Mialma, qué remate"/, 'name: "Servicio Cumplido"');
  await fs.writeFile('src/game/victories-classic.ts', vic);

  console.log('\nAll done! La Muni is fully created and configured.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
