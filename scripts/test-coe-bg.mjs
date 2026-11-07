import sharp from 'sharp';

const INPUT = 'C:/Users/david/.gemini/antigravity-cli/brain/b457e353-0c2b-412a-b59e-9832c9e1fe39/el_coe_spritesheet_1794066300466.jpg';
const OUTPUT = 'C:/Users/david/.gemini/antigravity-cli/brain/b457e353-0c2b-412a-b59e-9832c9e1fe39/el_coe_transparent.png';

async function run() {
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

  await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toFile(OUTPUT);
  console.log('Saved transparent output:', OUTPUT);

  // Now find connected components with alpha > 40
  const visited = new Uint8Array(width * height);
  const comps = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (rgba[idx * 4 + 3] > 40 && !visited[idx]) {
        let qHead = 0, qTail = 0;
        queue[qTail++] = idx;
        visited[idx] = 1;
        let minX = x, maxX = x, minY = y, maxY = y;
        while (qHead < qTail) {
          const cp = queue[qHead++];
          const cx = cp % width;
          const cy = Math.floor(cp / width);
          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;
          for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const np = ny * width + nx;
              if (!visited[np] && rgba[np * 4 + 3] > 40) {
                visited[np] = 1;
                queue[qTail++] = np;
              }
            }
          }
        }
        if (qTail > 3000) {
          comps.push({ minX, maxX, minY, maxY, w: maxX - minX + 1, h: maxY - minY + 1, pixels: qTail });
        }
      }
    }
  }

  console.log('Found components > 3000 pixels:', comps.length);
  comps.sort((a, b) => {
    const rowA = Math.floor(a.minY / 400);
    const rowB = Math.floor(b.minY / 400);
    if (rowA !== rowB) return rowA - rowB;
    return a.minX - b.minX;
  });
  comps.forEach((c, idx) => {
    console.log(`Comp ${idx}: x=${c.minX}..${c.maxX} (${c.w}), y=${c.minY}..${c.maxY} (${c.h}), pixels=${c.pixels}`);
  });
}
run();
