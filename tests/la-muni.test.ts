import test from "node:test";
import assert from "node:assert/strict";
import { fighterById } from "../shared/content";
import atlasManifest from "../shared/sprite-geometry.json";
import entranceManifest from "../shared/entrance-assets.json";
import portraitBusts from "../shared/portrait-busts.json";

test("La Muni (javier) fighter profile and urban service lore", () => {
  const fighter = fighterById("javier");
  assert.equal(fighter.id, "javier");
  assert.equal(fighter.name, "La Muni");
  assert.equal(fighter.sprite, "javier-v43");
  assert.equal(fighter.ability, "spin");
  assert.equal(fighter.special, "Barrido Municipal");
  assert.ok(fighter.combos.includes("Barrido Urbano"));
  assert.ok(fighter.description.includes("servicios públicos"));
});

test("La Muni combat atlas has 8 distinct poses in sprite-geometry.json", () => {
  const entry = atlasManifest.sprites.find((s) => s.id === "javier");
  assert.ok(entry);
  const fileEntry = entry.files.find((f) => f.file === "public/assets/javier-v43.webp");
  assert.ok(fileEntry);
  assert.equal(fileEntry.components.length, 8);
  assert.equal(fileEntry.width, 1774);
  assert.equal(fileEntry.height, 887);

  // Top 4 poses (row 0)
  for (let i = 0; i < 4; i++) {
    const c = fileEntry.components[i];
    assert.ok(c.minY < 887 / 4, `Pose ${i} minY ${c.minY} must be < 221.75`);
    assert.ok(c.maxY <= 435, `Pose ${i} maxY ${c.maxY} must be <= 435`);
  }

  // Bottom 4 poses (row 1)
  for (let i = 4; i < 8; i++) {
    const c = fileEntry.components[i];
    assert.ok(c.minY >= 887 / 4, `Pose ${i} minY ${c.minY} must be >= 221.75`);
    assert.ok(c.maxY <= 875, `Pose ${i} maxY ${c.maxY} must be <= 875`);
  }
});

test("La Muni bust and entrance manifests are present", () => {
  const busts = portraitBusts as Record<string, any>;
  assert.ok(busts.javier);
  assert.equal(busts.javier.file, "bust-javier-v43");

  const entrances = entranceManifest as Record<string, any>;
  assert.ok(entrances.javier);
  assert.equal(entrances.javier.file, "javier-v43-defiant-entrance");
  assert.equal(entrances.javier.frames.length, 6);
});
