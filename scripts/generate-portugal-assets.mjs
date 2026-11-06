import sharp from 'sharp';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

async function main() {
  console.log('Generating Josué Portugal assets...');

  const mediaAtlas = 'C:/Users/david/.gemini/antigravity-cli/brain/78ce37ab-bcfe-44d9-88ed-59a831c00e63/.user_uploaded/uploaded_media_0_1794003750296.jpg';
  const mediaPortrait = 'C:/Users/david/.gemini/antigravity-cli/brain/78ce37ab-bcfe-44d9-88ed-59a831c00e63/.user_uploaded/uploaded_media_1_1794003750296.png';
  const mediaAttack = 'C:/Users/david/.gemini/antigravity-cli/brain/78ce37ab-bcfe-44d9-88ed-59a831c00e63/.user_uploaded/uploaded_media_1794005942256.jpg';

  // =========================================================================
  // 1. COMBAT ATLAS: public/assets/vallenilla-v5.webp (1774 x 887, 8 poses)
  // =========================================================================
  console.log('1. Processing combat atlas public/assets/vallenilla-v5.webp...');
  const atlasRaw = await sharp(mediaAtlas).raw().toBuffer({ resolveWithObject: true });
  const aW = atlasRaw.info.width;
  const aH = atlasRaw.info.height;

  const aAlpha = new Uint8Array(aW * aH).fill(255);
  const aQueue = new Int32Array(aW * aH);
  let aHead = 0, aTail = 0;

  const isAtlasBg = (x, y) => {
    const idx = (y * aW + x) * 3;
    return Math.max(atlasRaw.data[idx], atlasRaw.data[idx + 1], atlasRaw.data[idx + 2]) <= 25;
  };

  const aVisited = new Uint8Array(aW * aH);

  // Outer borders
  for (let x = 0; x < aW; x++) {
    if (isAtlasBg(x, 0)) { aVisited[x] = 1; aQueue[aTail++] = x; }
    const bIdx = (aH - 1) * aW + x;
    if (isAtlasBg(x, aH - 1) && !aVisited[bIdx]) { aVisited[bIdx] = 1; aQueue[aTail++] = bIdx; }
  }
  for (let y = 0; y < aH; y++) {
    const lIdx = y * aW;
    if (isAtlasBg(0, y) && !aVisited[lIdx]) { aVisited[lIdx] = 1; aQueue[aTail++] = lIdx; }
    const rIdx = y * aW + aW - 1;
    if (isAtlasBg(aW - 1, y) && !aVisited[rIdx]) { aVisited[rIdx] = 1; aQueue[aTail++] = rIdx; }
  }

  // Grid dividers (4 cols: x = 500, 1000, 1500; 2 rows: y = 494)
  for (const cx of [500, 1000, 1500]) {
    for (let y = 0; y < aH; y++) {
      const idx = y * aW + cx;
      if (isAtlasBg(cx, y) && !aVisited[idx]) { aVisited[idx] = 1; aQueue[aTail++] = idx; }
    }
  }
  for (let x = 0; x < aW; x++) {
    const idx = 494 * aW + x;
    if (isAtlasBg(x, 494) && !aVisited[idx]) { aVisited[idx] = 1; aQueue[aTail++] = idx; }
  }

  // Seed enclosed pocket between arm & trekking pole in pose 3
  const seedIdx1 = 260 * aW + 1820;
  if (isAtlasBg(1820, 260) && !aVisited[seedIdx1]) {
    aVisited[seedIdx1] = 1;
    aQueue[aTail++] = seedIdx1;
  }

  while (aHead < aTail) {
    const p = aQueue[aHead++];
    const x = p % aW;
    const y = Math.floor(p / aW);
    aAlpha[p] = 0;

    const neighbors = [
      x > 0 ? p - 1 : -1,
      x < aW - 1 ? p + 1 : -1,
      y > 0 ? p - aW : -1,
      y < aH - 1 ? p + aW : -1
    ];

    for (const np of neighbors) {
      if (np >= 0 && !aVisited[np]) {
        const nx = np % aW;
        const ny = Math.floor(np / aW);
        if (isAtlasBg(nx, ny)) {
          aVisited[np] = 1;
          aQueue[aTail++] = np;
        }
      }
    }
  }

  // Feather edges
  const atlasRGBA = Buffer.alloc(aW * aH * 4);
  for (let y = 0; y < aH; y++) {
    for (let x = 0; x < aW; x++) {
      const idx = (y * aW + x) * 4;
      const sIdx = (y * aW + x) * 3;
      const p = y * aW + x;
      atlasRGBA[idx] = atlasRaw.data[sIdx];
      atlasRGBA[idx + 1] = atlasRaw.data[sIdx + 1];
      atlasRGBA[idx + 2] = atlasRaw.data[sIdx + 2];

      let a = aAlpha[p];
      if (a > 0) {
        const maxVal = Math.max(atlasRaw.data[sIdx], atlasRaw.data[sIdx + 1], atlasRaw.data[sIdx + 2]);
        if (maxVal < 40) {
          const hasZeroNeighbor = (x > 0 && aAlpha[p - 1] === 0) ||
                                  (x < aW - 1 && aAlpha[p + 1] === 0) ||
                                  (y > 0 && aAlpha[p - aW] === 0) ||
                                  (y < aH - 1 && aAlpha[p + aW] === 0);
          if (hasZeroNeighbor) {
            a = Math.min(255, Math.max(0, Math.round((maxVal - 10) * (255 / 30))));
          }
        }
      }
      atlasRGBA[idx + 3] = a;
    }
  }

  // Resize to 1774 x 887 standard combat atlas format
  const atlasWebp = await sharp(atlasRGBA, { raw: { width: aW, height: aH, channels: 4 } })
    .resize(1774, 887, { fit: 'fill' })
    .webp({ lossless: true })
    .toBuffer();

  await fs.writeFile('public/assets/vallenilla-v5.webp', atlasWebp);
  console.log(`Saved public/assets/vallenilla-v5.webp (${atlasWebp.length} bytes)`);

  // Measure 8 components in 1774 x 887
  const resizedAtlasRaw = await sharp(atlasWebp).raw().toBuffer({ resolveWithObject: true });
  const tileW = resizedAtlasRaw.info.width / 4;
  const tileH = resizedAtlasRaw.info.height / 2;
  const spriteComponents = [];

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) {
      let minX = resizedAtlasRaw.info.width, maxX = 0, minY = resizedAtlasRaw.info.height, maxY = 0;
      const startX = Math.round(c * tileW);
      const endX = Math.round((c + 1) * tileW);
      const startY = Math.round(r * tileH);
      const endY = Math.round((r + 1) * tileH);
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          if (resizedAtlasRaw.data[(y * resizedAtlasRaw.info.width + x) * 4 + 3] > 30) {
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
  const valGeom = spriteGeom.sprites.find(s => s.id === 'vallenilla');
  if (valGeom && valGeom.files[0]) {
    valGeom.files[0].width = 1774;
    valGeom.files[0].height = 887;
    valGeom.files[0].passed = true;
    valGeom.files[0].components = spriteComponents;
  }
  await fs.writeFile('shared/sprite-geometry.json', JSON.stringify(spriteGeom, null, 2) + '\n');
  console.log('Updated shared/sprite-geometry.json for vallenilla');

  // =========================================================================
  // 2. ROSTER CARD BUST: public/assets/bust-vallenilla-v5.webp
  // =========================================================================
  console.log('2. Processing bust-vallenilla-v5.webp...');
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

  const BUST_H = 430;
  const BUST_W = Math.round(BUST_H * (pW / pH)); // ~206

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

  await fs.writeFile('public/assets/bust-vallenilla-v5.webp', bustWebp);
  console.log(`Saved public/assets/bust-vallenilla-v5.webp (${bustWebp.length} bytes)`);

  const bustsJson = JSON.parse(await fs.readFile('shared/portrait-busts.json', 'utf8'));
  bustsJson.vallenilla = {
    file: "bust-vallenilla-v5",
    source: "vallenilla-v5",
    sourceSha256: sha256(atlasWebp),
    sha256: sha256(bustWebp),
    frame: 0,
    bodyHeight: BUST_H,
    selectionHeight: 375,
    left: -Math.round(BUST_W / 2),
    center: -19, // Centered red helmet and face
    width: BUST_W,
    height: BUST_H,
    mirror: 1,
    rows: BUST_H,
    x: 2,
    y: 2
  };
  await fs.writeFile('shared/portrait-busts.json', JSON.stringify(bustsJson, null, 2) + '\n');
  console.log('Updated shared/portrait-busts.json for vallenilla');

  // =========================================================================
  // 3. ENTRANCE ANIMATION: public/assets/vallenilla-defiant-entrance.webp
  // =========================================================================
  console.log('3. Processing vallenilla-defiant-entrance.webp (1536 x 1024)...');
  // 6 poses: [0, 1, 2, 5, 1, 0]
  const poseIndices = [0, 1, 2, 5, 1, 0];
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

  for (let i = 0; i < 6; i++) {
    const comp = spriteComponents[poseIndices[i]];
    const w = comp.maxX - comp.minX + 1;
    const h = comp.maxY - comp.minY + 1;

    const poseCrop = await sharp(atlasWebp)
      .extract({ left: comp.minX, top: comp.minY, width: w, height: h })
      .png()
      .toBuffer();

    const col = i % 3;
    const row = Math.floor(i / 3);
    const slotX = col * 512;
    const slotY = row * 512;

    const posX = slotX + Math.round((512 - w) / 2);
    const posY = slotY + (492 - h);

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

  await fs.writeFile('public/assets/vallenilla-defiant-entrance.webp', entranceWebp);
  console.log(`Saved public/assets/vallenilla-defiant-entrance.webp (${entranceWebp.length} bytes)`);

  const entranceJson = JSON.parse(await fs.readFile('shared/entrance-assets.json', 'utf8'));
  entranceJson.vallenilla = {
    file: "vallenilla-defiant-entrance",
    cell: 512,
    bodyHeight: 400,
    baseline: 492,
    anchorX: 256,
    width: 1536,
    height: 1024,
    frames: entranceFrames
  };
  await fs.writeFile('shared/entrance-assets.json', JSON.stringify(entranceJson, null, 2) + '\n');
  console.log('Updated shared/entrance-assets.json for vallenilla');

  // =========================================================================
  // 4. ATTACK SHEET: public/assets/vallenilla-cashea-attack-v1.webp (1536 x 1024)
  // =========================================================================
  console.log('4. Processing attack sheet public/assets/vallenilla-cashea-attack-v1.webp...');
  const atkRaw = await sharp(mediaAttack).raw().toBuffer({ resolveWithObject: true });
  const atkW = atkRaw.info.width;
  const atkH = atkRaw.info.height;

  const atkAlpha = new Uint8Array(atkW * atkH).fill(255);
  const atkQueue = new Int32Array(atkW * atkH);
  let atkHead = 0, atkTail = 0;

  const isAtkBg = (x, y) => {
    const idx = (y * atkW + x) * 3;
    return Math.max(atkRaw.data[idx], atkRaw.data[idx + 1], atkRaw.data[idx + 2]) <= 25;
  };

  const atkVisited = new Uint8Array(atkW * atkH);

  // Borders
  for (let x = 0; x < atkW; x++) {
    if (isAtkBg(x, 0)) { atkVisited[x] = 1; atkQueue[atkTail++] = x; }
    const bIdx = (atkH - 1) * atkW + x;
    if (isAtkBg(x, atkH - 1) && !atkVisited[bIdx]) { atkVisited[bIdx] = 1; atkQueue[atkTail++] = bIdx; }
    const midIdx = 670 * atkW + x;
    if (isAtkBg(x, 670) && !atkVisited[midIdx]) { atkVisited[midIdx] = 1; atkQueue[atkTail++] = midIdx; }
  }
  for (let y = 0; y < atkH; y++) {
    const lIdx = y * atkW;
    if (isAtkBg(0, y) && !atkVisited[lIdx]) { atkVisited[lIdx] = 1; atkQueue[atkTail++] = lIdx; }
    const rIdx = y * atkW + atkW - 1;
    if (isAtkBg(atkW - 1, y) && !atkVisited[rIdx]) { atkVisited[rIdx] = 1; atkQueue[atkTail++] = rIdx; }
    const c1Idx = y * atkW + 666;
    if (isAtkBg(666, y) && !atkVisited[c1Idx]) { atkVisited[c1Idx] = 1; atkQueue[atkTail++] = c1Idx; }
    const c2Idx = y * atkW + 1333;
    if (isAtkBg(1333, y) && !atkVisited[c2Idx]) { atkVisited[c2Idx] = 1; atkQueue[atkTail++] = c2Idx; }
  }

  // Seed enclosed pocket between cardon feet
  const seedIdx2 = 1190 * atkW + 1510;
  if (isAtkBg(1510, 1190) && !atkVisited[seedIdx2]) {
    atkVisited[seedIdx2] = 1;
    atkQueue[atkTail++] = seedIdx2;
  }

  while (atkHead < atkTail) {
    const p = atkQueue[atkHead++];
    const x = p % atkW;
    const y = Math.floor(p / atkW);
    atkAlpha[p] = 0;

    const neighbors = [
      x > 0 ? p - 1 : -1,
      x < atkW - 1 ? p + 1 : -1,
      y > 0 ? p - atkW : -1,
      y < atkH - 1 ? p + atkW : -1
    ];

    for (const np of neighbors) {
      if (np >= 0 && !atkVisited[np]) {
        const nx = np % atkW;
        const ny = Math.floor(np / atkW);
        if (isAtkBg(nx, ny)) {
          atkVisited[np] = 1;
          atkQueue[atkTail++] = np;
        }
      }
    }
  }

  // Feather edges
  const atkRGBA = Buffer.alloc(atkW * atkH * 4);
  for (let y = 0; y < atkH; y++) {
    for (let x = 0; x < atkW; x++) {
      const idx = (y * atkW + x) * 4;
      const sIdx = (y * atkW + x) * 3;
      const p = y * atkW + x;
      atkRGBA[idx] = atkRaw.data[sIdx];
      atkRGBA[idx + 1] = atkRaw.data[sIdx + 1];
      atkRGBA[idx + 2] = atkRaw.data[sIdx + 2];

      let a = atkAlpha[p];
      if (a > 0) {
        const maxVal = Math.max(atkRaw.data[sIdx], atkRaw.data[sIdx + 1], atkRaw.data[sIdx + 2]);
        if (maxVal < 40) {
          const hasZeroNeighbor = (x > 0 && atkAlpha[p - 1] === 0) ||
                                  (x < atkW - 1 && atkAlpha[p + 1] === 0) ||
                                  (y > 0 && atkAlpha[p - atkW] === 0) ||
                                  (y < atkH - 1 && atkAlpha[p + atkW] === 0);
          if (hasZeroNeighbor) {
            a = Math.min(255, Math.max(0, Math.round((maxVal - 10) * (255 / 30))));
          }
        }
      }
      atkRGBA[idx + 3] = a;
    }
  }

  const attackWebp = await sharp(atkRGBA, { raw: { width: atkW, height: atkH, channels: 4 } })
    .resize(1536, 1024, { fit: 'fill' })
    .webp({ lossless: true })
    .toBuffer();

  await fs.writeFile('public/assets/vallenilla-cashea-attack-v1.webp', attackWebp);
  console.log(`Saved public/assets/vallenilla-cashea-attack-v1.webp (${attackWebp.length} bytes)`);

  // Measure the 6 frames in 1536 x 1024 (3 cols x 2 rows, each 512 x 512)
  const atkResizedRaw = await sharp(attackWebp).raw().toBuffer({ resolveWithObject: true });
  const cellW = 512;
  const cellH = 512;
  const frameCoords = {};

  const cellNames = [
    ['ready', 'summon', 'guard'],
    ['jab', 'hook', 'uppercut']
  ];

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      let minX = 1536, maxX = 0, minY = 1024, maxY = 0;
      const x0 = c * cellW;
      const x1 = (c + 1) * cellW;
      const y0 = r * cellH;
      const y1 = (r + 1) * cellH;

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          if (atkResizedRaw.data[(y * 1536 + x) * 4 + 3] > 30) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      frameCoords[cellNames[r][c]] = {
        x: minX,
        y: minY,
        width: w,
        height: h,
        anchorX: Math.round(w / 2),
        anchorY: h,
        bodyHeight: h
      };
    }
  }

  // Set "box" (projectile) to the Cardón frame (hook) so Cardón flies forward as the projectile!
  frameCoords.box = { ...frameCoords.hook };

  const attackAssetsJson = JSON.parse(await fs.readFile('shared/attack-assets.json', 'utf8'));
  attackAssetsJson.vallenilla = {
    file: "vallenilla-cashea-attack-v1",
    frames: frameCoords
  };
  await fs.writeFile('shared/attack-assets.json', JSON.stringify(attackAssetsJson, null, 2) + '\n');
  console.log('Updated shared/attack-assets.json for vallenilla');

  // =========================================================================
  // 5. CLEANUP SEATED RIVAL IN shared/finale-actor-assets.json
  // =========================================================================
  const finaleActorJson = JSON.parse(await fs.readFile('shared/finale-actor-assets.json', 'utf8'));
  if (finaleActorJson.seated && finaleActorJson.seated.vallenilla) {
    delete finaleActorJson.seated.vallenilla;
    await fs.writeFile('shared/finale-actor-assets.json', JSON.stringify(finaleActorJson, null, 2) + '\n');
    console.log('Removed vallenilla from finale-actor-assets.json seated');
  }

  // =========================================================================
  // 6. ROSTER FILTERING: shared/fighters.json & shared/fighters.all.json
  // =========================================================================
  console.log('6. Updating fighters metadata and cleaning roster...');
  const portDef = {
    id: "vallenilla",
    sprite: "vallenilla-v5",
    category: "founders",
    name: "Josué Portugal",
    shortName: "Portugal",
    title: "Guía del Famatina",
    role: "CONTROL",
    color: "#e63946",
    description: "Guía andino y explorador del cerro Famatina. Equipado con bastones de trekking y paso firme en la roca, invoca a los cardones riojanos para defender la cordillera.",
    speed: 4.6,
    damage: 1.01,
    armor: 0.96,
    stats: [4, 3, 4],
    ability: "installments",
    special: "Ataque del Cardón",
    combos: ["Marcha Andina", "Golpe de Bastón", "Espina Brava"],
    portraitLift: 0.02
  };

  // Update fighters.all.json
  const allFighters = JSON.parse(await fs.readFile('shared/fighters.all.json', 'utf8'));
  const idxAll = allFighters.findIndex(x => x.id === 'vallenilla');
  if (idxAll !== -1) {
    allFighters[idxAll] = { ...allFighters[idxAll], ...portDef };
  } else {
    allFighters.push(portDef);
  }
  await fs.writeFile('shared/fighters.all.json', JSON.stringify(allFighters, null, 2) + '\n');
  console.log('Updated shared/fighters.all.json');

  // Filter shared/fighters.json to ONLY the 4 Riojan fighters: zavarce, vallenilla, capriles, emilio
  const activeIds = ['zavarce', 'vallenilla', 'capriles', 'emilio'];
  const curFighters = JSON.parse(await fs.readFile('shared/fighters.json', 'utf8'));
  const cleanedFighters = [];

  for (const id of activeIds) {
    let f = curFighters.find(x => x.id === id) || allFighters.find(x => x.id === id);
    if (f) {
      if (id === 'vallenilla') {
        f = { ...f, ...portDef };
      }
      cleanedFighters.push(f);
    }
  }

  await fs.writeFile('shared/fighters.json', JSON.stringify(cleanedFighters, null, 2) + '\n');
  console.log(`Updated shared/fighters.json (now exactly ${cleanedFighters.length} fighters: ${cleanedFighters.map(x => x.name).join(', ')})`);

  // =========================================================================
  // 7. FINALE TEXT: shared/finales.ts
  // =========================================================================
  console.log('7. Updating shared/finales.ts...');
  let finalesTs = await fs.readFile('shared/finales.ts', 'utf8');
  finalesTs = finalesTs.replace(
    /\[\s*"vallenilla",\s*"[^"]*",\s*"technology",\s*"[^"]*",\s*"[^"]*",\s*"[^"]*",\s*"hack",\s*\]/,
    `[
    "vallenilla",
    "Ataque del Cardón",
    "technology",
    "Josué alza sus bastones y convoca al Cardón del Famatina, que avanza implacable sobre el rival con sus brazos espinosos.",
    "Cardón del Famatina",
    "¡El Famatina no se toca!",
    "hack",
  ]`
  );
  await fs.writeFile('shared/finales.ts', finalesTs);
  console.log('Updated shared/finales.ts');

  console.log('Josué Portugal asset generation complete!');
}

main().catch(err => {
  console.error('Error generating Portugal assets:', err);
  process.exit(1);
});
