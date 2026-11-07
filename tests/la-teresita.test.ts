import test from "node:test";
import assert from "node:assert/strict";
import { fighterById } from "../shared/content";
import atlasManifest from "../shared/sprite-geometry.json";
import entranceManifest from "../shared/entrance-assets.json";
import portraitBusts from "../shared/portrait-busts.json";

test("La Teresita (maite) fighter profile and provincial lore", () => {
  const fighter = fighterById("maite");
  assert.equal(fighter.id, "maite");
  assert.equal(fighter.name, "La Teresita");
  assert.equal(fighter.sprite, "maite-v3");
  assert.equal(fighter.ability, "spotlight");
  assert.equal(fighter.special, "Voz del Superdomo");
  assert.ok(fighter.combos.includes("Despliegue Territorial"));
  assert.ok(fighter.description.includes("Superdomo"));
});

test("La Teresita combat atlas has 8 distinct dynamic poses in sprite-geometry.json", () => {
  const entry = atlasManifest.sprites.find((s) => s.id === "maite");
  assert.ok(entry, "maite must exist in sprite-geometry.json");
  const fileEntry = entry.files.find((f) => f.file === "public/assets/maite-v3.webp");
  assert.ok(fileEntry, "maite-v3.webp must exist in entry");
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

test("La Teresita bust and entrance manifests are present", () => {
  const busts = portraitBusts as Record<string, any>;
  assert.ok(busts.maite);
  assert.equal(busts.maite.file, "bust-maite-v3");

  const entrances = entranceManifest as Record<string, any>;
  assert.ok(entrances.maite);
  assert.equal(entrances.maite.file, "maite-defiant-entrance");
  assert.equal(entrances.maite.frames.length, 6);
});
