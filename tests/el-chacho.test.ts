import test from "node:test";
import assert from "node:assert/strict";
import { fighterById } from "../shared/content";
import { finaleById } from "../shared/finales";
import atlasManifest from "../shared/sprite-geometry.json";
import attackManifest from "../shared/attack-assets.json";
import entranceManifest from "../shared/entrance-assets.json";
import portraitBusts from "../shared/portrait-busts.json";

test("El Chacho (bolivar) fighter profile and federal lore", () => {
  const fighter = fighterById("bolivar");
  assert.equal(fighter.id, "bolivar");
  assert.equal(fighter.name, "El Chacho");
  assert.equal(fighter.sprite, "bolivar-v39");
  assert.equal(fighter.ability, "liberator");
  assert.equal(fighter.special, "Carga Federal");
  assert.ok(fighter.combos.includes("Carga de los Llanos"));
  assert.ok(fighter.description.includes("Peñaloza"));
});

test("El Chacho finale and montonera attack", () => {
  const finale = finaleById("bolivar");
  assert.ok(finale);
  assert.equal(finale.id, "bolivar");
  assert.equal(finale.mode, "field");
  assert.equal(finale.title, "Carga de la Montonera");
});

test("El Chacho combat atlas has 8 distinct poses in sprite-geometry.json", () => {
  const entry = atlasManifest.sprites.find((s) => s.id === "bolivar");
  assert.ok(entry);
  const fileEntry = entry.files.find((f) => f.file === "public/assets/bolivar-v39.webp");
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

test("El Chacho bust and entrance manifests are present", () => {
  const busts = portraitBusts as Record<string, any>;
  assert.ok(busts.bolivar);
  assert.equal(busts.bolivar.file, "bust-bolivar-v39");

  const entrances = entranceManifest as Record<string, any>;
  assert.ok(entrances.bolivar);
  assert.equal(entrances.bolivar.file, "bolivar-defiant-entrance");
  assert.equal(entrances.bolivar.frames.length, 6);
});
