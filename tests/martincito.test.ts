import test from "node:test";
import assert from "node:assert/strict";
import { fighterById } from "../shared/content";
import atlasManifest from "../shared/sprite-geometry.json";
import entranceManifest from "../shared/entrance-assets.json";
import portraitBusts from "../shared/portrait-busts.json";

test("Martincito (renny) fighter profile and parliamentary lore", () => {
  const fighter = fighterById("renny");
  assert.equal(fighter.id, "renny");
  assert.equal(fighter.name, "Martincito");
  assert.equal(fighter.sprite, "renny-v3");
  assert.equal(fighter.ability, "broadcast");
  assert.equal(fighter.special, "Moción de Orden");
  assert.ok(fighter.combos.includes("Quórum Estricto"));
  assert.ok(fighter.description.includes("Cámara de Diputados"));
});

test("Martincito combat atlas has 8 distinct dynamic poses in sprite-geometry.json", () => {
  const entry = atlasManifest.sprites.find((s) => s.id === "renny");
  assert.ok(entry, "renny must exist in sprite-geometry.json");
  const fileEntry = entry.files.find((f) => f.file === "public/assets/renny-v3.webp");
  assert.ok(fileEntry, "renny-v3.webp must exist in entry");
  assert.equal(fileEntry.components.length, 8);
  assert.equal(fileEntry.width, 1774);
  assert.equal(fileEntry.height, 887);

  // Top 4 poses (row 0: idle, guard, walkA, walkB)
  for (let i = 0; i < 4; i++) {
    const c = fileEntry.components[i];
    assert.ok(c.minY < 887 / 4, `Pose ${i} minY ${c.minY} must be < 221.75`);
    assert.ok(c.maxY <= 435, `Pose ${i} maxY ${c.maxY} must be <= 435`);
  }

  // Bottom 4 poses (row 1: jump, punch, kick, hurt)
  for (let i = 4; i < 8; i++) {
    const c = fileEntry.components[i];
    assert.ok(c.minY >= 887 / 4, `Pose ${i} minY ${c.minY} must be >= 221.75`);
    assert.ok(c.maxY <= 875, `Pose ${i} maxY ${c.maxY} must be <= 875`);
  }
});

test("Martincito bust and entrance manifests are present", () => {
  const busts = portraitBusts as Record<string, any>;
  assert.ok(busts.renny);
  assert.equal(busts.renny.file, "bust-renny-v3");

  const entrances = entranceManifest as Record<string, any>;
  assert.ok(entrances.renny);
  assert.equal(entrances.renny.file, "renny-defiant-entrance");
  assert.equal(entrances.renny.frames.length, 6);
});
