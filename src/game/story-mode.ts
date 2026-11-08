import type { FighterId, StageId } from "../../shared/content";

export interface StoryLadderEntry {
  level: number;
  defaultRival: FighterId;
  stage: StageId;
  chapterTitle: string;
  chapterSubtitle: string;
  lore: string;
}

export const STORY_LADDER: readonly StoryLadderEntry[] = [
  {
    level: 1,
    defaultRival: "zavarce",
    stage: "caracas",
    chapterTitle: "Capítulo 1: La Ronda Municipal",
    chapterSubtitle: "Catedral San Nicolás · Plaza 25 de Mayo",
    lore: "Armandito te pone a prueba con velocidad implacable por las calles céntricas de La Rioja.",
  },
  {
    level: 2,
    defaultRival: "emilio",
    stage: "canaima",
    chapterTitle: "Capítulo 2: Pura Picardía",
    chapterSubtitle: "Calle Pelagio B. Luna · Centro Histórico",
    lore: "Bigotes entra al combate con sus ocurrencias, ritmo y agilidad entre adoquines coloniales.",
  },
  {
    level: 3,
    defaultRival: "conde",
    stage: "valencia",
    chapterTitle: "Capítulo 3: Risa y Candela",
    chapterSubtitle: "Monumento a Facundo Quiroga · Parque de las Juventudes",
    lore: "Coché Coché despliega su humor y fintas impredecibles al pie del caudillo de piedra.",
  },
  {
    level: 4,
    defaultRival: "maite",
    stage: "guaira",
    chapterTitle: "Capítulo 4: Voz de Oro",
    chapterSubtitle: "El Superdomo · Parque de la Ciudad",
    lore: "La Teresita hace tronar el domo con su presencia arrolladora y copla chayera.",
  },
  {
    level: 5,
    defaultRival: "renny",
    stage: "caracas",
    chapterTitle: "Capítulo 5: El Showman Riojano",
    chapterSubtitle: "Catedral San Nicolás · Plaza 25 de Mayo",
    lore: "Martincito maneja el escenario con elegancia y contragolpes milimétricos frente a la catedral.",
  },
  {
    level: 6,
    defaultRival: "javier",
    stage: "valencia",
    chapterTitle: "Capítulo 6: La Fuerza de la Calle",
    chapterSubtitle: "Monumento a Facundo Quiroga · Parque de las Juventudes",
    lore: "La Muni defiende su territorio con tenacidad inquebrantable y juego en equipo.",
  },
  {
    level: 7,
    defaultRival: "gomez",
    stage: "guaira",
    chapterTitle: "Capítulo 7: Furia y Resistencia",
    chapterSubtitle: "El Superdomo · Parque de la Ciudad",
    lore: "El Coe no da tregua: disciplina de acero y ataques pesados que hacen temblar el piso.",
  },
  {
    level: 8,
    defaultRival: "capriles",
    stage: "canaima",
    chapterTitle: "Capítulo 8: Táctica Histórica",
    chapterSubtitle: "Calle Pelagio B. Luna · Centro Histórico",
    lore: "Felipe Álvarez lee cada uno de tus pasos con sabiduría serrana y contraataques certeros.",
  },
  {
    level: 9,
    defaultRival: "vallenilla",
    stage: "valencia",
    chapterTitle: "Capítulo 9: El Guardián del Famatina",
    chapterSubtitle: "Monumento a Facundo Quiroga · Parque de las Juventudes",
    lore: "Josué Portugal blande sus bastones y la fuerza de los cardones de altura.",
  },
  {
    level: 10,
    defaultRival: "bolivar",
    stage: "valencia",
    chapterTitle: "Batalla Final: El Gran Caudillo",
    chapterSubtitle: "Monumento a Facundo Quiroga · Parque de las Juventudes",
    lore: "Ángel Vicente 'El Chacho' Peñaloza despierta toda la leyenda federal. ¡El duelo definitivo!",
  },
];

export const INITIAL_UNLOCKED_FIGHTERS: readonly FighterId[] = [
  "simon",
  "zavarce",
  "vallenilla",
];

export interface StoryProgress {
  currentLevel: number;
  unlockedFighters: FighterId[];
  completed: boolean;
  highestLevelUnlocked: number;
}

const STORY_STORAGE_KEY = "arena-story-progress-v1";

export function defaultStoryProgress(): StoryProgress {
  return {
    currentLevel: 1,
    unlockedFighters: [...INITIAL_UNLOCKED_FIGHTERS],
    completed: false,
    highestLevelUnlocked: 1,
  };
}

export function readStoryProgress(): StoryProgress {
  try {
    const raw = localStorage.getItem(STORY_STORAGE_KEY);
    if (!raw) return defaultStoryProgress();
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return defaultStoryProgress();

    const unlocked = Array.isArray(data.unlockedFighters)
      ? Array.from(
          new Set([
            ...INITIAL_UNLOCKED_FIGHTERS,
            ...data.unlockedFighters.filter(
              (id: unknown): id is FighterId => typeof id === "string",
            ),
          ]),
        )
      : [...INITIAL_UNLOCKED_FIGHTERS];

    const currentLevel = Math.max(1, Math.min(10, Number(data.currentLevel) || 1));
    const highestLevelUnlocked = Math.max(
      currentLevel,
      Math.min(10, Number(data.highestLevelUnlocked) || 1),
    );

    return {
      currentLevel,
      unlockedFighters: unlocked,
      completed: Boolean(data.completed),
      highestLevelUnlocked,
    };
  } catch {
    return defaultStoryProgress();
  }
}

export function saveStoryProgress(progress: StoryProgress): void {
  try {
    localStorage.setItem(STORY_STORAGE_KEY, JSON.stringify(progress));
  } catch {}
}

export function isFighterUnlocked(
  fighterId: FighterId,
  progress: StoryProgress,
): boolean {
  return progress.unlockedFighters.includes(fighterId);
}

/**
 * Returns the match setup for a story level.
 * If the default rival is the player's chosen fighter, we swap to 'simon' (El Gallo)
 * so there are never mirror matches in Story Mode.
 */
export function getStoryMatch(
  level: number,
  playerFighter: FighterId,
): StoryLadderEntry & { rival: FighterId } {
  const safeLevel = Math.max(1, Math.min(10, level));
  const entry = STORY_LADDER[safeLevel - 1] ?? STORY_LADDER[0];
  let rival = entry.defaultRival;
  if (rival === playerFighter) {
    rival = playerFighter === "simon" ? "zavarce" : "simon";
  }
  return {
    ...entry,
    rival,
  };
}

/**
 * Determines the effective CPU difficulty given player's base difficulty choice
 * and the current story ladder level.
 */
export function calculateEffectiveDifficulty(
  baseDifficulty: "easy" | "normal" | "hard",
  level: number,
): "easy" | "normal" | "hard" {
  if (baseDifficulty === "hard") {
    // Candela: level 1-3 is normal, 4-10 is hard
    return level <= 3 ? "normal" : "hard";
  }
  if (baseDifficulty === "normal") {
    // Normal: level 1-2 easy, 3-6 normal, 7-10 hard
    if (level <= 2) return "easy";
    if (level <= 6) return "normal";
    return "hard";
  }
  // Easy ("Suave"): level 1-3 easy, 4-7 normal, 8-10 hard
  if (level <= 3) return "easy";
  if (level <= 7) return "normal";
  return "hard";
}

export function difficultyLabel(diff: "easy" | "normal" | "hard"): string {
  switch (diff) {
    case "easy":
      return "Suave";
    case "normal":
      return "Normal";
    case "hard":
      return "Candela";
  }
}

/**
 * Records a victory in story mode: unlocks defeated rival, advances level,
 * and marks completion if level 10 was conquered.
 */
export function advanceStoryProgress(
  defeatedRival: FighterId,
  currentLevel: number,
): {
  progress: StoryProgress;
  newlyUnlocked: boolean;
  unlockedRival: FighterId;
  completed: boolean;
  nextLevel: number;
} {
  const current = readStoryProgress();
  const newlyUnlocked = !current.unlockedFighters.includes(defeatedRival);
  if (newlyUnlocked) {
    current.unlockedFighters.push(defeatedRival);
  }

  let completed = current.completed;
  let nextLevel = currentLevel + 1;
  if (currentLevel >= 10) {
    nextLevel = 10;
    completed = true;
  }

  current.currentLevel = nextLevel;
  current.highestLevelUnlocked = Math.max(current.highestLevelUnlocked, nextLevel);
  current.completed = completed;

  saveStoryProgress(current);

  return {
    progress: current,
    newlyUnlocked,
    unlockedRival: defeatedRival,
    completed,
    nextLevel,
  };
}

export function resetStoryProgress(): StoryProgress {
  const fresh = defaultStoryProgress();
  saveStoryProgress(fresh);
  return fresh;
}
