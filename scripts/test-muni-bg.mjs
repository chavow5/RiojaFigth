import sharp from 'sharp';

const INPUT = 'C:/Users/david/.gemini/antigravity-cli/brain/b457e353-0c2b-412a-b59e-9832c9e1fe39/la_muni_spritesheet_1794065155151.jpg';

async function test() {
  const { data, info } = await sharp(INPUT).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  // Background in this image is [5, 7, 4] to [6, 8, 7]
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

  // Component check
  const seen = new Uint8Array(width * height);
  const q2 = new Int32Array(width * height);
  const comps = [];

  for (let p = 0; p < seen.length; p++) {
    if (seen[p] || bg[p]) continue;
    seen[p] = 1;
    q2[0] = p;
    let h = 0, t = 1;
    let minX = width, maxX = 0, minY = height, maxY = 0;
    while (h < t) {
      const cur = q2[h++];
      const x = cur % width, y = Math.floor(cur / width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const np = ny * width + nx;
          if (!seen[np] && !bg[np]) {
            seen[np] = 1;
            q2[t++] = np;
          }
        }
      }
    }
    if (t > 1000) {
      comps.push({ pixels: t, bbox: [minX, minY, maxX, maxY], size: `${maxX - minX + 1}x${maxY - minY + 1}` });
    }
  }

  console.log(`Found ${comps.length} components > 1000 pixels:`);
  comps.forEach((c, i) => console.log(i, c));
}

test().catch(console.error);
