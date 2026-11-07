import sharp from 'sharp';
import fs from 'node:fs/promises';

const TRANSPARENT_TEST = 'C:/Users/david/.gemini/antigravity-cli/brain/b457e353-0c2b-412a-b59e-9832c9e1fe39/coche_coche_transparent_test.png';

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
  console.log('Building Coché Coché combat atlas (1774x887)...');

  // Load transparent source
  const srcImg = sharp(TRANSPARENT_TEST);
  const { width: srcW, height: srcH } = await srcImg.metadata();

  // Bounding boxes in coche_coche_transparent_test.png
  // 0: Idle [56, 27, 263, 420] -> 208x394
  // 1: Guard [365, 38, 579, 420] -> 215x383
  // 2: Walk A [674, 36, 902, 420] -> 229x385
  // 3: Walk B [1000, 33, 1195, 420] -> 196x388
  // 4: Jump [61, 435, 242, 774] -> 182x340
  // 5: Punch/Wine [321, 471, 652, 847] -> 332x377
  // 6: Kick [659, 461, 960, 844] -> 302x384
  // 7: Hurt [994, 471, 1228, 847] -> 235x377

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

  // We want the standing character height to be ~418 px on the final sheet.
  // Idle pose is 394 px high. Scale factor = 418 / 394 ~= 1.061
  const scale = 418 / 394;

  const extracted = [];
  for (let i = 0; i < 8; i++) {
    const b = bboxes[i];
    const buf = await sharp(TRANSPARENT_TEST)
      .extract({ left: b.x, top: b.y, width: b.w, height: b.h })
      .resize(Math.round(b.w * scale), Math.round(b.h * scale), { fit: 'fill' })
      .png()
      .toBuffer();
    const meta = await sharp(buf).metadata();
    extracted.push({ buffer: buf, w: meta.width, h: meta.height, name: b.name });
  }

  const BASELINE_ROW0 = 432;
  const BASELINE_ROW1 = 870;

  const comps = [];
  const colCenters = [222, 665, 1109, 1552];

  for (let i = 0; i < 8; i++) {
    const fig = extracted[i];
    const col = i % 4;
    const row = Math.floor(i / 4);

    let left = colCenters[col] - Math.round(fig.w / 2);
    // Keep within column cell boundaries: col * 443.5 to (col + 1) * 443.5
    const minLeft = col * 443.5 + 4;
    const maxRight = (col + 1) * 443.5 - 4;
    if (left < minLeft) left = Math.round(minLeft);
    if (left + fig.w > maxRight) left = Math.round(maxRight - fig.w);

    let top;
    if (row === 0) {
      top = BASELINE_ROW0 - fig.h;
    } else {
      if (i === 4) {
        // Jump pose: airborne
        top = 450;
      } else {
        top = BASELINE_ROW1 - fig.h;
      }
    }

    console.log(`Pose ${i} (${fig.name}): size ${fig.w}x${fig.h}, pos [${left}, ${top}, ${left + fig.w - 1}, ${top + fig.h - 1}]`);
    comps.push({ input: fig.buffer, left, top });
  }

  const atlas = await sharp(await transparent(1774, 887))
    .composite(comps)
    .webp({ lossless: true })
    .toBuffer();

  await fs.writeFile('public/assets/conde-v3.webp', atlas);
  console.log(`Wrote public/assets/conde-v3.webp (${atlas.length} bytes)`);
}

main().catch(console.error);
