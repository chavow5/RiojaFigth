import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STORY_LADDER,
  INITIAL_UNLOCKED_FIGHTERS,
  calculateEffectiveDifficulty,
  getStoryMatch,
  advanceStoryProgress,
  resetStoryProgress,
  readStoryProgress,
  isFighterUnlocked,
  defaultStoryProgress,
} from "../src/game/story-mode.ts";
import { FIGHTERS } from "../shared/content.ts";

test("story ladder contains exact 10 sequential rivals requested ending with El Chacho", () => {
  assert.equal(STORY_LADDER.length, 10);
  const expectedRivals = [
    "gomez",      // 1. El COE
    "conde",      // 2. Coché Coché
    "vallenilla", // 3. Josué Portugal
    "javier",     // 4. La Muni
    "simon",      // 5. El Gallo
    "renny",      // 6. Martín Menem
    "maite",      // 7. La Teresita
    "capriles",   // 8. Felipe Álvarez
    "emilio",     // 9. Bigote
    "bolivar",    // 10. La Leyenda El Chacho
  ];

  STORY_LADDER.forEach((entry, idx) => {
    assert.equal(entry.level, idx + 1);
    assert.equal(entry.defaultRival, expectedRivals[idx], `Level ${idx + 1} rival should be ${expectedRivals[idx]}`);
  });
});

test("all default ladder rivals are valid fighters in the roster", () => {
  const rosterIds = new Set(FIGHTERS.map((f) => f.id));
  for (const entry of STORY_LADDER) {
    assert.ok(
      rosterIds.has(entry.defaultRival),
      `Rival ${entry.defaultRival} must exist in FIGHTERS`,
    );
  }
});

test("initial unlocked protagonist is Armandito Molina", () => {
  assert.deepEqual([...INITIAL_UNLOCKED_FIGHTERS], ["zavarce"]);
});

test("getStoryMatch swaps rival if player picks the ladder rival to avoid mirror matches", () => {
  // Level 1 default is gomez
  const matchForZavarce = getStoryMatch(1, "zavarce");
  assert.equal(matchForZavarce.rival, "gomez");

  // If player unlocked and picked gomez, Level 1 rival swaps to zavarce
  const matchForGomez = getStoryMatch(1, "gomez");
  assert.equal(matchForGomez.rival, "zavarce");

  // If player picked bolivar, Level 10 rival swaps to zavarce
  const matchForBolivar = getStoryMatch(10, "bolivar");
  assert.equal(matchForBolivar.rival, "zavarce");
});

test("difficulty scales as level increases", () => {
  // Suave ("easy")
  assert.equal(calculateEffectiveDifficulty("easy", 1), "easy");
  assert.equal(calculateEffectiveDifficulty("easy", 3), "easy");
  assert.equal(calculateEffectiveDifficulty("easy", 5), "normal");
  assert.equal(calculateEffectiveDifficulty("easy", 8), "hard");
  assert.equal(calculateEffectiveDifficulty("easy", 10), "hard");

  // Normal ("normal")
  assert.equal(calculateEffectiveDifficulty("normal", 1), "easy");
  assert.equal(calculateEffectiveDifficulty("normal", 4), "normal");
  assert.equal(calculateEffectiveDifficulty("normal", 8), "hard");

  // Candela ("hard")
  assert.equal(calculateEffectiveDifficulty("hard", 1), "normal");
  assert.equal(calculateEffectiveDifficulty("hard", 5), "hard");
  assert.equal(calculateEffectiveDifficulty("hard", 10), "hard");
});

test("story progress defaults and unlocking", () => {
  const p = defaultStoryProgress();
  assert.equal(p.currentLevel, 1);
  assert.equal(p.completed, false);
  assert.equal(p.introSeen, false);
  assert.ok(isFighterUnlocked("zavarce", p));
  assert.ok(!isFighterUnlocked("bolivar", p));
  assert.ok(!isFighterUnlocked("gomez", p));
});
