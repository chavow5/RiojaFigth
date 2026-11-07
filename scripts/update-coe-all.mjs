import sharp from 'sharp';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

const INPUT = 'C:/Users/david/.gemini/antigravity-cli/brain/b457e353-0c2b-412a-b59e-9832c9e1fe39/el_coe_spritesheet_1794066300466.jpg';
const TRANSPARENT_SRC = 'C:/Users/david/.gemini/antigravity-cli/brain/b457e353-0c2b-412a-b59e-9832c9e1fe39/el_coe_transparent.png';

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
  console.log('=== Updating all assets for El Coe (gomez) ===');
  await makeTransparent();

  // Bounding boxes in el_coe_transparent.png:
  // Comp 0: x=50..260 (211), y=36..421 (386) - Idle
  // Comp 1: x=358..584 (227), y=36..421 (386) - Guard
  // Comp 2: x=680..892 (213), y=32..421 (390) - Walk A
  // Comp 3: x=993..1205 (213), y=32..420 (389) - Walk B
  // Comp 4: x=73..244 (172), y=440..780 (341) - Jump
  // Comp 5: x=322..627 (306), y=453..846 (394) - Punch
  // Comp 6: x=640..944 (305), y=447..843 (397) - Kick
  // Comp 7: x=996..1217 (222), y=451..845 (395) - Hurt

  const bboxes = [
    { x: 50, y: 36, w: 211, h: 386, name: 'idle' },
    { x: 358, y: 36, w: 227, h: 386, name: 'guard' },
    { x: 680, y: 32, w: 213, h: 390, name: 'walkA' },
    { x: 993, y: 32, w: 213, h: 389, name: 'walkB' },
    { x: 73, y: 440, w: 172, h: 341, name: 'jump' },
    { x: 322, y: 453, w: 306, h: 394, name: 'punch' },
    { x: 640, y: 447, w: 305, h: 397, name: 'kick' },
    { x: 996, y: 451, w: 222, h: 395, name: 'hurt' },
  ];

  const scale = 418 / 386;
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
  // 1. COMBAT ATLAS: public/assets/gomez-v3.webp (1774 x 887)
  // =========================================================================
  console.log('1. Generating combat atlas gomez-v3.webp...');
  const BASELINE_ROW0 = 432;
  const BASELINE_ROW1 = 870;
  const colCenters = [222, 665, 1109, 1552];

  const atlasComps = [];

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
  }

  const atlasWebp = await sharp(await transparent(1774, 887))
    .composite(atlasComps)
    .webp({ lossless: true })
    .toBuffer();
  await fs.writeFile('public/assets/gomez-v3.webp', atlasWebp);
  console.log(`Saved public/assets/gomez-v3.webp (${atlasWebp.length} bytes)`);

  // Detect exact components with alpha >= 40
  const atlasRaw = await sharp(atlasWebp).raw().toBuffer({ resolveWithObject: true });
  const aData = atlasRaw.data;
  const aW = atlasRaw.info.width;
  const aH = atlasRaw.info.height;
  const aSeen = new Uint8Array(aW * aH);
  const aQueue = new Int32Array(aW * aH);
  const foundComps = [];

  for (let p = 0; p < aW * aH; p++) {
    if (aSeen[p] || aData[p * 4 + 3] < 40) continue;
    let head = 0, tail = 1;
    aQueue[0] = p;
    aSeen[p] = 1;
    let minX = aW, maxX = 0, minY = aH, maxY = 0;
    while (head < tail) {
      const cp = aQueue[head++];
      const cx = cp % aW;
      const cy = Math.floor(cp / aW);
      minX = Math.min(minX, cx);
      maxX = Math.max(maxX, cx);
      minY = Math.min(minY, cy);
      maxY = Math.max(maxY, cy);
      for (const n of [
        cx > 0 ? cp - 1 : -1,
        cx < aW - 1 ? cp + 1 : -1,
        cy > 0 ? cp - aW : -1,
        cy < aH - 1 ? cp + aW : -1,
      ]) {
        if (n >= 0 && !aSeen[n] && aData[n * 4 + 3] >= 40) {
          aSeen[n] = 1;
          aQueue[tail++] = n;
        }
      }
    }
    if (tail > 4000) {
      foundComps.push({ minX, minY, maxX, maxY, pixels: tail });
    }
  }

  const topComps = foundComps.filter(c => c.minY < aH / 4).sort((a, b) => a.minX - b.minX);
  const botComps = foundComps.filter(c => c.minY >= aH / 4).sort((a, b) => a.minX - b.minX);
  const orderedComps = [...topComps, ...botComps];
  console.log(`Detected components: top=${topComps.length}, bottom=${botComps.length}, total=${orderedComps.length}`);

  // Update shared/sprite-geometry.json
  const geometry = JSON.parse(await fs.readFile('shared/sprite-geometry.json', 'utf8'));
  let geoEntry = geometry.sprites.find((s) => s.id === 'gomez');
  if (!geoEntry) {
    geoEntry = { id: 'gomez', files: [] };
    geometry.sprites.push(geoEntry);
  }
  geoEntry.files = [
    {
      file: 'public/assets/gomez-v3.webp',
      passed: true,
      width: 1774,
      height: 887,
      components: orderedComps.map(c => ({
        minX: c.minX,
        minY: c.minY,
        maxX: c.maxX,
        maxY: c.maxY,
      })),
    },
  ];
  await fs.writeFile('shared/sprite-geometry.json', JSON.stringify(geometry, null, 2) + '\n');
  console.log('Updated shared/sprite-geometry.json');

  // =========================================================================
  // 2. PORTRAIT BUST: public/assets/bust-gomez-v3.webp
  // =========================================================================
  console.log('2. Generating portrait bust-gomez-v3.webp (preserving face from muni.png / COE)...');
  const idleFig = poses[0];
  const BUST_W = idleFig.w + 4;
  const BUST_H = idleFig.h + 4;
  const bustWebp = await sharp(await transparent(BUST_W, BUST_H))
    .composite([{ input: idleFig.buffer, left: 2, top: 2 }])
    .webp({ lossless: true })
    .toBuffer();
  await fs.writeFile('public/assets/bust-gomez-v3.webp', bustWebp);
  const bustHash = sha256(bustWebp);

  const busts = JSON.parse(await fs.readFile('shared/portrait-busts.json', 'utf8'));
  busts.gomez = {
    file: 'bust-gomez-v3',
    source: 'gomez-v3',
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
  console.log(`Saved public/assets/bust-gomez-v3.webp (${bustWebp.length} bytes)`);

  // =========================================================================
  // 3. ENTRANCE SHEET: public/assets/gomez-defiant-entrance.webp (1536 x 1024)
  // =========================================================================
  console.log('3. Generating entrance gomez-defiant-entrance.webp...');
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
  await fs.writeFile('public/assets/gomez-defiant-entrance.webp', entranceWebp);

  const entrances = JSON.parse(await fs.readFile('shared/entrance-assets.json', 'utf8'));
  entrances.gomez = {
    file: 'gomez-defiant-entrance',
    cell: 512,
    bodyHeight: 418,
    baseline: 490,
    anchorX: 256,
    width: 1536,
    height: 1024,
    frames: entFrames,
  };
  await fs.writeFile('shared/entrance-assets.json', JSON.stringify(entrances, null, 2) + '\n');
  console.log(`Saved public/assets/gomez-defiant-entrance.webp (${entranceWebp.length} bytes)`);

  // =========================================================================
  // 4. Update asset versions
  // =========================================================================
  const versions = JSON.parse(await fs.readFile('shared/asset-versions.json', 'utf8'));
  versions['/assets/gomez-v3.webp'] = sha256(atlasWebp).slice(0, 16);
  versions['/assets/bust-gomez-v3.webp'] = bustHash.slice(0, 16);
  versions['/assets/gomez-defiant-entrance.webp'] = sha256(entranceWebp).slice(0, 16);
  await fs.writeFile('shared/asset-versions.json', JSON.stringify(versions, null, 2) + '\n');
  console.log('Updated shared/asset-versions.json');

  console.log('=== All El Coe assets successfully generated and saved! ===');
}

main().catch(console.error);
