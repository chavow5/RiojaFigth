import sharp from 'sharp';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

async function main() {
  console.log('Generating Felipe Álvarez assets...');

  const mediaCafe = 'C:/Users/david/.gemini/antigravity-cli/brain/78ce37ab-bcfe-44d9-88ed-59a831c00e63/.user_uploaded/uploaded_media_0_1794001545452.jpg';
  const mediaSheet = 'C:/Users/david/.gemini/antigravity-cli/brain/78ce37ab-bcfe-44d9-88ed-59a831c00e63/.user_uploaded/uploaded_media_2_1794001545452.png';
  const mediaPortrait = 'C:/Users/david/.gemini/antigravity-cli/brain/78ce37ab-bcfe-44d9-88ed-59a831c00e63/.user_uploaded/uploaded_media_3_1794001545452.png';

  // =========================================================================
  // 1. FINALE ULTI: finales-capriles-cafe.webp (1024x1024, transparent)
  // =========================================================================
  console.log('1. Processing finales-capriles-cafe.webp...');
  const cafeRaw = await sharp(mediaCafe).raw().toBuffer({ resolveWithObject: true });
  const cW = cafeRaw.info.width;
  const cH = cafeRaw.info.height;

  const alpha = new Uint8Array(cW * cH).fill(255);
  const queue = new Int32Array(cW * cH);
  let head = 0, tail = 0;

  const isBg = (x, y) => {
    const idx = (y * cW + x) * 3;
    const r = cafeRaw.data[idx], g = cafeRaw.data[idx + 1], b = cafeRaw.data[idx + 2];
    return Math.max(r, g, b) <= 22;
  };

  const visited = new Uint8Array(cW * cH);

  // Borders
  for (let x = 0; x < cW; x++) {
    if (isBg(x, 0)) { visited[x] = 1; queue[tail++] = x; }
    const bIdx = (cH - 1) * cW + x;
    if (isBg(x, cH - 1)) { visited[bIdx] = 1; queue[tail++] = bIdx; }
  }
  for (let y = 0; y < cH; y++) {
    const lIdx = y * cW;
    if (isBg(0, y) && !visited[lIdx]) { visited[lIdx] = 1; queue[tail++] = lIdx; }
    const rIdx = y * cW + cW - 1;
    if (isBg(cW - 1, y) && !visited[rIdx]) { visited[rIdx] = 1; queue[tail++] = rIdx; }
  }

  // Cross dividers (horizontal y=500..515, vertical x=495..515)
  for (let y = 495; y <= 515; y++) {
    for (let x = 0; x < cW; x++) {
      const idx = y * cW + x;
      if (isBg(x, y) && !visited[idx]) { visited[idx] = 1; queue[tail++] = idx; }
    }
  }
  for (let x = 495; x <= 515; x++) {
    for (let y = 0; y < cH; y++) {
      const idx = y * cW + x;
      if (isBg(x, y) && !visited[idx]) { visited[idx] = 1; queue[tail++] = idx; }
    }
  }

  while (head < tail) {
    const p = queue[head++];
    const x = p % cW;
    const y = Math.floor(p / cW);
    alpha[p] = 0;

    const neighbors = [
      x > 0 ? p - 1 : -1,
      x < cW - 1 ? p + 1 : -1,
      y > 0 ? p - cW : -1,
      y < cH - 1 ? p + cW : -1
    ];

    for (const np of neighbors) {
      if (np >= 0 && !visited[np]) {
        const nx = np % cW;
        const ny = Math.floor(np / cW);
        if (isBg(nx, ny)) {
          visited[np] = 1;
          queue[tail++] = np;
        }
      }
    }
  }

  // Feather edge
  const cafeRGBA = Buffer.alloc(cW * cH * 4);
  for (let y = 0; y < cH; y++) {
    for (let x = 0; x < cW; x++) {
      const idx = (y * cW + x) * 4;
      const sIdx = (y * cW + x) * 3;
      const p = y * cW + x;
      cafeRGBA[idx] = cafeRaw.data[sIdx];
      cafeRGBA[idx + 1] = cafeRaw.data[sIdx + 1];
      cafeRGBA[idx + 2] = cafeRaw.data[sIdx + 2];

      let a = alpha[p];
      if (a > 0) {
        const maxVal = Math.max(cafeRaw.data[sIdx], cafeRaw.data[sIdx + 1], cafeRaw.data[sIdx + 2]);
        if (maxVal < 40) {
          const hasZeroNeighbor = (x > 0 && alpha[p - 1] === 0) ||
                                  (x < cW - 1 && alpha[p + 1] === 0) ||
                                  (y > 0 && alpha[p - cW] === 0) ||
                                  (y < cH - 1 && alpha[p + cW] === 0);
          if (hasZeroNeighbor) {
            a = Math.min(255, Math.max(0, Math.round((maxVal - 10) * (255 / 30))));
          }
        }
      }
      cafeRGBA[idx + 3] = a;
    }
  }

  const cafeWebp = await sharp(cafeRGBA, { raw: { width: cW, height: cH, channels: 4 } })
    .webp({ lossless: true })
    .toBuffer();

  await fs.writeFile('public/assets/finales-capriles-cafe.webp', cafeWebp);
  console.log(`Saved public/assets/finales-capriles-cafe.webp (${cafeWebp.length} bytes)`);

  // Measure 4 quadrant frames for shared/finale-actor-assets.json
  const cafeQuads = [
    { x0: 0, x1: 512, y0: 0, y1: 512, spine: 230 },
    { x0: 512, x1: 1024, y0: 0, y1: 512, spine: 744 },
    { x0: 0, x1: 512, y0: 512, y1: 1024, spine: 234 },
    { x0: 512, x1: 1024, y0: 512, y1: 1024, spine: 737 }
  ];
  const cafeActorFrames = [];
  for (const q of cafeQuads) {
    let minX = q.x1, maxX = q.x0, minY = q.y1, maxY = q.y0;
    for (let y = q.y0; y < q.y1; y++) {
      for (let x = q.x0; x < q.x1; x++) {
        if (cafeRGBA[(y * cW + x) * 4 + 3] > 30) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    cafeActorFrames.push({
      x: minX,
      y: minY,
      width,
      height,
      bodyHeight: 440,
      anchorX: q.spine - minX
    });
  }

  const finaleActorJson = JSON.parse(await fs.readFile('shared/finale-actor-assets.json', 'utf8'));
  finaleActorJson.caprilesCafe = {
    file: "finales-capriles-cafe",
    frames: cafeActorFrames
  };
  await fs.writeFile('shared/finale-actor-assets.json', JSON.stringify(finaleActorJson, null, 2) + '\n');
  console.log('Updated shared/finale-actor-assets.json with Alvarez cafe frames');

  // =========================================================================
  // 2. COMBAT ATLAS: capriles-v39.webp (1774 x 887, 8 poses)
  // =========================================================================
  console.log('2. Processing capriles-v39.webp...');
  const sheetBuffer = await sharp(mediaSheet)
    .webp({ lossless: true })
    .toBuffer();

  await fs.writeFile('public/assets/capriles-v39.webp', sheetBuffer);
  console.log(`Saved public/assets/capriles-v39.webp (${sheetBuffer.length} bytes)`);

  // Measure 8 components in 1774 x 887
  const sheetRaw = await sharp(sheetBuffer).raw().toBuffer({ resolveWithObject: true });
  const tileW = sheetRaw.info.width / 4;
  const tileH = sheetRaw.info.height / 2;
  const spriteComponents = [];

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) {
      let minX = sheetRaw.info.width, maxX = 0, minY = sheetRaw.info.height, maxY = 0;
      const startX = Math.round(c * tileW);
      const endX = Math.round((c + 1) * tileW);
      const startY = Math.round(r * tileH);
      const endY = Math.round((r + 1) * tileH);
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          if (sheetRaw.data[(y * sheetRaw.info.width + x) * 4 + 3] > 30) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      spriteComponents.push({ minX, minY, maxX, maxY });
    }
  }

  const spriteGeom = JSON.parse(await fs.readFile('shared/sprite-geometry.json', 'utf8'));
  const capGeom = spriteGeom.sprites.find(s => s.id === 'capriles');
  if (capGeom && capGeom.files[0]) {
    capGeom.files[0].width = 1774;
    capGeom.files[0].height = 887;
    capGeom.files[0].passed = true;
    capGeom.files[0].components = spriteComponents;
  }
  await fs.writeFile('shared/sprite-geometry.json', JSON.stringify(spriteGeom, null, 2) + '\n');
  console.log('Updated shared/sprite-geometry.json for capriles');

  // =========================================================================
  // 3. ENTRANCE ANIMATION: capriles-v39-defiant-entrance.webp (2048 x 1024)
  // =========================================================================
  console.log('3. Processing capriles-v39-defiant-entrance.webp...');
  // 6 poses: Straighten (pose 1), Straighten (pose 1), Fold (pose 3), Fold (pose 4), Hold (pose 5), Stance (pose 0)
  const poseIndices = [1, 1, 3, 4, 5, 0];
  const entranceBlank = await sharp({
    create: {
      width: 2048,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).png().toBuffer();

  const entranceComposites = [];
  const entranceFrames = [];

  for (let i = 0; i < 6; i++) {
    const comp = spriteComponents[poseIndices[i]];
    const w = comp.maxX - comp.minX + 1;
    const h = comp.maxY - comp.minY + 1;

    const poseCrop = await sharp(sheetBuffer)
      .extract({ left: comp.minX, top: comp.minY, width: w, height: h })
      .png()
      .toBuffer();

    const col = i % 4;
    const row = Math.floor(i / 4);
    const slotX = col * 512;
    const slotY = row * 512;

    const posX = slotX + Math.round((512 - w) / 2);
    const posY = slotY + (482 - h);

    entranceComposites.push({ input: poseCrop, left: posX, top: posY });
    entranceFrames.push({
      x: posX,
      y: posY,
      width: w,
      height: h,
      slotX,
      slotY
    });
  }

  const entranceWebp = await sharp(entranceBlank)
    .composite(entranceComposites)
    .webp({ lossless: true })
    .toBuffer();

  await fs.writeFile('public/assets/capriles-v39-defiant-entrance.webp', entranceWebp);
  console.log(`Saved public/assets/capriles-v39-defiant-entrance.webp (${entranceWebp.length} bytes)`);

  const entranceJson = JSON.parse(await fs.readFile('shared/entrance-assets.json', 'utf8'));
  entranceJson.capriles = {
    file: "capriles-v39-defiant-entrance",
    cell: 512,
    bodyHeight: 432,
    baseline: 482,
    anchorX: 256,
    width: 2048,
    height: 1024,
    frames: entranceFrames
  };
  await fs.writeFile('shared/entrance-assets.json', JSON.stringify(entranceJson, null, 2) + '\n');
  console.log('Updated shared/entrance-assets.json for capriles');

  // =========================================================================
  // 4. ROSTER CARD BUST: bust-capriles-v39.webp
  // =========================================================================
  console.log('4. Processing bust-capriles-v39.webp...');
  const portRaw = await sharp(mediaPortrait).raw().toBuffer({ resolveWithObject: true });
  let pMinX = portRaw.info.width, pMaxX = 0, pMinY = portRaw.info.height, pMaxY = 0;
  for (let y = 0; y < portRaw.info.height; y++) {
    for (let x = 0; x < portRaw.info.width; x++) {
      if (portRaw.data[(y * portRaw.info.width + x) * 4 + 3] > 30) {
        if (x < pMinX) pMinX = x;
        if (x > pMaxX) pMaxX = x;
        if (y < pMinY) pMinY = y;
        if (y > pMaxY) pMaxY = y;
      }
    }
  }
  const pW = pMaxX - pMinX + 1;
  const pH = pMaxY - pMinY + 1;

  const BUST_H = 428;
  const BUST_W = Math.round(BUST_H * (pW / pH)); // 317

  const croppedPortrait = await sharp(mediaPortrait)
    .extract({ left: pMinX, top: pMinY, width: pW, height: pH })
    .resize(BUST_W, BUST_H)
    .png()
    .toBuffer();

  const bustBlank = await sharp({
    create: {
      width: BUST_W + 4,
      height: BUST_H + 4,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).png().toBuffer();

  const bustWebp = await sharp(bustBlank)
    .composite([{ input: croppedPortrait, left: 2, top: 2 }])
    .webp({ lossless: true })
    .toBuffer();

  await fs.writeFile('public/assets/bust-capriles-v39.webp', bustWebp);
  console.log(`Saved public/assets/bust-capriles-v39.webp (${bustWebp.length} bytes)`);

  const bustsJson = JSON.parse(await fs.readFile('shared/portrait-busts.json', 'utf8'));
  bustsJson.capriles = {
    file: "bust-capriles-v39",
    source: "capriles-v39",
    sourceSha256: sha256(sheetBuffer),
    sha256: sha256(bustWebp),
    frame: 0,
    bodyHeight: BUST_H,
    selectionHeight: 375,
    left: -Math.round(BUST_W / 2),
    center: 9, // Dead-center alignment of head/nose on roster card
    width: BUST_W,
    height: BUST_H,
    mirror: 1,
    rows: BUST_H,
    x: 2,
    y: 2
  };
  await fs.writeFile('shared/portrait-busts.json', JSON.stringify(bustsJson, null, 2) + '\n');
  console.log('Updated shared/portrait-busts.json for capriles');

  // =========================================================================
  // 5. FIGHTER DETAILS: shared/fighters.json & shared/fighters.all.json
  // =========================================================================
  console.log('5. Updating fighters metadata...');
  for (const path of ['shared/fighters.json', 'shared/fighters.all.json']) {
    const fighters = JSON.parse(await fs.readFile(path, 'utf8'));
    const f = fighters.find(x => x.id === 'capriles');
    if (f) {
      f.name = "Felipe Álvarez";
      f.shortName = "Álvarez";
      f.title = "Diputado Nacional";
      f.description = "Dirigente y referente de la oposición riojana. Con paso ágil y postura firme, debate y contraataca sin dar tregua en la arena.";
      f.portraitLift = 0.02; // Nicely lifted and framed card preview
      f.special = "Sprint de Debate";
      f.combos = [
        "Interpelación",
        "Paso Firme",
        "Contraataque"
      ];
    }
    await fs.writeFile(path, JSON.stringify(fighters, null, 2) + '\n');
    console.log(`Updated ${path}`);
  }

  // =========================================================================
  // 6. FINALE LORE: shared/finales.ts
  // =========================================================================
  console.log('6. Updating shared/finales.ts...');
  let finalesTs = await fs.readFile('shared/finales.ts', 'utf8');
  finalesTs = finalesTs.replace(
    /\[\s*"capriles",\s*"[^"]*",\s*"conversation",\s*"[^"]*",\s*"[^"]*",\s*"[^"]*",\s*"coffee",\s*\]/,
    `[
    "capriles",
    "Cafecito de debate",
    "conversation",
    "Sienta al rival a su lado en una mesa con dos sillas. Entre sorbos de café debate con firmeza mientras le quita vida con cada pausa.",
    "Mesa, dos sillas y café",
    "¡Tomate un cafecito!",
    "coffee",
  ]`
  );
  await fs.writeFile('shared/finales.ts', finalesTs);
  console.log('Updated shared/finales.ts');

  console.log('Felipe Álvarez replacement complete!');
}

main().catch(err => {
  console.error('Error generating Alvarez assets:', err);
  process.exit(1);
});
