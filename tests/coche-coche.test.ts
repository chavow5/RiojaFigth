import test from "node:test";
import assert from "node:assert/strict";
import { fighterById } from "../shared/content";
import { finaleById } from "../shared/finales";
import atlasManifest from "../shared/sprite-geometry.json";
import attackManifest from "../shared/attack-assets.json";
import entranceManifest from "../shared/entrance-assets.json";
import portraitBusts from "../shared/portrait-busts.json";

test("Coché Coché (conde) fighter profile and wine attack lore", () => {
  const fighter = fighterById("conde");
  assert.equal(fighter.id, "conde");
  assert.equal(fighter.name, "Coché Coché");
  assert.equal(fighter.sprite, "conde-v3");
  assert.equal(fighter.ability, "whirl");
  assert.equal(fighter.special, "Chorro y Giro del 4");
  assert.ok(fighter.combos.includes("Chorro de Tinto"));
  assert.ok(fighter.description.includes("vino tinto"));
});

test("Coché Coché finale includes wine attack and transformation", () => {
  const finale = finaleById("conde");
  assert.ok(finale);
  assert.equal(finale.id, "conde");
  assert.equal(finale.mode, "transformation");
  assert.equal(finale.title, "Chorro y Giro del 4");
  assert.ok(finale.description.includes("vino tinto"));
  assert.ok(finale.prop.includes("Tetrabrik de vino tinto"));
});

test("Coché Coché combat atlas has 8 distinct poses in sprite-geometry.json", () => {
  const entry = atlasManifest.sprites.find((s) => s.id === "conde");
  assert.ok(entry);
  const fileEntry = entry.files.find((f) => f.file === "public/assets/conde-v3.webp");
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

test("Coché Coché attack sheet has all required transformation frames with whirl and punch", () => {
  const attacks = attackManifest as Record<string, any>;
  const condeAttack = attacks.conde;
  assert.ok(condeAttack);
  assert.equal(condeAttack.file, "attack-conde-bond-v1");
  const frames = condeAttack.frames;
  assert.ok(frames.ready);
  assert.ok(frames.guard);
  assert.ok(frames.run);
  assert.ok(frames.jump);
  assert.ok(frames.punch);
  assert.ok(frames.kick);
  assert.ok(frames.hurt);
  assert.ok(frames.whirl);
});

test("Coché Coché bust and entrance manifests are present", () => {
  const busts = portraitBusts as Record<string, any>;
  assert.ok(busts.conde);
  assert.equal(busts.conde.file, "bust-conde-v3");

  const entrances = entranceManifest as Record<string, any>;
  assert.ok(entrances.conde);
  assert.equal(entrances.conde.file, "conde-entrance-v1");
  assert.equal(entrances.conde.frames.length, 6);
});
