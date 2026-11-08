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
    defaultRival: "gomez",
    stage: "guaira",
    chapterTitle: "Capítulo 1: Operativo de Emergencia",
    chapterSubtitle: "El Superdomo · Parque de la Ciudad",
    lore: "Armandito inicia su camino al caudillismo enfrentando la disciplina pesada, pozos de asfalto y barricadas del COE.",
  },
  {
    level: 2,
    defaultRival: "conde",
    stage: "canaima",
    chapterTitle: "Capítulo 2: Risa y Candela",
    chapterSubtitle: "Calle Pelagio B. Luna · Centro Histórico",
    lore: "Coché Coché intenta desconcentrar a Armandito con sus ocurrencias, fintas impredecibles y humor pícaro en el casco céntrico.",
  },
  {
    level: 3,
    defaultRival: "vallenilla",
    stage: "valencia",
    chapterTitle: "Capítulo 3: El Guardián del Famatina",
    chapterSubtitle: "Monumento a Facundo Quiroga · Parque de las Juventudes",
    lore: "Josué Portugal baja de las alturas cordilleranas con sus bastones de trekking para medir el temple y la resistencia de Armandito.",
  },
  {
    level: 4,
    defaultRival: "javier",
    stage: "caracas",
    chapterTitle: "Capítulo 4: Barrido Urbano",
    chapterSubtitle: "Catedral San Nicolás · Plaza 25 de Mayo",
    lore: "La Muni pone a prueba la capacidad de gestión de Armandito con operativos de limpieza implacables, conos y trabajo en equipo.",
  },
  {
    level: 5,
    defaultRival: "simon",
    stage: "guaira",
    chapterTitle: "Capítulo 5: El Rey de la Chaya",
    chapterSubtitle: "El Superdomo · Parque de la Ciudad",
    lore: "El Gallo desata toda la fiesta chayera: coplas al viento, harina y albahaca para desafiar el ritmo del nuevo aspirante a caudillo.",
  },
  {
    level: 6,
    defaultRival: "renny",
    stage: "caracas",
    chapterTitle: "Capítulo 6: Moción de Orden",
    chapterSubtitle: "Catedral San Nicolás · Plaza 25 de Mayo",
    lore: "Martín Menem entra a la arena con rigidez parlamentaria, su campanazo legislativo y discursos de precisión milimétrica.",
  },
  {
    level: 7,
    defaultRival: "maite",
    stage: "canaima",
    chapterTitle: "Capítulo 7: La Voz del Pueblo",
    chapterSubtitle: "Calle Pelagio B. Luna · Centro Histórico",
    lore: "La Teresita hace tronar el centro histórico con su carisma arrollador, micrófono en mano y la ovación popular de las peñas riojanas.",
  },
  {
    level: 8,
    defaultRival: "capriles",
    stage: "canaima",
    chapterTitle: "Capítulo 8: Táctica y Oposición",
    chapterSubtitle: "Calle Pelagio B. Luna · Centro Histórico",
    lore: "Felipe Álvarez desafía a Armandito con análisis calculador, contraataques veloces y estrategia política riojana.",
  },
  {
    level: 9,
    defaultRival: "emilio",
    stage: "valencia",
    chapterTitle: "Capítulo 9: El Viejo Zorro",
    chapterSubtitle: "Monumento a Facundo Quiroga · Parque de las Juventudes",
    lore: "Bigote se planta en la antesala de la gloria: años de experiencia, picardía y cintura política para frenar la marcha de Armandito.",
  },
  {
    level: 10,
    defaultRival: "bolivar",
    stage: "valencia",
    chapterTitle: "Batalla Final: La Leyenda Federal",
    chapterSubtitle: "Monumento a Facundo Quiroga · Parque de las Juventudes",
    lore: "Ángel Vicente 'El Chacho' Peñaloza, caudillo supremo y prócer indiscutido de La Rioja. ¡El combate definitivo para ser el gran caudillo riojano!",
  },
];

export const INITIAL_UNLOCKED_FIGHTERS: readonly FighterId[] = [
  "zavarce",
];

export interface StoryProgress {
  currentLevel: number;
  unlockedFighters: FighterId[];
  completed: boolean;
  highestLevelUnlocked: number;
  introSeen: boolean;
}

const STORY_STORAGE_KEY = "arena-story-progress-v2";

export function defaultStoryProgress(): StoryProgress {
  return {
    currentLevel: 1,
    unlockedFighters: [...INITIAL_UNLOCKED_FIGHTERS],
    completed: false,
    highestLevelUnlocked: 1,
    introSeen: false,
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
      introSeen: Boolean(data.introSeen),
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
 * If the default rival is the player's chosen fighter, we swap cleanly
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
    rival = playerFighter === "zavarce" ? "bolivar" : "zavarce";
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

export function markStoryIntroSeen(): StoryProgress {
  const current = readStoryProgress();
  current.introSeen = true;
  saveStoryProgress(current);
  return current;
}

export function resetStoryProgress(): StoryProgress {
  const fresh = defaultStoryProgress();
  saveStoryProgress(fresh);
  return fresh;
}
