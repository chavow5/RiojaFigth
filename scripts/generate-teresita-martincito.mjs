import sharp from 'sharp';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

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

function soundwaves(w, h) {
  const cx = w / 2 + 50, cy = h / 2 - 20;
  const rings = `
    <path d="M ${cx + 30} ${cy - 80} A 90 90 0 0 1 ${cx + 30} ${cy + 80}" fill="none" stroke="#ec4899" stroke-width="8" stroke-linecap="round" opacity="0.9"/>
    <path d="M ${cx + 70} ${cy - 120} A 140 140 0 0 1 ${cx + 70} ${cy + 120}" fill="none" stroke="#f472b6" stroke-width="10" stroke-linecap="round" opacity="0.8"/>
    <path d="M ${cx + 120} ${cy - 160} A 190 190 0 0 1 ${cx + 120} ${cy + 160}" fill="none" stroke="#fbcfe8" stroke-width="12" stroke-linecap="round" opacity="0.7"/>
    <circle cx="${cx}" cy="${cy}" r="15" fill="#ec4899" opacity="0.95"/>
  `;
  return svg(rings, w, h);
}

function gavelEffect(w, h) {
  const cx = w / 2 + 30, cy = h / 2;
  const markup = `
    <line x1="${cx - 80}" y1="${cy - 80}" x2="${cx + 80}" y2="${cy + 80}" stroke="#a855f7" stroke-width="8" stroke-linecap="round" opacity="0.85"/>
    <line x1="${cx + 80}" y1="${cy - 80}" x2="${cx - 80}" y2="${cy + 80}" stroke="#c084fc" stroke-width="8" stroke-linecap="round" opacity="0.85"/>
    <circle cx="${cx}" cy="${cy}" r="28" fill="none" stroke="#e9d5ff" stroke-width="6" opacity="0.9"/>
    <polygon points="${cx},${cy - 50} ${cx + 15},${cy - 20} ${cx + 45},${cy - 20} ${cx + 20},${cy} ${cx + 30},${cy + 35} ${cx},${cy + 15} ${cx - 30},${cy + 35} ${cx - 20},${cy} ${cx - 45},${cy - 20} ${cx - 15},${cy - 20}" fill="#fbbf24" opacity="0.9"/>
  `;
  return svg(markup, w, h);
}

async function processCharacter({
  id,
  sprite,
  sourcePath,
  fighterMeta,
  presentationMeta,
  finaleMeta,
  victoryMeta,
  isMaite,
  isRenny,
}) {
  console.log(`\n========================================`);
  console.log(`Processing ${fighterMeta.name} (${id})...`);
  console.log(`========================================`);

  const src = await croppedBuffer(sourcePath);
  console.log(`Source cropped: ${src.width}x${src.height} (ratio: ${src.ratio.toFixed(2)})`);

  // 1. BUST
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

  await fs.writeFile(`public/assets/bust-${sprite}.webp`, bustWebp);
  const bustHash = sha256(bustWebp);

  const busts = JSON.parse(await fs.readFile('shared/portrait-busts.json', 'utf8'));
  busts[id] = {
    file: `bust-${sprite}`,
    source: sprite,
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
  console.log(`Saved bust-${sprite}.webp (${bustWebp.length} bytes, ${BUST_W}x${BUST_H})`);

  // 2. COMBAT ATLAS (1774 x 887, 8 poses)
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
  await fs.writeFile(`public/assets/${sprite}.webp`, atlas);

  const geometry = JSON.parse(await fs.readFile('shared/sprite-geometry.json', 'utf8'));
  let geoEntry = geometry.sprites.find((s) => s.id === id);
  if (!geoEntry) {
    geoEntry = { id, files: [] };
    geometry.sprites.push(geoEntry);
  }
  geoEntry.files = [
    {
      file: `public/assets/${sprite}.webp`,
      passed: true,
      width: 1774,
      height: 887,
      components,
    },
  ];
  await fs.writeFile('shared/sprite-geometry.json', JSON.stringify(geometry, null, 2) + '\n');
  console.log(`Saved ${sprite}.webp (${atlas.length} bytes)`);

  // 3. ENTRANCE SHEET (1536 x 1024, 6 frames)
  const entFile = `${id}-defiant-entrance`;
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
  await fs.writeFile(`public/assets/${entFile}.webp`, entrance);

  const entrances = JSON.parse(await fs.readFile('shared/entrance-assets.json', 'utf8'));
  entrances[id] = {
    file: entFile,
    cell: 512,
    bodyHeight: 400,
    baseline: 492,
    anchorX: 256,
    width: 1536,
    height: 1024,
    frames: entFrames,
  };
  await fs.writeFile('shared/entrance-assets.json', JSON.stringify(entrances, null, 2) + '\n');
  console.log(`Saved ${entFile}.webp (${entrance.length} bytes)`);

  // 4. ATTACK SHEET (1024 x 1024, 4 frames 512x512)
  const attacks = JSON.parse(await fs.readFile('shared/attack-assets.json', 'utf8'));
  const attH = 425;
  const attFig = await figure(src, attH);
  const attComps = [], attFrames = {};

  if (isMaite) {
    const wave = await soundwaves(512, 512);
    const poses = [
      { name: 'breath', col: 0, row: 0, dx: 0, dy: 0 },
      { name: 'shout', col: 1, row: 0, dx: 15, dy: -4, withWave: true },
      { name: 'sustain', col: 0, row: 1, dx: 10, dy: -2, withWave: true },
      { name: 'recover', col: 1, row: 1, dx: 0, dy: 6 },
    ];
    for (const p of poses) {
      const slotX = p.col * 512, slotY = p.row * 512;
      const x = slotX + Math.round((512 - attFig.w) / 2) + p.dx;
      const y = slotY + 486 - attH + p.dy;
      if (p.withWave) {
        attComps.push({ input: wave, left: slotX, top: slotY });
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
    await fs.writeFile('public/assets/attack-maite-greeting.webp', attImg);
    attacks.maite = {
      file: 'attack-maite-greeting',
      frames: attFrames,
    };
    console.log(`Saved attack-maite-greeting.webp (${attImg.length} bytes)`);
  } else if (isRenny) {
    const gavel = await gavelEffect(512, 512);
    const poses = [
      { name: 'ladder', col: 0, row: 0, dx: 0, dy: 0 },
      { name: 'present', col: 1, row: 0, dx: 15, dy: -4, withGavel: true },
      { name: 'kick', col: 0, row: 1, dx: 25, dy: 0 },
      { name: 'push', col: 1, row: 1, dx: 10, dy: 6 },
    ];
    for (const p of poses) {
      const slotX = p.col * 512, slotY = p.row * 512;
      const x = slotX + Math.round((512 - attFig.w) / 2) + p.dx;
      const y = slotY + 486 - attH + p.dy;
      if (p.withGavel) {
        attComps.push({ input: gavel, left: slotX, top: slotY });
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
    await fs.writeFile('public/assets/renny-commercial-attack-v1.webp', attImg);
    attacks.renny = {
      file: 'renny-commercial-attack-v1',
      frames: attFrames,
    };
    console.log(`Saved renny-commercial-attack-v1.webp (${attImg.length} bytes)`);
  }
  await fs.writeFile('shared/attack-assets.json', JSON.stringify(attacks, null, 2) + '\n');

  // 5. UPDATE ROSTER (shared/fighters.json & shared/fighters.all.json)
  const roster = JSON.parse(await fs.readFile('shared/fighters.json', 'utf8'));
  const rosterIdx = roster.findIndex((f) => f.id === id);
  if (rosterIdx >= 0) roster[rosterIdx] = fighterMeta;
  else roster.push(fighterMeta);
  await fs.writeFile('shared/fighters.json', JSON.stringify(roster, null, 2) + '\n');

  const allFighters = JSON.parse(await fs.readFile('shared/fighters.all.json', 'utf8'));
  const allIdx = allFighters.findIndex((f) => f.id === id);
  if (allIdx >= 0) allFighters[allIdx] = { ...allFighters[allIdx], ...fighterMeta };
  else allFighters.push(fighterMeta);
  await fs.writeFile('shared/fighters.all.json', JSON.stringify(allFighters, null, 2) + '\n');

  // 6. UPDATE PRESENTATIONS
  const presentations = JSON.parse(await fs.readFile('shared/presentations.json', 'utf8'));
  presentations[id] = {
    ...presentations[id],
    ...presentationMeta,
  };
  await fs.writeFile('shared/presentations.json', JSON.stringify(presentations, null, 2) + '\n');

  console.log(`Completed ${fighterMeta.name} successfully.`);
}

async function main() {
  // 1. LA TERESITA (maite)
  await processCharacter({
    id: 'maite',
    sprite: 'maite-v3',
    sourcePath: 'AA ARCHIVOS JAM/Caudillo Figth/personajes sinfondo/tere madera.png',
    isMaite: true,
    fighterMeta: {
      id: 'maite',
      sprite: 'maite-v3',
      name: 'La Teresita',
      shortName: 'Teresita',
      title: 'Vicegobernadora Provincial',
      role: 'CONTROL',
      color: '#ec4899',
      description:
        'Referente central de la gestión riojana y vicegobernadora de la provincia. Con gran despliegue territorial y oratoria firme, controla el espacio en la arena y hace vibrar el Superdomo con su voz.',
      speed: 4.8,
      damage: 1.02,
      armor: 1.02,
      stats: [4, 4, 4],
      ability: 'spotlight',
      special: 'Voz del Superdomo',
      combos: ['Despliegue Territorial', 'Cadena Provincial', 'Acuerdo Federal'],
      category: 'culture',
      portraitLift: 0.02,
    },
    presentationMeta: {
      introName: 'Voz de la Vice',
      selectionName: 'La Teresita en el Superdomo',
      color: '#ec4899',
    },
  });

  // 2. MARTINCITO (renny)
  await processCharacter({
    id: 'renny',
    sprite: 'renny-v3',
    sourcePath: 'AA ARCHIVOS JAM/Caudillo Figth/personajes sinfondo/martin menem.png',
    isRenny: true,
    fighterMeta: {
      id: 'renny',
      sprite: 'renny-v3',
      name: 'Martincito',
      shortName: 'Martincito',
      title: 'Presidente de la Cámara',
      role: 'PRECISIÓN',
      color: '#8b5cf6',
      description:
        'Referente de La Libertad Avanza en La Rioja y titular de la Cámara de Diputados. De traje formal y temple estricto, impone el reglamento de la casa a fuerza de campanazos, quórum y ataques milimétricos.',
      speed: 5.6,
      damage: 0.96,
      armor: 0.98,
      stats: [3, 5, 4],
      ability: 'broadcast',
      special: 'Moción de Orden',
      combos: ['Moción de Orden', 'Quórum Estricto', 'Articulado Firme'],
      category: 'founders',
      portraitLift: 0.02,
    },
    presentationMeta: {
      introName: 'Apertura de Sesión',
      selectionName: 'Martincito en la Cámara',
      color: '#8b5cf6',
    },
  });

  // 3. FINALES UPDATES
  let finales = await fs.readFile('shared/finales.ts', 'utf8');
  // Update maite
  finales = finales.replace(
    /\[\s*"maite",\s*"¡Buenas noches, Superdomo!",[\s\S]*?"show",\s*\]/,
    `[
    "maite",
    "¡Buenas noches, Superdomo!",
    "broadcast",
    "La Teresita saluda al pueblo riojano y proyecta una potente onda sonora que viaja por la arena y desestabiliza por completo al rival.",
    "Micrófono y onda sonora",
    "¡BUENAS NOOOCHES, SUPERDOMO DE LA RIOJA!",
    "show",
  ]`,
  );
  // Update renny
  finales = finales.replace(
    /\[\s*"renny",\s*"El comercial del número uno",[\s\S]*?"show",\s*\]/,
    `[
    "renny",
    "Campanazo de la Cámara",
    "broadcast",
    "Martincito hace sonar el campanazo de la presidencia y exige silencio en la sala mientras su equipo parlamentario avanza y desaloja al rival del recinto.",
    "Campanazo y equipo de debate",
    "¡Silencio en la sala, se vota!",
    "show",
  ]`,
  );
  await fs.writeFile('shared/finales.ts', finales);

  // 4. VICTORIES UPDATES
  let vic = await fs.readFile('src/game/victories-classic.ts', 'utf8');
  vic = vic.replace(/name:\s*"Cierre de transmisión"/, 'name: "Moción Aprobada"');
  vic = vic.replace(/name:\s*"Gala encendida"/, 'name: "Voz de La Rioja"');
  await fs.writeFile('src/game/victories-classic.ts', vic);

  console.log('\nAll done! La Teresita and Martincito are fully created and configured.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
