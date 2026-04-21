import { pick, randInt } from "../lib/random.js";
import {
  mountGridSequenceGame,
  runGridSequenceTask,
} from "./shared/sequence-grid-core.js";

function neighbors(idx, size) {
  const r = Math.floor(idx / size);
  const c = idx % size;
  const out = [];
  if (r > 0) out.push(idx - size);
  if (r < size - 1) out.push(idx + size);
  if (c > 0) out.push(idx - 1);
  if (c < size - 1) out.push(idx + 1);
  return out;
}

function randomPath(size, len) {
  const n = size * size;
  let cur = randInt(0, n - 1);
  const path = [cur];
  for (let i = 1; i < len; i++) {
    const opts = neighbors(cur, size).filter(
      (x) => !path.includes(x) && (path.length < 2 || x !== path[path.length - 2]),
    );
    if (opts.length === 0) return null;
    cur = pick(opts);
    path.push(cur);
  }
  return path;
}

function fallbackPath(size, targetLen) {
  const len = Math.max(3, Math.min(targetLen, size));
  const horizontal = randInt(0, 1) === 0;
  const reversed = randInt(0, 1) === 1;
  if (horizontal) {
    const row = randInt(0, size - 1);
    const startCol = randInt(0, size - len);
    const seq = [...Array(len)].map((_, i) => row * size + startCol + i);
    return reversed ? seq.reverse() : seq;
  }
  const col = randInt(0, size - 1);
  const startRow = randInt(0, size - len);
  const seq = [...Array(len)].map((_, i) => (startRow + i) * size + col);
  return reversed ? seq.reverse() : seq;
}

function generatePath(difficulty) {
  const size = difficulty <= 2 ? 4 : difficulty <= 4 ? 5 : 6;
  const targetLen = Math.min(size * size - 2, 3 + difficulty * 2);
  for (let len = targetLen; len >= 3; len--) {
    for (let t = 0; t < 40; t++) {
      const path = randomPath(size, len);
      if (path) return { size, sequence: path };
    }
  }
  return {
    size,
    sequence: fallbackPath(size, targetLen),
  };
}

export const instructionsHtml = `
  <strong>Path Memory</strong> — A path lights up along adjacent cells. Watch, then tap the same route in order.
  Wrong taps rewind one step, so you need to recover from memory slips.`;

/** @type {import('./shared/task.js').TaskMeta} */
export const taskMeta = { domains: ["spatial", "memory"] };

/** @type {import('./shared/sequence-grid-core.js').GridSequenceOptions} */
const pathOpts = {
  timings(difficulty) {
    return {
      onMs: Math.max(200, 420 - difficulty * 45),
      offMs: Math.max(100, 200 - difficulty * 18),
    };
  },
  generateSequence: generatePath,
  userPhaseText: "Retrace the path on the grid.",
  onWrongTap: "rewind",
  revealExpectedOnWrong: false,
  successRule: "threshold",
  successThreshold: 0.85,
  quality({ length, mistakes }) {
    return length > 0 ? length / (length + mistakes) : 0;
  },
  pointsForSuccess({ difficulty, length, accuracy }) {
    return Math.round((75 + length * 10 + difficulty * 8) * (0.6 + 0.4 * accuracy));
  },
  metrics({ length, mistakes }) {
    return {
      pathLength: length,
      pathMistakes: mistakes,
      pathTaps: length + mistakes,
    };
  },
};

/** @param {HTMLElement} root @param {import('./shared/task.js').TaskEnv} env */
export function runTask(root, env) {
  return runGridSequenceTask(root, env, pathOpts);
}

/**
 * @param {HTMLElement} root
 * @param {import('../play-shell.js').GameShell} shell
 */
export function mount(root, shell) {
  return mountGridSequenceGame(root, shell, {
    ...pathOpts,
    buildResult({ result, progress }) {
      const m = /** @type {any} */ (result.metrics);
      return {
        title: result.success ? "Path recovered." : "Path unstable.",
        detail: `${result.success ? `+${result.points} points. ` : ""}Mistakes: ${m.pathMistakes}. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      };
    },
  });
}
