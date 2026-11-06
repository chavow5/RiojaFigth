import sharp from 'sharp';
import fs from 'node:fs';

async function packQuintelaAtlas() {
  const transparentPath = 'C:/Users/david/.gemini/antigravity-cli/brain/8e2a4636-3a6a-40b2-92c5-cca0b8d12167/scratch/quintela_transparent.png';
  const { data, info } = await sharp(transparentPath)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const tileW = width / 4;
  const tileH = height / 2;

  const extractedPoses = [];

  for (let f = 0; f < 8; f++) {
    const col = f % 4;
    const row = Math.floor(f / 4);
    const startX = col * tileW;
    const startY = row * tileH;

    const seen = new Uint8Array(tileW * tileH);
    const queue = new Int32Array(tileW * tileH);
    const comps = [];

    for (let p = 0; p < seen.length; p++) {
      const lx = p % tileW;
      const ly = Math.floor(p / tileW);
      const gx = startX + lx;
      const gy = startY + ly;
      if (seen[p] || data[(gy * width + gx) * 4 + 3] < 40) continue;

      let head = 0, tail = 1;
      queue[0] = p;
      seen[p] = 1;
      let minX = tileW, minY = tileH, maxX = 0, maxY = 0;

      while (head < tail) {
        const cp = queue[head++];
        const cx = cp % tileW;
        const cy = Math.floor(cp / tileW);
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);

        for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
          if (nx >= 0 && nx < tileW && ny >= 0 && ny < tileH) {
            const np = ny * tileW + nx;
            const ngx = startX + nx;
            const ngy = startY + ny;
            if (!seen[np] && data[(ngy * width + ngx) * 4 + 3] >= 40) {
              seen[np] = 1;
              queue[tail++] = np;
            }
          }
        }
      }
      comps.push({ pixels: tail, minX, minY, maxX, maxY });
    }

    comps.sort((a, b) => b.pixels - a.pixels);
    const main = comps[0];

    // Crop just the main component pixels
    const cropW = main.maxX - main.minX + 1;
    const cropH = main.maxY - main.minY + 1;
    const cropBuffer = Buffer.alloc(cropW * cropH * 4);

    for (let y = 0; y < cropH; y++) {
      for (let x = 0; x < cropW; x++) {
        const gx = startX + main.minX + x;
        const gy = startY + main.minY + y;
        const srcOffset = (gy * width + gx) * 4;
        const dstOffset = (y * cropW + x) * 4;
        
        // Check if this pixel is part of the main component
        const lp = (main.minY + y) * tileW + (main.minX + x);
        if (seen[lp]) {
          cropBuffer[dstOffset] = data[srcOffset];
          cropBuffer[dstOffset + 1] = data[srcOffset + 1];
          cropBuffer[dstOffset + 2] = data[srcOffset + 2];
          cropBuffer[dstOffset + 3] = data[srcOffset + 3];
        }
      }
    }

    extractedPoses.push({
      width: cropW,
      height: cropH,
      buffer: cropBuffer,
    });
  }

  // Uniform scale so that standard pose 0 height is ~425px
  const scale = 425 / extractedPoses[0].height;
  const CELL = 512;
  const BASELINE_TOP = 479; // Baseline for row 0
  const BASELINE_BOT = 991; // Baseline for row 1 (512 + 479)

  const layers = [];

  for (let f = 0; f < 8; f++) {
    const pose = extractedPoses[f];
    const targetW = Math.round(pose.width * scale);
    const targetH = Math.round(pose.height * scale);

    const resizedBuffer = await sharp(pose.buffer, {
      raw: { width: pose.width, height: pose.height, channels: 4 }
    })
      .resize(targetW, targetH)
      .png()
      .toBuffer();

    const col = f % 4;
    const row = Math.floor(f / 4);
    const cellLeft = col * CELL;
    const baseline = row === 0 ? BASELINE_TOP : BASELINE_BOT;

    // Center in cell horizontally
    const left = cellLeft + Math.floor((CELL - targetW) / 2);
    // Align bottom of sprite to baseline (jump pose f=2 can be lifted 30px)
    const lift = f === 2 ? 30 : 0;
    const top = baseline - targetH - lift;

    layers.push({
      input: resizedBuffer,
      left,
      top
    });
  }

  // Composite into 2048x1024 canvas
  const atlasBuffer = await sharp({
    create: {
      width: 2048,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite(layers)
    .webp({ lossless: true, effort: 6 })
    .toBuffer();

  const outAtlasPath = 'public/assets/emilio-v3.webp';
  fs.writeFileSync(outAtlasPath, atlasBuffer);
  console.log('Saved new atlas to', outAtlasPath, 'size:', atlasBuffer.length);

  // Now measure the actual components in public/assets/emilio-v3.webp to update shared/sprite-geometry.json
  const { data: atlasData, info: atlasInfo } = await sharp(atlasBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const aW = atlasInfo.width;
  const aH = atlasInfo.height;
  const seenAtlas = new Uint8Array(aW * aH);
  const queue = new Int32Array(seenAtlas.length);
  const components = [];

  for (let p = 0; p < seenAtlas.length; p++) {
    if (seenAtlas[p] || atlasData[p * 4 + 3] < 40) continue;
    let head = 0, tail = 1;
    queue[0] = p;
    seenAtlas[p] = 1;
    let minX = aW, minY = aH, maxX = 0, maxY = 0;

    while (head < tail) {
      const cp = queue[head++];
      const cx = cp % aW;
      const cy = Math.floor(cp / aW);
      minX = Math.min(minX, cx);
      maxX = Math.max(maxX, cx);
      minY = Math.min(minY, cy);
      maxY = Math.max(maxY, cy);

      for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
        if (nx >= 0 && nx < aW && ny >= 0 && ny < aH) {
          const np = ny * aW + nx;
          if (!seenAtlas[np] && atlasData[np * 4 + 3] >= 40) {
            seenAtlas[np] = 1;
            queue[tail++] = np;
          }
        }
      }
    }

    if (tail > 4000) {
      components.push({ minX, minY, maxX, maxY, pixels: tail });
    }
  }

  const top = components.filter(c => c.minY < aH / 4).sort((a, b) => a.minX - b.minX);
  const bottom = components.filter(c => c.minY >= aH / 4).sort((a, b) => a.minX - b.minX);
  const ordered = [...top, ...bottom].map(({ minX, minY, maxX, maxY }) => ({ minX, minY, maxX, maxY }));

  console.log('Detected components count:', ordered.length, 'top:', top.length, 'bottom:', bottom.length);
  console.log('Ordered components:', JSON.stringify(ordered, null, 2));

  // Update shared/sprite-geometry.json
  const geomPath = 'shared/sprite-geometry.json';
  const geom = JSON.parse(fs.readFileSync(geomPath, 'utf8'));
  const emilioEntry = geom.sprites.find(s => s.id === 'emilio');
  if (emilioEntry) {
    emilioEntry.files = [
      {
        file: 'public/assets/emilio-v3.webp',
        passed: true,
        width: 2048,
        height: 1024,
        components: ordered
      }
    ];
    fs.writeFileSync(geomPath, JSON.stringify(geom, null, 2) + '\n', 'utf8');
    console.log('Updated shared/sprite-geometry.json successfully!');
  }
}

packQuintelaAtlas().catch(console.error);
