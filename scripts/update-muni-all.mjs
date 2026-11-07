import sharp from 'sharp';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

const INPUT = 'C:/Users/david/.gemini/antigravity-cli/brain/b457e353-0c2b-412a-b59e-9832c9e1fe39/la_muni_spritesheet_1794065155151.jpg';
const TRANSPARENT_SRC = 'C:/Users/david/.gemini/antigravity-cli/brain/b457e353-0c2b-412a-b59e-9832c9e1fe39/la_muni_transparent.png';

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

  const isBg = (idx) => {
    const r = data[idx * 3];
    const g = data[idx * 3 + 1];
    const b = data[idx * 3 + 2];
    return r <= 9 && g <= 9 && b <= 9;
  };

  const bg = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0, tail = 0;

  // Border seeds
  for (let x = 0; x < width; x++) {
    if (isBg(x)) { bg[x] = 1; queue[tail++] = x; }
    const bot = (height - 1) * width + x;
    if (isBg(bot) && !bg[bot]) { bg[bot] = 1; queue[tail++] = bot; }
  }
  for (let y = 0; y < height; y++) {
    const left = y * width;
    if (isBg(left) && !bg[left]) { bg[left] = 1; queue[tail++] = left; }
    const right = y * width + (width - 1);
    if (isBg(right) && !bg[right]) { bg[right] = 1; queue[tail++] = right; }
  }

  while (head < tail) {
    const p = queue[head++];
    const x = p % width;
    const y = Math.floor(p / width);
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const np = ny * width + nx;
        if (!bg[np] && isBg(np)) {
          bg[np] = 1;
          queue[tail++] = np;
        }
      }
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
      if (brightness < 16) {
        const a = Math.round(255 * (brightness / 16));
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
  console.log('=== Updating all assets for La Muni (javier) ===');
  await makeTransparent();

  // Bounding boxes in la_muni_transparent.png:
  // 0: Idle guard [63, 36, 245, 417] -> 183x382
  // 1: Block guard [383, 36, 566, 417] -> 184x382
  // 2: Walk stride A [694, 34, 891, 415] -> 198x382
  // 3: Walk stride B [1014, 34, 1199, 417] -> 186x384
  // 4: Airborne Jump [69, 449, 237, 751] -> 169x303
  // 5: Punch strike [319, 480, 628, 839] -> 310x360
  // 6: Kick strike [648, 473, 944, 839] -> 297x367
  // 7: Hurt recoil [966, 487, 1260, 843] -> 295x357

  const bboxes = [
    { x: 63, y: 36, w: 183, h: 382, name: 'idle' },
    { x: 383, y: 36, w: 184, h: 382, name: 'guard' },
    { x: 694, y: 34, w: 198, h: 382, name: 'walkA' },
    { x: 1014, y: 34, w: 186, h: 384, name: 'walkB' },
    { x: 69, y: 449, w: 169, h: 303, name: 'jump' },
    { x: 319, y: 480, w: 310, h: 360, name: 'punch' },
    { x: 648, y: 473, w: 297, h: 367, name: 'kick' },
    { x: 966, y: 487, w: 295, h: 357, name: 'hurt' },
  ];

  const scale = 418 / 382;
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
  // 1. COMBAT ATLAS: public/assets/javier-v43.webp (1774 x 887)
  // =========================================================================
  console.log('1. Generating combat atlas javier-v43.webp...');
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
      if (i === 4) top = 455;
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
  await fs.writeFile('public/assets/javier-v43.webp', atlasWebp);
  console.log(`Saved public/assets/javier-v43.webp (${atlasWebp.length} bytes)`);

  // Update shared/sprite-geometry.json
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
      components: atlasComponents,
    },
  ];
  await fs.writeFile('shared/sprite-geometry.json', JSON.stringify(geometry, null, 2) + '\n');

  // =========================================================================
  // 2. PORTRAIT BUST: public/assets/bust-javier-v43.webp
  // =========================================================================
  console.log('2. Generating portrait bust-javier-v43.webp (preserving face from muni2.png)...');
  const idleFig = poses[0];
  const BUST_W = idleFig.w + 4;
  const BUST_H = idleFig.h + 4;
  const bustWebp = await sharp(await transparent(BUST_W, BUST_H))
    .composite([{ input: idleFig.buffer, left: 2, top: 2 }])
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
  console.log(`Saved public/assets/bust-javier-v43.webp (${bustWebp.length} bytes)`);

  // =========================================================================
  // 3. ENTRANCE SHEET: public/assets/javier-v43-defiant-entrance.webp (1536 x 1024)
  // =========================================================================
  console.log('3. Generating entrance javier-v43-defiant-entrance.webp...');
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
  await fs.writeFile('public/assets/javier-v43-defiant-entrance.webp', entranceWebp);

  const entrances = JSON.parse(await fs.readFile('shared/entrance-assets.json', 'utf8'));
  entrances.javier = {
    file: 'javier-v43-defiant-entrance',
    cell: 512,
    bodyHeight: 418,
    baseline: 490,
    anchorX: 256,
    width: 1536,
    height: 1024,
    frames: entFrames,
  };
  await fs.writeFile('shared/entrance-assets.json', JSON.stringify(entrances, null, 2) + '\n');
  console.log(`Saved public/assets/javier-v43-defiant-entrance.webp (${entranceWebp.length} bytes)`);

  console.log('=== All La Muni assets successfully generated and saved! ===');
}

main().catch(console.error);
