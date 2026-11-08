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

test("story ladder contains 10 sequential levels ending with El Chacho", () => {
  assert.equal(STORY_LADDER.length, 10);
  STORY_LADDER.forEach((entry, idx) => {
    assert.equal(entry.level, idx + 1);
  });
  assert.equal(STORY_LADDER[9].defaultRival, "bolivar");
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

test("initial unlocked fighters include El Gallo, Armandito and Portugal", () => {
  assert.ok(INITIAL_UNLOCKED_FIGHTERS.includes("simon"));
  assert.ok(INITIAL_UNLOCKED_FIGHTERS.includes("zavarce"));
  assert.ok(INITIAL_UNLOCKED_FIGHTERS.includes("vallenilla"));
});

test("getStoryMatch swaps rival if player picks the ladder rival to avoid mirror matches", () => {
  // Level 1 default is zavarce
  const matchForSimon = getStoryMatch(1, "simon");
  assert.equal(matchForSimon.rival, "zavarce");

  // If player picked zavarce, Level 1 rival swaps to simon
  const matchForZavarce = getStoryMatch(1, "zavarce");
  assert.equal(matchForZavarce.rival, "simon");

  // If player picked bolivar, Level 10 rival swaps to simon
  const matchForBolivar = getStoryMatch(10, "bolivar");
  assert.equal(matchForBolivar.rival, "simon");
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
  assert.ok(isFighterUnlocked("simon", p));
  assert.ok(isFighterUnlocked("zavarce", p));
  assert.ok(!isFighterUnlocked("bolivar", p));
});
