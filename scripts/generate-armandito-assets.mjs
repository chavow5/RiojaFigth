import sharp from 'sharp';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

async function main() {
  console.log('Generating Armandito assets...');

  const srcPath = 'AA ARCHIVOS JAM/Caudillo Figth/personajes sinfondo/armandito.png';
  
  // 1. Load and measure non-transparent bounding box
  const rawData = await sharp(srcPath).raw().toBuffer({ resolveWithObject: true });
  let minX = rawData.info.width, maxX = 0, minY = rawData.info.height, maxY = 0;
  for (let y = 0; y < rawData.info.height; y++) {
    for (let x = 0; x < rawData.info.width; x++) {
      if (rawData.data[(y * rawData.info.width + x) * 4 + 3] > 30) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const fullW = maxX - minX + 1;
  const fullH = maxY - minY + 1;
  console.log(`Bounding box: minX=${minX}, maxX=${maxX}, minY=${minY}, maxY=${maxY}, w=${fullW}, h=${fullH}`);

  // Base Armandito cropped to exact silhouette
  const armanditoCropped = await sharp(srcPath)
    .extract({ left: minX, top: minY, width: fullW, height: fullH })
    .png()
    .toBuffer();

  // ----------------------------------------------------
  // ASSET 1: bust-zavarce-v5.webp
  // ----------------------------------------------------
  // Full-body bust matching standard 425px height, 274px width
  const BUST_H = 425;
  const BUST_W = Math.round(BUST_H * (fullW / fullH)); // 274
  const armanditoBustRaw = await sharp(armanditoCropped)
    .resize(BUST_W, BUST_H, { fit: 'fill' })
    .png()
    .toBuffer();

  // Add 2px transparent padding around it (278 x 429)
  const bustBlank = await sharp({
    create: {
      width: BUST_W + 4,
      height: BUST_H + 4,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).png().toBuffer();

  const bustWebp = await sharp(bustBlank)
    .composite([{ input: armanditoBustRaw, left: 2, top: 2 }])
    .webp({ lossless: true })
    .toBuffer();

  await fs.writeFile('public/assets/bust-zavarce-v5.webp', bustWebp);
  console.log(`Saved public/assets/bust-zavarce-v5.webp (${bustWebp.length} bytes)`);

  // ----------------------------------------------------
  // ASSET 2: zavarce-defiant-entrance.webp
  // ----------------------------------------------------
  // 1536 x 1024, 3 cols x 2 rows, cell size 512 x 512
  // bodyHeight: 400, baseline: 492, anchorX: 256
  const ENTRANCE_H = 405;
  const ENTRANCE_W = Math.round(ENTRANCE_H * (fullW / fullH)); // 261
  const armanditoEntranceRaw = await sharp(armanditoCropped)
    .resize(ENTRANCE_W, ENTRANCE_H, { fit: 'fill' })
    .png()
    .toBuffer();

  const entranceBlank = await sharp({
    create: {
      width: 1536,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).png().toBuffer();

  const entranceComposites = [];
  const entranceFrames = [];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const x = c * 512 + Math.round((512 - ENTRANCE_W) / 2); // 125, 637, 1149
      const y = r * 512 + (492 - ENTRANCE_H); // 87, 599
      entranceComposites.push({ input: armanditoEntranceRaw, left: x, top: y });
      entranceFrames.push({
        x,
        y,
        width: ENTRANCE_W,
        height: ENTRANCE_H,
        slotX: c * 512,
        slotY: r * 512,
      });
    }
  }

  const entranceWebp = await sharp(entranceBlank)
    .composite(entranceComposites)
    .webp({ lossless: true })
    .toBuffer();

  await fs.writeFile('public/assets/zavarce-defiant-entrance.webp', entranceWebp);
  console.log(`Saved public/assets/zavarce-defiant-entrance.webp (${entranceWebp.length} bytes)`);

  // ----------------------------------------------------
  // ASSET 3: zavarce-v5.webp (8 poses combat atlas)
  // ----------------------------------------------------
  // 1774 x 887, 4 cols x 2 rows, cell width 443.5, height 443.5
  // Row 0 baseline: 436, Row 1 baseline: 880
  const SHEET_W = 1774;
  const SHEET_H = 887;
  const CELL_W = SHEET_W / 4; // 443.5
  const CELL_H = SHEET_H / 2; // 443.5
  const COMBAT_H = 425;
  const COMBAT_W = BUST_W; // 274

  const armanditoCombatRaw = await sharp(armanditoCropped)
    .resize(COMBAT_W, COMBAT_H, { fit: 'fill' })
    .png()
    .toBuffer();

  const sheetBlank = await sharp({
    create: {
      width: SHEET_W,
      height: SHEET_H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).png().toBuffer();

  const sheetComposites = [];
  const spriteComponents = [];

  for (let f = 0; f < 8; f++) {
    const col = f % 4;
    const row = Math.floor(f / 4);
    const slotX = Math.round(col * CELL_W);
    const slotY = Math.round(row * CELL_H);
    const cellCenterX = slotX + Math.round(CELL_W / 2);
    const cellBaseline = row === 0 ? 436 : 880;

    let posX = cellCenterX - Math.round(COMBAT_W / 2);
    let posY = cellBaseline - COMBAT_H;

    // Slight dynamic offsets for combat poses
    if (f === 1) { // walk forward
      posX += 6;
    } else if (f === 2) { // light punch
      posX += 14;
    } else if (f === 3) { // heavy strike
      posX += 18;
    } else if (f === 4) { // hurt
      posX -= 8;
      posY += 4;
    } else if (f === 5) { // knockdown
      posY += 8;
    } else if (f === 6) { // jump
      posY -= 12;
    }

    sheetComposites.push({ input: armanditoCombatRaw, left: posX, top: posY });
    spriteComponents.push({
      minX: posX,
      minY: posY,
      maxX: posX + COMBAT_W - 1,
      maxY: posY + COMBAT_H - 1,
    });
  }

  const sheetWebp = await sharp(sheetBlank)
    .composite(sheetComposites)
    .webp({ lossless: true })
    .toBuffer();

  await fs.writeFile('public/assets/zavarce-v5.webp', sheetWebp);
  console.log(`Saved public/assets/zavarce-v5.webp (${sheetWebp.length} bytes)`);

  // ----------------------------------------------------
  // MANIFEST 1: shared/portrait-busts.json
  // ----------------------------------------------------
  const bustsJson = JSON.parse(await fs.readFile('shared/portrait-busts.json', 'utf8'));
  bustsJson.zavarce = {
    file: "bust-zavarce-v5",
    source: "zavarce-v5",
    sourceSha256: sha256(sheetWebp),
    sha256: sha256(bustWebp),
    frame: 0,
    bodyHeight: COMBAT_H,
    selectionHeight: 375,
    left: -Math.round(BUST_W / 2),
    center: 0,
    width: BUST_W,
    height: BUST_H,
    mirror: 1,
    rows: BUST_H,
    x: 2,
    y: 2
  };
  await fs.writeFile('shared/portrait-busts.json', JSON.stringify(bustsJson, null, 2) + '\n');
  console.log('Updated shared/portrait-busts.json');

  // ----------------------------------------------------
  // MANIFEST 2: shared/entrance-assets.json
  // ----------------------------------------------------
  const entranceJson = JSON.parse(await fs.readFile('shared/entrance-assets.json', 'utf8'));
  entranceJson.zavarce = {
    file: "zavarce-defiant-entrance",
    cell: 512,
    bodyHeight: 400,
    baseline: 492,
    anchorX: 256,
    width: 1536,
    height: 1024,
    frames: entranceFrames,
  };
  await fs.writeFile('shared/entrance-assets.json', JSON.stringify(entranceJson, null, 2) + '\n');
  console.log('Updated shared/entrance-assets.json');

  // ----------------------------------------------------
  // MANIFEST 3: shared/sprite-geometry.json
  // ----------------------------------------------------
  const geomJson = JSON.parse(await fs.readFile('shared/sprite-geometry.json', 'utf8'));
  const geomEntry = geomJson.sprites.find(s => s.id === 'zavarce');
  if (geomEntry && geomEntry.files[0]) {
    geomEntry.files[0].width = SHEET_W;
    geomEntry.files[0].height = SHEET_H;
    geomEntry.files[0].passed = true;
    geomEntry.files[0].components = spriteComponents;
  }
  await fs.writeFile('shared/sprite-geometry.json', JSON.stringify(geomJson, null, 2) + '\n');
  console.log('Updated shared/sprite-geometry.json');

  // ----------------------------------------------------
  // FIGHTERS JSON: portraitLift
  // ----------------------------------------------------
  for (const path of ['shared/fighters.json', 'shared/fighters.all.json']) {
    const fighters = JSON.parse(await fs.readFile(path, 'utf8'));
    const zav = fighters.find(f => f.id === 'zavarce');
    if (zav) {
      zav.name = "Armandito";
      zav.shortName = "Armandito";
      zav.portraitLift = 0.02; // Sits nicely framed higher up on card
    }
    await fs.writeFile(path, JSON.stringify(fighters, null, 2) + '\n');
    console.log(`Updated ${path} with portraitLift: 0.02`);
  }

  console.log('Armandito assets generation complete!');
}

main().catch(err => {
  console.error('Error in generate-armandito-assets:', err);
  process.exit(1);
});
