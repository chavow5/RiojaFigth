import test from "node:test";
import assert from "node:assert/strict";
import { fighterById } from "../shared/content";
import atlasManifest from "../shared/sprite-geometry.json";
import entranceManifest from "../shared/entrance-assets.json";
import portraitBusts from "../shared/portrait-busts.json";

test("Armandito (zavarce) fighter profile and municipal lore", () => {
  const fighter = fighterById("zavarce");
  assert.equal(fighter.id, "zavarce");
  assert.equal(fighter.name, "Armandito");
  assert.equal(fighter.sprite, "zavarce-v5");
  assert.equal(fighter.ability, "courier");
  assert.equal(fighter.special, "Despliegue Rápido");
  assert.ok(fighter.combos.includes("Cuadrilla Urbana"));
  assert.ok(fighter.description.includes("gestión riojana"));
});

test("Armandito combat atlas has 8 distinct dynamic poses in sprite-geometry.json", () => {
  const entry = atlasManifest.sprites.find((s) => s.id === "zavarce");
  assert.ok(entry, "zavarce must exist in sprite-geometry.json");
  const fileEntry = entry.files.find((f) => f.file === "public/assets/zavarce-v5.webp");
  assert.ok(fileEntry, "zavarce-v5.webp must exist in entry");
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

test("Armandito bust and entrance manifests are present", () => {
  const busts = portraitBusts as Record<string, any>;
  assert.ok(busts.zavarce);
  assert.equal(busts.zavarce.file, "bust-zavarce-v5");

  const entrances = entranceManifest as Record<string, any>;
  assert.ok(entrances.zavarce);
  assert.equal(entrances.zavarce.file, "zavarce-defiant-entrance");
  assert.equal(entrances.zavarce.frames.length, 6);
});
