import sharp from 'sharp';
import fs from 'node:fs/promises';
import { wineJetSvg, wineWhirlSvg, transparent, sha256 } from './coche-effects.mjs';

const TRANSPARENT_SRC = 'C:/Users/david/.gemini/antigravity-cli/brain/b457e353-0c2b-412a-b59e-9832c9e1fe39/coche_coche_transparent_test.png';

async function main() {
  console.log('=== Updating all assets for Coché Coché (conde) ===');

  const bboxes = [
    { x: 56, y: 27, w: 208, h: 394, name: 'idle' },
    { x: 365, y: 38, w: 215, h: 383, name: 'guard' },
    { x: 674, y: 36, w: 229, h: 385, name: 'walkA' },
    { x: 1000, y: 33, w: 196, h: 388, name: 'walkB' },
    { x: 61, y: 435, w: 182, h: 340, name: 'jump' },
    { x: 321, y: 471, w: 332, h: 377, name: 'punch' },
    { x: 659, y: 461, w: 302, h: 384, name: 'kick' },
    { x: 994, y: 471, w: 235, h: 377, name: 'hurt' },
  ];

  const scale = 418 / 394;
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
  // 1. COMBAT ATLAS: public/assets/conde-v3.webp (1774 x 887)
  // =========================================================================
  console.log('1. Generating combat atlas conde-v3.webp...');
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
  await fs.writeFile('public/assets/conde-v3.webp', atlasWebp);
  console.log(`Saved public/assets/conde-v3.webp (${atlasWebp.length} bytes)`);

  // Update shared/sprite-geometry.json
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
      components: atlasComponents,
    },
  ];
  await fs.writeFile('shared/sprite-geometry.json', JSON.stringify(geometry, null, 2) + '\n');

  // =========================================================================
  // 2. PORTRAIT BUST: public/assets/bust-conde-v3.webp
  // =========================================================================
  console.log('2. Generating portrait bust-conde-v3.webp...');
  // Use idle pose (Pose 0)
  const idleFig = poses[0];
  const BUST_W = idleFig.w + 4;
  const BUST_H = idleFig.h + 4;
  const bustWebp = await sharp(await transparent(BUST_W, BUST_H))
    .composite([{ input: idleFig.buffer, left: 2, top: 2 }])
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
  console.log(`Saved public/assets/bust-conde-v3.webp (${bustWebp.length} bytes)`);

  // =========================================================================
  // 3. ENTRANCE ANIMATION: public/assets/conde-entrance-v1.webp (1536 x 1024)
  // =========================================================================
  console.log('3. Generating entrance conde-entrance-v1.webp...');
  // 6 frames in 3x2 grid of 512x512
  // Poses for entrance: WalkA -> WalkB -> Idle -> Guard -> Punch (gesture) -> Idle
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
  await fs.writeFile('public/assets/conde-entrance-v1.webp', entranceWebp);

  const entrances = JSON.parse(await fs.readFile('shared/entrance-assets.json', 'utf8'));
  entrances.conde = {
    file: 'conde-entrance-v1',
    cell: 512,
    bodyHeight: 418,
    baseline: 490,
    anchorX: 256,
    width: 1536,
    height: 1024,
    frames: entFrames,
  };
  await fs.writeFile('shared/entrance-assets.json', JSON.stringify(entrances, null, 2) + '\n');
  console.log(`Saved public/assets/conde-entrance-v1.webp (${entranceWebp.length} bytes)`);

  // =========================================================================
  // 4. ATTACK SHEET: public/assets/attack-conde-bond-v1.webp (2048 x 1024)
  // =========================================================================
  console.log('4. Generating attack-conde-bond-v1.webp with wine attack effects...');
  // 8 poses in 4x2 grid of 512x512
  // Row 0: ready, guard, run, jump
  // Row 1: punch (with wine jet), kick, hurt, whirl (with wine whirl)
  const wineJet = await wineJetSvg(512, 512);
  const wineWhirl = await wineWhirlSvg(512, 512);

  const attackPoseConfigs = [
    { name: 'ready', pose: 0, col: 0, row: 0, dx: 0, dy: 0 },
    { name: 'guard', pose: 1, col: 1, row: 0, dx: 0, dy: 0 },
    { name: 'run', pose: 2, col: 2, row: 0, dx: 0, dy: 0 },
    { name: 'jump', pose: 4, col: 3, row: 0, dx: 0, dy: -25 },
    { name: 'punch', pose: 5, col: 0, row: 1, dx: -30, dy: 0, effect: wineJet },
    { name: 'kick', pose: 6, col: 1, row: 1, dx: 0, dy: 0 },
    { name: 'hurt', pose: 7, col: 2, row: 1, dx: 0, dy: 0 },
    { name: 'whirl', pose: 5, col: 3, row: 1, dx: 0, dy: 0, effect: wineWhirl },
  ];

  const attComps = [];
  const attFrames = {};

  for (const cfg of attackPoseConfigs) {
    const fig = poses[cfg.pose];
    const slotX = cfg.col * 512;
    const slotY = cfg.row * 512;
    const x = slotX + Math.round((512 - fig.w) / 2) + cfg.dx;
    const y = slotY + 486 - fig.h + cfg.dy;

    if (cfg.effect) {
      attComps.push({ input: cfg.effect, left: slotX, top: slotY });
    }
    attComps.push({ input: fig.buffer, left: x, top: y });

    attFrames[cfg.name] = {
      x,
      y,
      width: fig.w,
      height: fig.h,
      anchorX: Math.round(fig.w / 2),
      anchorY: fig.h,
      bodyHeight: 418,
    };
  }

  const attackWebp = await sharp(await transparent(2048, 1024))
    .composite(attComps)
    .webp({ lossless: true })
    .toBuffer();
  await fs.writeFile('public/assets/attack-conde-bond-v1.webp', attackWebp);

  const attacks = JSON.parse(await fs.readFile('shared/attack-assets.json', 'utf8'));
  attacks.conde = {
    file: 'attack-conde-bond-v1',
    frames: attFrames,
  };
  await fs.writeFile('shared/attack-assets.json', JSON.stringify(attacks, null, 2) + '\n');
  console.log(`Saved public/assets/attack-conde-bond-v1.webp (${attackWebp.length} bytes)`);

  console.log('=== All Coché Coché assets successfully generated and saved! ===');
}

main().catch(console.error);
