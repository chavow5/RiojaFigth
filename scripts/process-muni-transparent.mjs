import sharp from 'sharp';
import fs from 'node:fs/promises';

const INPUT = 'C:/Users/david/.gemini/antigravity-cli/brain/b457e353-0c2b-412a-b59e-9832c9e1fe39/la_muni_spritesheet_1794065155151.jpg';
const OUTPUT = 'C:/Users/david/.gemini/antigravity-cli/brain/b457e353-0c2b-412a-b59e-9832c9e1fe39/la_muni_transparent.png';

async function main() {
  const { data, info } = await sharp(INPUT).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  console.log(`Source image: ${width}x${height}`);

  const rgba = Buffer.alloc(width * height * 4);

  // Black background threshold
  const isBlack = (idx) => {
    const r = data[idx * 3];
    const g = data[idx * 3 + 1];
    const b = data[idx * 3 + 2];
    return r < 18 && g < 18 && b < 18;
  };

  const bg = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0, tail = 0;

  // Border seeds
  for (let x = 0; x < width; x++) {
    if (isBlack(x)) { bg[x] = 1; queue[tail++] = x; }
    const bot = (height - 1) * width + x;
    if (isBlack(bot) && !bg[bot]) { bg[bot] = 1; queue[tail++] = bot; }
  }
  for (let y = 0; y < height; y++) {
    const left = y * width;
    if (isBlack(left) && !bg[left]) { bg[left] = 1; queue[tail++] = left; }
    const right = y * width + (width - 1);
    if (isBlack(right) && !bg[right]) { bg[right] = 1; queue[tail++] = right; }
  }

  // Mid divider seed
  const midY = Math.floor(height / 2);
  for (let x = 0; x < width; x++) {
    const idx = midY * width + x;
    if (isBlack(idx) && !bg[idx]) { bg[idx] = 1; queue[tail++] = idx; }
  }

  // Column divider seeds
  for (const cx of [Math.floor(width / 4), Math.floor(width / 2), Math.floor((3 * width) / 4)]) {
    for (let y = 0; y < height; y++) {
      const idx = y * width + cx;
      if (isBlack(idx) && !bg[idx]) { bg[idx] = 1; queue[tail++] = idx; }
    }
  }

  while (head < tail) {
    const p = queue[head++];
    const x = p % width;
    const y = Math.floor(p / width);
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const np = ny * width + nx;
        if (!bg[np] && isBlack(np)) {
          bg[np] = 1;
          queue[tail++] = np;
        }
      }
    }
  }

  // Build RGBA
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
      if (brightness < 24) {
        const a = Math.round(255 * (brightness / 24));
        rgba[i * 4 + 3] = Math.max(30, Math.min(255, a));
      } else {
        rgba[i * 4 + 3] = 255;
      }
    }
  }

  await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toFile(OUTPUT);
  console.log(`Saved transparent image to ${OUTPUT}`);
}

main().catch(console.error);
