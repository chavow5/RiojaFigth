import test from "node:test";
import assert from "node:assert/strict";
import { fighterById } from "../shared/content";
import atlasManifest from "../shared/sprite-geometry.json";
import entranceManifest from "../shared/entrance-assets.json";
import portraitBusts from "../shared/portrait-busts.json";

test("El Coe (gomez) fighter profile and road crew lore", () => {
  const fighter = fighterById("gomez");
  assert.equal(fighter.id, "gomez");
  assert.equal(fighter.name, "El Coe");
  assert.equal(fighter.sprite, "gomez-v3");
  assert.equal(fighter.ability, "command");
  assert.equal(fighter.special, "Pozo en el Asfalto");
  assert.ok(fighter.combos.includes("Zanja Urbana"));
  assert.ok(fighter.description.includes("COE"));
});

test("El Coe combat atlas has 8 distinct dynamic poses in sprite-geometry.json", () => {
  const entry = atlasManifest.sprites.find((s) => s.id === "gomez");
  assert.ok(entry, "gomez must exist in sprite-geometry.json");
  const fileEntry = entry.files.find((f) => f.file === "public/assets/gomez-v3.webp");
  assert.ok(fileEntry, "gomez-v3.webp must exist in entry");
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

test("El Coe bust and entrance manifests are present", () => {
  const busts = portraitBusts as Record<string, any>;
  assert.ok(busts.gomez);
  assert.equal(busts.gomez.file, "bust-gomez-v3");

  const entrances = entranceManifest as Record<string, any>;
  assert.ok(entrances.gomez);
  assert.equal(entrances.gomez.file, "gomez-defiant-entrance");
  assert.equal(entrances.gomez.frames.length, 6);
});
