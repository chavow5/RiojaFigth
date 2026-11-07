import sharp from 'sharp';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

const INPUT = 'C:/Users/david/.gemini/antigravity-cli/brain/b457e353-0c2b-412a-b59e-9832c9e1fe39/la_teresita_spritesheet_1794066112045.jpg';
const TRANSPARENT_SRC = 'C:/Users/david/.gemini/antigravity-cli/brain/b457e353-0c2b-412a-b59e-9832c9e1fe39/la_teresita_transparent.png';

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

async function makeTransparent() {
  const { data, info } = await sharp(INPUT).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const isWhite = (idx) => {
    const r = data[idx * 3];
    const g = data[idx * 3 + 1];
    const b = data[idx * 3 + 2];
    return r > 230 && g > 230 && b > 230;
  };

  const bg = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0, tail = 0;

  for (let x = 0; x < width; x++) {
    if (isWhite(x)) { bg[x] = 1; queue[tail++] = x; }
    const bot = (height - 1) * width + x;
    if (isWhite(bot) && !bg[bot]) { bg[bot] = 1; queue[tail++] = bot; }
  }
  for (let y = 0; y < height; y++) {
    const left = y * width;
    if (isWhite(left) && !bg[left]) { bg[left] = 1; queue[tail++] = left; }
    const right = y * width + (width - 1);
    if (isWhite(right) && !bg[right]) { bg[right] = 1; queue[tail++] = right; }
  }

  const midY = Math.floor(height / 2);
  for (let x = 0; x < width; x++) {
    const idx = midY * width + x;
    if (isWhite(idx) && !bg[idx]) { bg[idx] = 1; queue[tail++] = idx; }
  }

  while (head < tail) {
    const p = queue[head++];
    const x = p % width;
    const y = Math.floor(p / width);
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const np = ny * width + nx;
        if (!bg[np] && isWhite(np)) {
          bg[np] = 1;
          queue[tail++] = np;
        }
      }
    }
  }

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    if (r > 248 && g > 248 && b > 248) {
      bg[i] = 1;
    }
  }

  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    if (bg[i]) {
      rgba[i * 4 + 3] = 0;
    } else {
      const brightness = (r + g + b) / 3;
      if (brightness > 220) {
        const a = Math.round(255 * (1 - (brightness - 220) / (255 - 220)));
        rgba[i * 4 + 3] = Math.max(30, Math.min(255, a));
      } else {
        rgba[i * 4 + 3] = 255;
      }
    }
  }

  await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toFile(TRANSPARENT_SRC);
  console.log(`Saved clean transparent image to ${TRANSPARENT_SRC}`);
}

async function main() {
  console.log('=== Updating all assets for La Teresita (maite) ===');
  await makeTransparent();

  // Bounding boxes in la_teresita_transparent.png:
  // 0: Idle guard [22, 22, 289, 421] -> 268x400
  // 1: Block guard [323, 23, 622, 421] -> 300x399
  // 2: Walk stride A [671, 22, 910, 420] -> 240x399
  // 3: Walk stride B [987, 22, 1229, 421] -> 243x400
  // 4: Airborne Jump [67, 433, 244, 793] -> 178x361
  // 5: Punch strike [316, 452, 624, 847] -> 309x396
  // 6: Kick strike [640, 447, 942, 844] -> 303x398
  // 7: Hurt recoil [985, 465, 1256, 847] -> 272x383

  const bboxes = [
    { x: 22, y: 22, w: 268, h: 400, name: 'idle' },
    { x: 323, y: 23, w: 300, h: 399, name: 'guard' },
    { x: 671, y: 22, w: 240, h: 399, name: 'walkA' },
    { x: 987, y: 22, w: 243, h: 400, name: 'walkB' },
    { x: 67, y: 433, w: 178, h: 361, name: 'jump' },
    { x: 316, y: 452, w: 309, h: 396, name: 'punch' },
    { x: 640, y: 447, w: 303, h: 398, name: 'kick' },
    { x: 985, y: 465, w: 272, h: 383, name: 'hurt' },
  ];

  const scale = 418 / 400;
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
  // 1. COMBAT ATLAS: public/assets/maite-v3.webp (1774 x 887)
  // =========================================================================
  console.log('1. Generating combat atlas maite-v3.webp...');
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
  await fs.writeFile('public/assets/maite-v3.webp', atlasWebp);
  console.log(`Saved public/assets/maite-v3.webp (${atlasWebp.length} bytes)`);

  // Update shared/sprite-geometry.json
  const geometry = JSON.parse(await fs.readFile('shared/sprite-geometry.json', 'utf8'));
  let geoEntry = geometry.sprites.find((s) => s.id === 'maite');
  if (!geoEntry) {
    geoEntry = { id: 'maite', files: [] };
    geometry.sprites.push(geoEntry);
  }
  geoEntry.files = [
    {
      file: 'public/assets/maite-v3.webp',
      passed: true,
      width: 1774,
      height: 887,
      components: atlasComponents,
    },
  ];
  await fs.writeFile('shared/sprite-geometry.json', JSON.stringify(geometry, null, 2) + '\n');

  // =========================================================================
  // 2. PORTRAIT BUST: public/assets/bust-maite-v3.webp
  // =========================================================================
  console.log('2. Generating portrait bust-maite-v3.webp (preserving face from tere madera.png)...');
  const idleFig = poses[0];
  const BUST_W = idleFig.w + 4;
  const BUST_H = idleFig.h + 4;
  const bustWebp = await sharp(await transparent(BUST_W, BUST_H))
    .composite([{ input: idleFig.buffer, left: 2, top: 2 }])
    .webp({ lossless: true })
    .toBuffer();
  await fs.writeFile('public/assets/bust-maite-v3.webp', bustWebp);
  const bustHash = sha256(bustWebp);

  const busts = JSON.parse(await fs.readFile('shared/portrait-busts.json', 'utf8'));
  busts.maite = {
    file: 'bust-maite-v3',
    source: 'maite-v3',
    sourceSha256: bustHash,
    sha256: bustHash,
    frame: 0,
    bodyHeight: idleFig.h,
    selectionHeight: 375,
    left: -Math.round(idleFig.w / 2),
    center: 0,
    width: idleFig.w,
    height: idleFig.h,
    mirror: 1,
    rows: idleFig.h,
    x: 2,
    y: 2,
  };
  await fs.writeFile('shared/portrait-busts.json', JSON.stringify(busts, null, 2) + '\n');
  console.log(`Saved public/assets/bust-maite-v3.webp (${bustWebp.length} bytes)`);

  // =========================================================================
  // 3. ENTRANCE SHEET: public/assets/maite-defiant-entrance.webp (1536 x 1024)
  // =========================================================================
  console.log('3. Generating entrance maite-defiant-entrance.webp...');
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
  await fs.writeFile('public/assets/maite-defiant-entrance.webp', entranceWebp);

  const entrances = JSON.parse(await fs.readFile('shared/entrance-assets.json', 'utf8'));
  entrances.maite = {
    file: 'maite-defiant-entrance',
    cell: 512,
    bodyHeight: 418,
    baseline: 490,
    anchorX: 256,
    width: 1536,
    height: 1024,
    frames: entFrames,
  };
  await fs.writeFile('shared/entrance-assets.json', JSON.stringify(entrances, null, 2) + '\n');
  console.log(`Saved public/assets/maite-defiant-entrance.webp (${entranceWebp.length} bytes)`);

  console.log('=== All La Teresita assets successfully generated and saved! ===');
}

main().catch(console.error);
