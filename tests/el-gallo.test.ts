import test from "node:test";
import assert from "node:assert/strict";
import { fighterById } from "../shared/content";
import atlasManifest from "../shared/sprite-geometry.json";
import entranceManifest from "../shared/entrance-assets.json";
import portraitBusts from "../shared/portrait-busts.json";

test("El Gallo (simon) fighter profile and chaya lore", () => {
  const fighter = fighterById("simon");
  assert.equal(fighter.id, "simon");
  assert.equal(fighter.name, "El Gallo");
  assert.equal(fighter.sprite, "simon-v3");
  assert.equal(fighter.ability, "cuatro");
  assert.equal(fighter.special, "Acorde Chayero");
  assert.ok(fighter.combos.includes("Harinazo Chayero"));
  assert.ok(fighter.description.includes("carnaval"));
});

test("El Gallo combat atlas has 8 distinct poses in sprite-geometry.json", () => {
  const entry = atlasManifest.sprites.find((s) => s.id === "simon");
  assert.ok(entry);
  const fileEntry = entry.files.find((f) => f.file === "public/assets/simon-v3.webp");
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

test("El Gallo bust and entrance manifests are present", () => {
  const busts = portraitBusts as Record<string, any>;
  assert.ok(busts.simon);
  assert.equal(busts.simon.file, "bust-simon-v3");

  const entrances = entranceManifest as Record<string, any>;
  assert.ok(entrances.simon);
  assert.equal(entrances.simon.file, "simon-entrance-v1");
  assert.equal(entrances.simon.frames.length, 6);
});
