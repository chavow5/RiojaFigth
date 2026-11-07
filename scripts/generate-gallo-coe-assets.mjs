import sharp from 'sharp';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

async function main() {
  console.log('Generating El Gallo and El Coe assets...');

  const pathGallo = 'AA ARCHIVOS JAM/Caudillo Figth/personajes sinfondo/Sergio Galleguillo.png';
  const pathCoe = 'AA ARCHIVOS JAM/Caudillo Figth/personajes sinfondo/muni.png';

  // =========================================================================
  // 1. EL GALLO BUST: public/assets/bust-simon-v3.webp
  // =========================================================================
  console.log('1. Processing bust-simon-v3.webp (El Gallo)...');
  const galloRaw = await sharp(pathGallo).raw().toBuffer({ resolveWithObject: true });
  let gMinX = galloRaw.info.width, gMaxX = 0, gMinY = galloRaw.info.height, gMaxY = 0;
  for (let y = 0; y < galloRaw.info.height; y++) {
    for (let x = 0; x < galloRaw.info.width; x++) {
      if (galloRaw.data[(y * galloRaw.info.width + x) * 4 + 3] > 30) {
        if (x < gMinX) gMinX = x;
        if (x > gMaxX) gMaxX = x;
        if (y < gMinY) gMinY = y;
        if (y > gMaxY) gMaxY = y;
      }
    }
  }
  const gW = gMaxX - gMinX + 1;
  const gH = gMaxY - gMinY + 1;
  const BUST_H = 430;
  const GALLO_W = Math.round(BUST_H * (gW / gH)); // ~324

  const croppedGallo = await sharp(pathGallo)
    .extract({ left: gMinX, top: gMinY, width: gW, height: gH })
    .resize(GALLO_W, BUST_H)
    .png()
    .toBuffer();

  const galloBlank = await sharp({
    create: {
      width: GALLO_W + 4,
      height: BUST_H + 4,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).png().toBuffer();

  const galloBustWebp = await sharp(galloBlank)
    .composite([{ input: croppedGallo, left: 2, top: 2 }])
    .webp({ lossless: true })
    .toBuffer();

  await fs.writeFile('public/assets/bust-simon-v3.webp', galloBustWebp);
  console.log(`Saved public/assets/bust-simon-v3.webp (${galloBustWebp.length} bytes)`);

  // =========================================================================
  // 2. EL COE BUST: public/assets/bust-gomez-v3.webp
  // =========================================================================
  console.log('2. Processing bust-gomez-v3.webp (El Coe)...');
  const coeRaw = await sharp(pathCoe).raw().toBuffer({ resolveWithObject: true });
  let cMinX = coeRaw.info.width, cMaxX = 0, cMinY = coeRaw.info.height, cMaxY = 0;
  for (let y = 0; y < coeRaw.info.height; y++) {
    for (let x = 0; x < coeRaw.info.width; x++) {
      if (coeRaw.data[(y * coeRaw.info.width + x) * 4 + 3] > 30) {
        if (x < cMinX) cMinX = x;
        if (x > cMaxX) cMaxX = x;
        if (y < cMinY) cMinY = y;
        if (y > cMaxY) cMaxY = y;
      }
    }
  }
  const cW = cMaxX - cMinX + 1;
  const cH = cMaxY - cMinY + 1;
  const COE_W = Math.round(BUST_H * (cW / cH)); // ~231

  const croppedCoe = await sharp(pathCoe)
    .extract({ left: cMinX, top: cMinY, width: cW, height: cH })
    .resize(COE_W, BUST_H)
    .png()
    .toBuffer();

  const coeBlank = await sharp({
    create: {
      width: COE_W + 4,
      height: BUST_H + 4,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).png().toBuffer();

  const coeBustWebp = await sharp(coeBlank)
    .composite([{ input: croppedCoe, left: 2, top: 2 }])
    .webp({ lossless: true })
    .toBuffer();

  await fs.writeFile('public/assets/bust-gomez-v3.webp', coeBustWebp);
  console.log(`Saved public/assets/bust-gomez-v3.webp (${coeBustWebp.length} bytes)`);

  // =========================================================================
  // 3. UPDATE PORTRAIT BUSTS: shared/portrait-busts.json
  // =========================================================================
  const bustsJson = JSON.parse(await fs.readFile('shared/portrait-busts.json', 'utf8'));

  bustsJson.simon = {
    file: "bust-simon-v3",
    source: "simon-v3",
    sourceSha256: sha256(galloBustWebp),
    sha256: sha256(galloBustWebp),
    frame: 0,
    bodyHeight: BUST_H,
    selectionHeight: 375,
    left: -Math.round(GALLO_W / 2),
    center: 18, // Nicely centered face & mic
    width: GALLO_W,
    height: BUST_H,
    mirror: 1,
    rows: BUST_H,
    x: 2,
    y: 2
  };

  bustsJson.gomez = {
    file: "bust-gomez-v3",
    source: "gomez-v3",
    sourceSha256: sha256(coeBustWebp),
    sha256: sha256(coeBustWebp),
    frame: 0,
    bodyHeight: BUST_H,
    selectionHeight: 375,
    left: -Math.round(COE_W / 2),
    center: 20, // Centered face & red cap
    width: COE_W,
    height: BUST_H,
    mirror: 1,
    rows: BUST_H,
    x: 2,
    y: 2
  };

  await fs.writeFile('shared/portrait-busts.json', JSON.stringify(bustsJson, null, 2) + '\n');
  console.log('Updated shared/portrait-busts.json for simon and gomez');

  // =========================================================================
  // 4. CLEANUP SEATED IN shared/finale-actor-assets.json
  // =========================================================================
  const finaleActorJson = JSON.parse(await fs.readFile('shared/finale-actor-assets.json', 'utf8'));
  if (finaleActorJson.seated) {
    delete finaleActorJson.seated.simon;
    delete finaleActorJson.seated.gomez;
    await fs.writeFile('shared/finale-actor-assets.json', JSON.stringify(finaleActorJson, null, 2) + '\n');
    console.log('Removed simon & gomez from finale-actor-assets.json seated');
  }

  // =========================================================================
  // 5. UPDATE FIGHTERS METADATA: shared/fighters.all.json & shared/fighters.json
  // =========================================================================
  const galloDef = {
    id: "simon",
    sprite: "simon-v3",
    category: "culture",
    name: "El Gallo",
    shortName: "El Gallo",
    title: "Cantor de la Chaya",
    role: "DISTANCIA",
    color: "#f59e0b",
    description: "Sergio Galleguillo, el rey del carnaval riojano. Con micrófono en mano y su potente voz, desata acordes festivos y harinazos chayinos que sacuden toda la arena.",
    speed: 4.2,
    damage: 1.05,
    armor: 0.95,
    stats: [4, 3, 4],
    ability: "cuatro",
    special: "Acorde Chayero",
    combos: ["Vidala Riojana", "Zamba Chayera", "Grito Chayero"],
    portraitLift: 0.02
  };

  const coeDef = {
    id: "gomez",
    sprite: "gomez-v3",
    category: "founders",
    name: "El Coe",
    shortName: "El Coe",
    title: "Operario de Cuadrilla",
    role: "PODER",
    color: "#ef4444",
    description: "Trabajador incansable de la cuadrilla municipal y del COE. Con su campera roja y pala de punta, cava pozos en el asfalto y conecta golpes contundentes.",
    speed: 3.8,
    damage: 1.18,
    armor: 1.02,
    stats: [5, 2, 5],
    ability: "command",
    special: "Pozo en el Asfalto",
    combos: ["Zanja Urbana", "Paredón Rojo", "Bache Profundo"],
    portraitLift: 0.02
  };

  // Update fighters.all.json
  const allFighters = JSON.parse(await fs.readFile('shared/fighters.all.json', 'utf8'));
  for (const [id, def] of [['simon', galloDef], ['gomez', coeDef]]) {
    const idx = allFighters.findIndex(x => x.id === id);
    if (idx !== -1) {
      allFighters[idx] = { ...allFighters[idx], ...def };
    } else {
      allFighters.push(def);
    }
  }
  await fs.writeFile('shared/fighters.all.json', JSON.stringify(allFighters, null, 2) + '\n');
  console.log('Updated shared/fighters.all.json');

  // Filter shared/fighters.json to ONLY the 6 active Riojan characters:
  // zavarce, vallenilla, capriles, emilio, simon, gomez
  const activeIds = ['zavarce', 'vallenilla', 'capriles', 'emilio', 'simon', 'gomez'];
  const curFighters = JSON.parse(await fs.readFile('shared/fighters.json', 'utf8'));
  const cleanedFighters = [];

  for (const id of activeIds) {
    let f = curFighters.find(x => x.id === id) || allFighters.find(x => x.id === id);
    if (f) {
      if (id === 'simon') f = { ...f, ...galloDef };
      if (id === 'gomez') f = { ...f, ...coeDef };
      cleanedFighters.push(f);
    }
  }

  await fs.writeFile('shared/fighters.json', JSON.stringify(cleanedFighters, null, 2) + '\n');
  console.log(`Updated shared/fighters.json (${cleanedFighters.length} fighters: ${cleanedFighters.map(x => x.name).join(', ')})`);

  // =========================================================================
  // 6. UPDATE FINALES LORE: shared/finales.ts
  // =========================================================================
  console.log('6. Updating shared/finales.ts...');
  let finalesTs = await fs.readFile('shared/finales.ts', 'utf8');

  // Replace simon
  finalesTs = finalesTs.replace(
    /\[\s*"simon",\s*"[^"]*",\s*"music",\s*"[^"]*",\s*"[^"]*",\s*"[^"]*",\s*"music",\s*\]/,
    `[
    "simon",
    "Fiesta de la Chaya",
    "music",
    "El Gallo hace sonar la albahaca y desata la Chaya riojana: una gigantesca nube de harina blanca cubre por completo al rival entre coplas y festejo popular.",
    "Nube de Harina y Albahaca",
    "¡A chayar, cumpa!",
    "music",
  ]`
  );

  // Replace gomez
  finalesTs = finalesTs.replace(
    /\[\s*"gomez",\s*"[^"]*",\s*"transport",\s*"[^"]*",\s*"[^"]*",\s*"[^"]*",\s*"show",\s*\]/,
    `[
    "gomez",
    "Palazo del COE",
    "transport",
    "El Coe pica el asfalto abriendo un pozo traicionero bajo los pies del rival y remata con un palazo demoledor de cuadrilla.",
    "Pozo y Pala Municipal",
    "¡Cuidado con el pozo!",
    "show",
  ]`
  );

  await fs.writeFile('shared/finales.ts', finalesTs);
  console.log('Updated shared/finales.ts');

  console.log('El Gallo and El Coe asset setup completed successfully!');
}

main().catch(err => {
  console.error('Error generating Gallo and Coe assets:', err);
  process.exit(1);
});
