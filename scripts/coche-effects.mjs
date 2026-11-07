import sharp from 'sharp';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

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

const svg = (markup, w, h) =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${markup}</svg>`,
    ),
  )
    .png()
    .toBuffer();

function wineJetSvg(w, h) {
  // A dynamic jet of Riojan red wine shooting forward with droplets
  return svg(`
    <defs>
      <linearGradient id="wineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#58111a" stop-opacity="0.95"/>
        <stop offset="50%" stop-color="#800020" stop-opacity="0.9"/>
        <stop offset="85%" stop-color="#b91c1c" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="#dc2626" stop-opacity="0.6"/>
      </linearGradient>
      <radialGradient id="dropGrad" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#f87171"/>
        <stop offset="60%" stop-color="#991b1b"/>
        <stop offset="100%" stop-color="#450a0a"/>
      </radialGradient>
    </defs>
    <!-- Main Wine Stream Arc -->
    <path d="M 280,210 Q 350,180 430,200 Q 480,215 495,235 Q 460,245 400,225 Q 340,215 285,228 Z" fill="url(#wineGrad)"/>
    <path d="M 290,215 Q 360,195 440,210 Q 470,220 485,230 Q 430,235 370,220 Z" fill="#b91c1c" opacity="0.8"/>
    <!-- Wine Droplets flying forward -->
    <circle cx="450" cy="180" r="7" fill="url(#dropGrad)"/>
    <circle cx="480" cy="195" r="9" fill="url(#dropGrad)"/>
    <circle cx="505" cy="225" r="8" fill="url(#dropGrad)"/>
    <circle cx="470" cy="250" r="6" fill="url(#dropGrad)"/>
    <circle cx="440" cy="265" r="5" fill="url(#dropGrad)"/>
    <circle cx="420" cy="165" r="5" fill="url(#dropGrad)"/>
    <circle cx="495" cy="170" r="4" fill="url(#dropGrad)"/>
    <circle cx="510" cy="205" r="6" fill="url(#dropGrad)"/>
    <!-- Specular highlights on droplets -->
    <circle cx="448" cy="178" r="2" fill="#ffffff" opacity="0.8"/>
    <circle cx="478" cy="193" r="2.5" fill="#ffffff" opacity="0.8"/>
    <circle cx="503" cy="223" r="2" fill="#ffffff" opacity="0.8"/>
  `, w, h);
}

function wineWhirlSvg(w, h) {
  // Swirling vortex of red wine and street whirlwind for the 'whirl' special move
  const cx = w / 2, cy = h / 2 + 10;
  return svg(`
    <defs>
      <linearGradient id="wineRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#450a0a" stop-opacity="0.85"/>
        <stop offset="40%" stop-color="#800020" stop-opacity="0.9"/>
        <stop offset="70%" stop-color="#991b1b" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#ef4444" stop-opacity="0.7"/>
      </linearGradient>
      <radialGradient id="whirlDrop" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#fca5a5"/>
        <stop offset="60%" stop-color="#991b1b"/>
        <stop offset="100%" stop-color="#450a0a"/>
      </radialGradient>
    </defs>
    <!-- Green street wind ribbons -->
    <ellipse cx="${cx}" cy="${cy + 40}" rx="230" ry="55" fill="none" stroke="#10b981" stroke-width="7" opacity="0.65" transform="rotate(-8 ${cx} ${cy + 40})"/>
    <ellipse cx="${cx}" cy="${cy - 20}" rx="200" ry="48" fill="none" stroke="#34d399" stroke-width="5" opacity="0.75" transform="rotate(6 ${cx} ${cy - 20})"/>
    <!-- Deep Red Wine Vortex Spirals -->
    <ellipse cx="${cx}" cy="${cy + 20}" rx="220" ry="52" fill="none" stroke="url(#wineRibbon)" stroke-width="12" opacity="0.9" transform="rotate(-12 ${cx} ${cy + 20})"/>
    <ellipse cx="${cx}" cy="${cy - 40}" rx="180" ry="42" fill="none" stroke="url(#wineRibbon)" stroke-width="10" opacity="0.85" transform="rotate(10 ${cx} ${cy - 40})"/>
    <ellipse cx="${cx}" cy="${cy - 90}" rx="140" ry="34" fill="none" stroke="#b91c1c" stroke-width="8" opacity="0.8" transform="rotate(-5 ${cx} ${cy - 90})"/>
    <!-- Splattering Wine Droplets along spiral -->
    <circle cx="${cx + 170}" cy="${cy + 10}" r="10" fill="url(#whirlDrop)"/>
    <circle cx="${cx + 195}" cy="${cy + 35}" r="8" fill="url(#whirlDrop)"/>
    <circle cx="${cx - 165}" cy="${cy + 30}" r="9" fill="url(#whirlDrop)"/>
    <circle cx="${cx - 180}" cy="${cy - 10}" r="7" fill="url(#whirlDrop)"/>
    <circle cx="${cx + 140}" cy="${cy - 50}" r="8" fill="url(#whirlDrop)"/>
    <circle cx="${cx - 130}" cy="${cy - 70}" r="7" fill="url(#whirlDrop)"/>
    <circle cx="${cx + 100}" cy="${cy - 100}" r="6" fill="url(#whirlDrop)"/>
    <circle cx="${cx - 80}" cy="${cy - 110}" r="5" fill="url(#whirlDrop)"/>
    <circle cx="${cx + 215}" cy="${cy + 60}" r="6" fill="url(#whirlDrop)"/>
    <!-- Highlights -->
    <circle cx="${cx + 168}" cy="${cy + 8}" r="3" fill="#ffffff" opacity="0.85"/>
    <circle cx="${cx - 167}" cy="${cy + 28}" r="2.5" fill="#ffffff" opacity="0.85"/>
    <circle cx="${cx + 138}" cy="${cy - 52}" r="2.5" fill="#ffffff" opacity="0.85"/>
  `, w, h);
}

export { wineJetSvg, wineWhirlSvg, transparent, sha256 };
