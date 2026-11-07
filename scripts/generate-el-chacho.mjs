import sharp from 'sharp';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

const PATH_NEUTRAL = 'AA ARCHIVOS JAM/Caudillo Figth/personajes sinfondo/chacho penaloza.png';
const PATH_GUARD = 'AA ARCHIVOS JAM/Caudillo Figth/personajes sinfondo/chacho penaloza guardia.png';
const PATH_ARMS = 'AA ARCHIVOS JAM/Caudillo Figth/personajes sinfondo/chacho penaloza brazos cruzados.png';

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

async function main() {
  console.log('Generating assets for El Chacho (bolivar)...');
  const srcNeutral = await croppedBuffer(PATH_NEUTRAL);
  const srcGuard = await croppedBuffer(PATH_GUARD);
  const srcArms = await croppedBuffer(PATH_ARMS);
  console.log(`Poses cropped: neutral ${srcNeutral.width}x${srcNeutral.height}, guard ${srcGuard.width}x${srcGuard.height}, arms ${srcArms.width}x${srcArms.height}`);

  // =========================================================================
  // 1. BUST: public/assets/bust-bolivar-v39.webp
  // =========================================================================
  console.log('1. Building bust-bolivar-v39.webp...');
  const BUST_H = 430;
  const BUST_W = Math.round(BUST_H * srcArms.ratio);
  const croppedBust = await sharp(srcArms.buffer)
    .resize(BUST_W, BUST_H)
    .png()
    .toBuffer();

  const bustBlank = await transparent(BUST_W + 4, BUST_H + 4);
  const bustWebp = await sharp(bustBlank)
    .composite([{ input: croppedBust, left: 2, top: 2 }])
    .webp({ lossless: true })
    .toBuffer();

  await fs.writeFile('public/assets/bust-bolivar-v39.webp', bustWebp);
  const bustHash = sha256(bustWebp);

  const busts = JSON.parse(await fs.readFile('shared/portrait-busts.json', 'utf8'));
  busts.bolivar = {
    file: 'bust-bolivar-v39',
    source: 'bolivar-v39',
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
  console.log(`Saved bust-bolivar-v39.webp (${bustWebp.length} bytes, ${BUST_W}x${BUST_H})`);

  // =========================================================================
  // 2. COMBAT ATLAS: public/assets/bolivar-v39.webp (1774 x 887, 8 poses)
  // =========================================================================
  console.log('2. Building bolivar-v39.webp atlas (1774x887)...');
  const combatH = 418;
  const figNeutral = await figure(srcNeutral, combatH);
  const figGuard = await figure(srcGuard, combatH);
  const figArms = await figure(srcArms, combatH);

  const poseConfigs = [
    // Row 0: idle, walk forward, strike/punch, kick/lunge
    { fig: figNeutral, dx: 0, dy: 0 },
    { fig: figNeutral, dx: 8, dy: 0 },
    { fig: figGuard, dx: 14, dy: 0 },
    { fig: figGuard, dx: 20, dy: 0 },
    // Row 1: guard, crouch, jump, special/win
    { fig: figGuard, dx: -8, dy: 4 },
    { fig: figNeutral, dx: 0, dy: 8 },
    { fig: figNeutral, dx: 0, dy: -10 },
    { fig: figArms, dx: 0, dy: 0 },
  ];

  const comps = [], components = [];
  for (let f = 0; f < 8; f++) {
    const col = f % 4, row = Math.floor(f / 4);
    const p = poseConfigs[f];
    const left = Math.round(col * 443.5) + 222 - Math.round(p.fig.w / 2) + p.dx;
    const top = (row === 0 ? 432 : 870) - combatH + p.dy;
    comps.push({ input: p.fig.buffer, left, top });
    components.push({
      minX: left,
      minY: top,
      maxX: left + p.fig.w - 1,
      maxY: top + combatH - 1,
    });
  }

  const atlas = await sharp(await transparent(1774, 887))
    .composite(comps)
    .webp({ lossless: true })
    .toBuffer();
  await fs.writeFile('public/assets/bolivar-v39.webp', atlas);

  const geometry = JSON.parse(await fs.readFile('shared/sprite-geometry.json', 'utf8'));
  let geoEntry = geometry.sprites.find((s) => s.id === 'bolivar');
  if (!geoEntry) {
    geoEntry = { id: 'bolivar', files: [] };
    geometry.sprites.push(geoEntry);
  }
  geoEntry.files = [
    {
      file: 'public/assets/bolivar-v39.webp',
      passed: true,
      width: 1774,
      height: 887,
      components,
    },
  ];
  await fs.writeFile('shared/sprite-geometry.json', JSON.stringify(geometry, null, 2) + '\n');
  console.log(`Saved bolivar-v39.webp (${atlas.length} bytes)`);

  // =========================================================================
  // 3. ENTRANCE SHEET: public/assets/bolivar-defiant-entrance.webp (1536 x 1024)
  // =========================================================================
  console.log('3. Building bolivar-defiant-entrance.webp (1536x1024)...');
  const entH = 405;
  const entNeutral = await figure(srcNeutral, entH);
  const entArms = await figure(srcArms, entH);
  const entGuard = await figure(srcGuard, entH);

  const entFramesList = [
    { fig: entNeutral, dx: 0, dy: 0 },
    { fig: entNeutral, dx: 4, dy: -4 },
    { fig: entGuard, dx: 8, dy: -8 },
    { fig: entGuard, dx: 4, dy: -4 },
    { fig: entArms, dx: 0, dy: 0 },
    { fig: entArms, dx: -2, dy: 2 },
  ];

  const entComps = [], entFrames = [];
  for (let i = 0; i < 6; i++) {
    const slotX = (i % 3) * 512, slotY = Math.floor(i / 3) * 512;
    const f = entFramesList[i];
    const x = slotX + Math.round((512 - f.fig.w) / 2) + f.dx;
    const y = slotY + 490 - entH + f.dy;
    entComps.push({ input: f.fig.buffer, left: x, top: y });
    entFrames.push({
      x,
      y,
      width: f.fig.w,
      height: entH,
      anchorX: Math.round(f.fig.w / 2),
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
  await fs.writeFile('public/assets/bolivar-defiant-entrance.webp', entrance);

  const entrances = JSON.parse(await fs.readFile('shared/entrance-assets.json', 'utf8'));
  entrances.bolivar = {
    file: 'bolivar-defiant-entrance',
    cell: 512,
    bodyHeight: 400,
    baseline: 492,
    anchorX: 256,
    width: 1536,
    height: 1024,
    frames: entFrames,
  };
  await fs.writeFile('shared/entrance-assets.json', JSON.stringify(entrances, null, 2) + '\n');
  console.log(`Saved bolivar-defiant-entrance.webp (${entrance.length} bytes)`);

  // =========================================================================
  // 4. ATTACK SHEET: public/assets/bolivar-llaneros-attack-v1.webp (3584 x 1024)
  // =========================================================================
  console.log('4. Updating bolivar-llaneros-attack-v1.webp with El Chacho...');
  const currentAttackBuffer = await fs.readFile('public/assets/bolivar-llaneros-attack-v1.webp');
  const existingAttack = sharp(currentAttackBuffer);

  const attH = 430;
  const attGuard = await figure(srcGuard, attH);
  const attArms = await figure(srcArms, attH);
  const attNeutral = await figure(srcNeutral, attH);

  // Replace leader poses in columns 0..4 of top row (Y: 0..512)
  // Col 0: draw -> attNeutral
  // Col 1: slash -> attGuard
  // Col 2: cut -> attGuard
  // Col 3: thrust -> attGuard
  // Col 4: ready -> attArms
  // We composite them over transparent cutouts of the slots
  const leaderComps = [
    { fig: attNeutral, col: 0, dx: 0, dy: 0 },
    { fig: attGuard, col: 1, dx: 15, dy: -6 },
    { fig: attGuard, col: 2, dx: 25, dy: -2 },
    { fig: attGuard, col: 3, dx: 20, dy: 4 },
    { fig: attArms, col: 4, dx: 0, dy: 0 },
  ];

  const clearLeaderBox = await transparent(2560, 512);
  const leaderOverlay = await transparent(2560, 512);
  const overlayComps = [];

  for (const item of leaderComps) {
    const slotX = item.col * 512;
    const x = slotX + Math.round((512 - item.fig.w) / 2) + item.dx;
    const y = 486 - attH + item.dy;
    overlayComps.push({ input: item.fig.buffer, left: x, top: y });
  }

  const composedLeader = await sharp(leaderOverlay).composite(overlayComps).png().toBuffer();

  // Extract bottom row (horses & montoneros) and remaining top row columns (5,6)
  const bottomRow = await sharp(currentAttackBuffer)
    .extract({ left: 0, top: 512, width: 3584, height: 512 })
    .png()
    .toBuffer();
  const gallopCol = await sharp(currentAttackBuffer)
    .extract({ left: 2560, top: 0, width: 1024, height: 512 })
    .png()
    .toBuffer();

  const finalAttackSheet = await sharp(await transparent(3584, 1024))
    .composite([
      { input: composedLeader, left: 0, top: 0 },
      { input: gallopCol, left: 2560, top: 0 },
      { input: bottomRow, left: 0, top: 512 },
    ])
    .webp({ lossless: true })
    .toBuffer();

  await fs.writeFile('public/assets/bolivar-llaneros-attack-v1.webp', finalAttackSheet);
  console.log(`Saved bolivar-llaneros-attack-v1.webp (${finalAttackSheet.length} bytes)`);

  // =========================================================================
  // 5. UPDATE ROSTER (shared/fighters.json & shared/fighters.all.json)
  // =========================================================================
  console.log('5. Updating fighters metadata...');
  const chachoFighter = {
    id: 'bolivar',
    sprite: 'bolivar-v39',
    name: 'El Chacho',
    shortName: 'El Chacho',
    title: 'La Leyenda del Federalismo',
    role: 'EMBESTIDA',
    color: '#eab308',
    description:
      "General Ángel Vicente 'El Chacho' Peñaloza, caudillo supremo de La Rioja y de las montoneras federales. Símbolo indiscutido del coraje del interior, lidera a su pueblo con lanza en mano y una carga a caballo que hace temblar la arena.",
    speed: 5.3,
    damage: 1.12,
    armor: 1.05,
    stats: [5, 4, 4],
    ability: 'liberator',
    special: 'Carga Federal',
    combos: [
      'Carga de los Llanos',
      'Lanza Federal',
      'Grito de Montonera',
    ],
    category: 'culture',
    portraitLift: 0.02,
  };

  const roster = JSON.parse(await fs.readFile('shared/fighters.json', 'utf8'));
  const rosterIdx = roster.findIndex((f) => f.id === 'bolivar');
  if (rosterIdx >= 0) roster[rosterIdx] = chachoFighter;
  else roster.push(chachoFighter);
  await fs.writeFile('shared/fighters.json', JSON.stringify(roster, null, 2) + '\n');

  const allFighters = JSON.parse(await fs.readFile('shared/fighters.all.json', 'utf8'));
  const allIdx = allFighters.findIndex((f) => f.id === 'bolivar');
  if (allIdx >= 0) allFighters[allIdx] = { ...allFighters[allIdx], ...chachoFighter };
  else allFighters.push(chachoFighter);
  await fs.writeFile('shared/fighters.all.json', JSON.stringify(allFighters, null, 2) + '\n');

  // =========================================================================
  // 6. UPDATE PRESENTATIONS
  // =========================================================================
  console.log('6. Updating presentations...');
  const presentations = JSON.parse(await fs.readFile('shared/presentations.json', 'utf8'));
  presentations.bolivar = {
    ...presentations.bolivar,
    introName: 'Llega el Caudillo',
    selectionName: 'El Chacho Peñaloza - La Leyenda',
    color: '#eab308',
  };
  await fs.writeFile('shared/presentations.json', JSON.stringify(presentations, null, 2) + '\n');

  // =========================================================================
  // 7. UPDATE FINALES
  // =========================================================================
  console.log('7. Updating finales...');
  let finales = await fs.readFile('shared/finales.ts', 'utf8');
  finales = finales.replace(
    /\[\s*"bolivar",\s*"Marcha de la libertad",[\s\S]*?"show",\s*\]/,
    `[
    "bolivar",
    "Carga de la Montonera",
    "theater",
    "El Chacho Peñaloza lidera la legendaria carga de la Montonera Federal a caballo a través de los llanos riojanos. Los gauchos federales cruzan la arena a galope arrollando al rival en defensa del federalismo.",
    "Caballos y Montonera Federal",
    "¡Viva el Chacho, carajo!",
    "show",
  ]`,
  );
  await fs.writeFile('shared/finales.ts', finales);

  // =========================================================================
  // 8. UPDATE VICTORIES
  // =========================================================================
  console.log('8. Updating victories...');
  let vic = await fs.readFile('src/game/victories-icons.ts', 'utf8');
  vic = vic.replace(/name:\s*"Honor al vencedor"/, 'name: "La Leyenda Federal"');
  await fs.writeFile('src/game/victories-icons.ts', vic);

  console.log('\nAll done! El Chacho (La Leyenda) is fully created and configured.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
