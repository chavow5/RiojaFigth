import sharp from 'sharp';
import fs from 'node:fs';

async function processSpriteSheet() {
  const inputPath = 'C:/Users/david/.gemini/antigravity-cli/brain/8e2a4636-3a6a-40b2-92c5-cca0b8d12167/quintela_sprite_sheet_4x2_1793584444267.jpg';
  const { data, info } = await sharp(inputPath)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  // RGBA buffer
  const rgba = Buffer.alloc(width * height * 4);

  // Copy RGB into RGBA, default alpha = 255
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = data[i * 3];
    rgba[i * 4 + 1] = data[i * 3 + 1];
    rgba[i * 4 + 2] = data[i * 3 + 2];
    rgba[i * 4 + 3] = 255;
  }

  // Helper: is pixel near white?
  function isNearWhite(idx) {
    const r = data[idx * 3];
    const g = data[idx * 3 + 1];
    const b = data[idx * 3 + 2];
    return r >= 242 && g >= 242 && b >= 242;
  }

  // BFS flood fill from edges
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0, tail = 0;

  // Add all border pixels if near white
  for (let x = 0; x < width; x++) {
    // top row
    const topIdx = x;
    if (isNearWhite(topIdx) && !visited[topIdx]) {
      visited[topIdx] = 1;
      queue[tail++] = topIdx;
    }
    // bottom row
    const botIdx = (height - 1) * width + x;
    if (isNearWhite(botIdx) && !visited[botIdx]) {
      visited[botIdx] = 1;
      queue[tail++] = botIdx;
    }
  }

  for (let y = 0; y < height; y++) {
    // left column
    const leftIdx = y * width;
    if (isNearWhite(leftIdx) && !visited[leftIdx]) {
      visited[leftIdx] = 1;
      queue[tail++] = leftIdx;
    }
    // right column
    const rightIdx = y * width + (width - 1);
    if (isNearWhite(rightIdx) && !visited[rightIdx]) {
      visited[rightIdx] = 1;
      queue[tail++] = rightIdx;
    }
  }

  // Also seed horizontal/vertical dividing grid lines if near white
  // Top row / bottom row boundary is around y = height / 2
  const midY = Math.floor(height / 2);
  for (let dy = -5; dy <= 5; dy++) {
    const y = midY + dy;
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (isNearWhite(idx) && !visited[idx]) {
        visited[idx] = 1;
        queue[tail++] = idx;
      }
    }
  }

  // 4 columns boundary lines: width/4, 2*width/4, 3*width/4
  for (let col = 1; col <= 3; col++) {
    const midX = Math.floor(col * width / 4);
    for (let dx = -5; dx <= 5; dx++) {
      const x = midX + dx;
      for (let y = 0; y < height; y++) {
        const idx = y * width + x;
        if (isNearWhite(idx) && !visited[idx]) {
          visited[idx] = 1;
          queue[tail++] = idx;
        }
      }
    }
  }

  // Perform BFS
  const neighbors = [-1, 1, -width, width];
  while (head < tail) {
    const curr = queue[head++];
    const cx = curr % width;
    const cy = Math.floor(curr / width);

    // Set alpha to 0 for background
    rgba[curr * 4 + 3] = 0;

    for (let n = 0; n < 4; n++) {
      const offset = neighbors[n];
      const nx = cx + (n === 0 ? -1 : n === 1 ? 1 : 0);
      const ny = cy + (n === 2 ? -1 : n === 3 ? 1 : 0);

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const next = curr + offset;
        if (!visited[next] && isNearWhite(next)) {
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
    }
  }

  // Also soft-feather 1-2px border to avoid harsh white halos
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (rgba[idx * 4 + 3] > 0) {
        // Check if adjacent to transparent pixel
        const hasTranspNeighbor = 
          rgba[(idx - 1) * 4 + 3] === 0 ||
          rgba[(idx + 1) * 4 + 3] === 0 ||
          rgba[(idx - width) * 4 + 3] === 0 ||
          rgba[(idx + width) * 4 + 3] === 0;

        if (hasTranspNeighbor) {
          const r = rgba[idx * 4];
          const g = rgba[idx * 4 + 1];
          const b = rgba[idx * 4 + 2];
          // If the pixel is very bright, reduce its alpha proportionally
          const brightness = (r + g + b) / 3;
          if (brightness > 210) {
            rgba[idx * 4 + 3] = Math.max(0, Math.round(255 * (255 - brightness) / 45));
          }
        }
      }
    }
  }

  // Save as transparent PNG
  const transparentPng = await sharp(rgba, {
    raw: { width, height, channels: 4 }
  }).png().toBuffer();

  const outPath = 'C:/Users/david/.gemini/antigravity-cli/brain/8e2a4636-3a6a-40b2-92c5-cca0b8d12167/scratch/quintela_transparent.png';
  fs.writeFileSync(outPath, transparentPng);
  console.log('Saved transparent PNG to', outPath, 'size:', transparentPng.length);
}

processSpriteSheet().catch(console.error);
