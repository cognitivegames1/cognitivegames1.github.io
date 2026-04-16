import { randInt, shuffle } from "../lib/random.js";
import {
  mountGridSequenceGame,
  runGridSequenceTask,
} from "./shared/sequence-grid-core.js";

export const instructionsHtml = `
  <strong>Sequence Echo</strong> — Tiles flash in order. Repeat the same order by tapping the grid.
  First wrong tap ends the round immediately.`;

/** @type {import('./shared/task.js').TaskMeta} */
export const taskMeta = { domains: ["memory", "spatial"] };

/** @type {import('./shared/sequence-grid-core.js').GridSequenceOptions} */
const sequenceOpts = {
  timings(difficulty) {
    return {
      onMs: Math.max(180, 560 - difficulty * 75),
      offMs: Math.max(85, 220 - difficulty * 30),
    };
  },
  generateSequence(difficulty) {
    const size = difficulty <= 2 ? 3 : difficulty <= 4 ? 4 : 5;
    const n = size * size;
    const seqMin = Math.min(n, 2 + difficulty);
    const seqMax = Math.min(n, 4 + difficulty);
    const seqLen = randInt(seqMin, Math.max(seqMin, seqMax));
    const sequence = shuffle([...Array(n)].map((_, i) => i)).slice(0, seqLen);
    return { size, sequence };
  },
  userPhaseText: "Your turn — repeat the sequence.",
  onWrongTap: "fail",
  pointsForSuccess({ difficulty, length, accuracy }) {
    return Math.round((70 + length * 12 + difficulty * 10) * (0.65 + 0.35 * accuracy));
  },
  metrics({ length, correctSteps, mistakes }) {
    return {
      sequenceLength: length,
      sequenceCorrect: correctSteps,
      sequenceMistakes: mistakes,
    };
  },
};

/** @param {HTMLElement} root @param {import('./shared/task.js').TaskEnv} env */
export function runTask(root, env) {
  return runGridSequenceTask(root, env, sequenceOpts);
}

/**
 * @param {HTMLElement} root
 * @param {import('../play-shell.js').GameShell} shell
 */
export function mount(root, shell) {
  return mountGridSequenceGame(root, shell, {
    ...sequenceOpts,
    buildResult({ result, progress }) {
      const m = /** @type {any} */ (result.metrics);
      return {
        title: result.success ? "Sequence held." : "Sequence slipped.",
        detail: `${result.success ? `+${result.points} points. ` : ""}Correct ${m.sequenceCorrect}/${m.sequenceLength}. Mistakes: ${m.sequenceMistakes}. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      };
    },
  });
}
