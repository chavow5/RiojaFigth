import sharp from 'sharp';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

const TRANSPARENT_SRC = 'C:/Users/david/.gemini/antigravity-cli/brain/b457e353-0c2b-412a-b59e-9832c9e1fe39/el_gallo_transparent.png';

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

async function main() {
  console.log('=== Updating all assets for El Gallo (simon) ===');

  // Source bounding boxes in el_gallo_transparent.png:
  // 0: Idle guard [54, 27, 265, 419] -> 212x393
  // 1: Block guard [361, 30, 586, 419] -> 226x390
  // 2: Walk stride A [669, 25, 914, 420] -> 246x396
  // 3: Walk stride B [994, 27, 1215, 422] -> 222x396
  // 4: Airborne Jump [55, 440, 253, 773] -> 199x334
  // 5: Punch/Harinazo [333, 464, 636, 847] -> 304x384
  // 6: Kick strike [652, 462, 978, 845] -> 327x384
  // 7: Hurt recoil [1011, 438, 1246, 847] -> 236x410

  const bboxes = [
    { x: 54, y: 27, w: 212, h: 393, name: 'idle' },
    { x: 361, y: 30, w: 226, h: 390, name: 'guard' },
    { x: 669, y: 25, w: 246, h: 396, name: 'walkA' },
    { x: 994, y: 27, w: 222, h: 396, name: 'walkB' },
    { x: 55, y: 440, w: 199, h: 334, name: 'jump' },
    { x: 333, y: 464, w: 304, h: 384, name: 'punch' },
    { x: 652, y: 462, w: 327, h: 384, name: 'kick' },
    { x: 1011, y: 438, w: 236, h: 410, name: 'hurt' },
  ];

  const scale = 418 / 393;
  const poses = [];
  for (let i = 0; i < 8; i++) {
    const b = bboxes[i];
    const w = Math.round(b.w * scale);
    const h = Math.round(b.h * scale);
    const buffer = await sharp(TRANSPARENT_SRC)
      .extract({ left: b.x, top: b.y, width: b.w, height: b.h })
      .resize(w, h, { fit: 'fill' })
      .png()
      .toBuffer();
    poses.push({ buffer, w, h, name: b.name });
  }

  // =========================================================================
  // 1. COMBAT ATLAS: public/assets/simon-v3.webp (1774 x 887)
  // =========================================================================
  console.log('1. Generating combat atlas simon-v3.webp...');
  const BASELINE_ROW0 = 432;
  const BASELINE_ROW1 = 870;
  const colCenters = [222, 665, 1109, 1552];

  const atlasComps = [];
  const atlasComponents = [];

  for (let i = 0; i < 8; i++) {
    const fig = poses[i];
    const col = i % 4;
    const row = Math.floor(i / 4);

    let left = colCenters[col] - Math.round(fig.w / 2);
    const minLeft = col * 443.5 + 4;
    const maxRight = (col + 1) * 443.5 - 4;
    if (left < minLeft) left = Math.round(minLeft);
    if (left + fig.w > maxRight) left = Math.round(maxRight - fig.w);

    let top;
    if (row === 0) {
      top = BASELINE_ROW0 - fig.h;
    } else {
      if (i === 4) top = 450;
      else top = BASELINE_ROW1 - fig.h;
    }

    console.log(`Pose ${i} (${fig.name}): size ${fig.w}x${fig.h}, pos [${left}, ${top}, ${left + fig.w - 1}, ${top + fig.h - 1}]`);
    atlasComps.push({ input: fig.buffer, left, top });
    atlasComponents.push({
      minX: left,
      minY: top,
      maxX: left + fig.w - 1,
      maxY: top + fig.h - 1,
    });
  }

  const atlasWebp = await sharp(await transparent(1774, 887))
    .composite(atlasComps)
    .webp({ lossless: true })
    .toBuffer();
  await fs.writeFile('public/assets/simon-v3.webp', atlasWebp);
  console.log(`Saved public/assets/simon-v3.webp (${atlasWebp.length} bytes)`);

  // Update shared/sprite-geometry.json
  const geometry = JSON.parse(await fs.readFile('shared/sprite-geometry.json', 'utf8'));
  let geoEntry = geometry.sprites.find((s) => s.id === 'simon');
  if (!geoEntry) {
    geoEntry = { id: 'simon', files: [] };
    geometry.sprites.push(geoEntry);
  }
  geoEntry.files = [
    {
      file: 'public/assets/simon-v3.webp',
      passed: true,
      width: 1774,
      height: 887,
      components: atlasComponents,
    },
  ];
  await fs.writeFile('shared/sprite-geometry.json', JSON.stringify(geometry, null, 2) + '\n');

  // =========================================================================
  // 2. PORTRAIT BUST: public/assets/bust-simon-v3.webp
  // =========================================================================
  console.log('2. Generating portrait bust-simon-v3.webp...');
  const idleFig = poses[0];
  const BUST_W = idleFig.w + 4;
  const BUST_H = idleFig.h + 4;
  const bustWebp = await sharp(await transparent(BUST_W, BUST_H))
    .composite([{ input: idleFig.buffer, left: 2, top: 2 }])
    .webp({ lossless: true })
    .toBuffer();
  await fs.writeFile('public/assets/bust-simon-v3.webp', bustWebp);
  const bustHash = sha256(bustWebp);

  const busts = JSON.parse(await fs.readFile('shared/portrait-busts.json', 'utf8'));
  busts.simon = {
    file: 'bust-simon-v3',
    source: 'simon-v3',
    sourceSha256: bustHash,
    sha256: bustHash,
    frame: 0,
    bodyHeight: idleFig.h,
    selectionHeight: 375,
    left: -Math.round(idleFig.w / 2),
    center: 18,
    width: idleFig.w,
    height: idleFig.h,
    mirror: 1,
    rows: idleFig.h,
    x: 2,
    y: 2,
  };
  await fs.writeFile('shared/portrait-busts.json', JSON.stringify(busts, null, 2) + '\n');
  console.log(`Saved public/assets/bust-simon-v3.webp (${bustWebp.length} bytes)`);

  // =========================================================================
  // 3. ENTRANCE SHEET: public/assets/simon-entrance-v1.webp (1536 x 1024)
  // =========================================================================
  console.log('3. Generating entrance simon-entrance-v1.webp...');
  // 6 frames in 3x2 grid of 512x512
  // Poses for entrance: WalkA -> WalkB -> Idle -> Guard -> Harinazo -> Idle
  const entrancePoseMap = [2, 3, 0, 1, 5, 0];
  const entComps = [];
  const entFrames = [];

  for (let i = 0; i < 6; i++) {
    const poseIdx = entrancePoseMap[i];
    const fig = poses[poseIdx];
    const slotX = (i % 3) * 512;
    const slotY = Math.floor(i / 3) * 512;
    const x = slotX + Math.round((512 - fig.w) / 2);
    const y = slotY + 490 - fig.h;

    entComps.push({ input: fig.buffer, left: x, top: y });
    entFrames.push({
      x,
      y,
      width: fig.w,
      height: fig.h,
      anchorX: Math.round(fig.w / 2),
      anchorY: fig.h,
      bodyHeight: 418,
      slotX,
      slotY,
    });
  }

  const entranceWebp = await sharp(await transparent(1536, 1024))
    .composite(entComps)
    .webp({ lossless: true })
    .toBuffer();
  await fs.writeFile('public/assets/simon-entrance-v1.webp', entranceWebp);

  const entrances = JSON.parse(await fs.readFile('shared/entrance-assets.json', 'utf8'));
  entrances.simon = {
    file: 'simon-entrance-v1',
    cell: 512,
    bodyHeight: 418,
    baseline: 490,
    anchorX: 256,
    width: 1536,
    height: 1024,
    frames: entFrames,
  };
  await fs.writeFile('shared/entrance-assets.json', JSON.stringify(entrances, null, 2) + '\n');
  console.log(`Saved public/assets/simon-entrance-v1.webp (${entranceWebp.length} bytes)`);

  console.log('=== All El Gallo assets successfully generated and saved! ===');
}

main().catch(console.error);
