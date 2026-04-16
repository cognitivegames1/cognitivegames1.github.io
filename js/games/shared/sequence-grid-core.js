import { createTileGrid, enableTileGrid } from "../../lib/tile-grid.js";
import { randInt, shuffle } from "../../lib/random.js";
import { MISTAKE_FLASH_MS } from "../../lib/feedback.js";
import { delay } from "../../lib/async.js";
import { mountGame } from "./game-session.js";

/**
 * @typedef {import('./task.js').TaskResult} TaskResult
 * @typedef {import('./task.js').TaskEnv} TaskEnv
 * @typedef {{
 *   timings: (difficulty: number) => { onMs: number, offMs: number },
 *   generateSequence?: (difficulty: number) => { size: number, sequence: number[] } | null,
 *   expectedOrder?: (sequence: number[]) => number[],
 *   userPhaseText: string,
 *   onWrongTap?: 'fail' | 'rewind',
 *   successRule?: 'threshold' | 'completed',
 *   successThreshold?: number,
 *   pointsForSuccess: (args: { difficulty: number, length: number, accuracy: number }) => number,
 *   metrics: (args: { length: number, correctSteps: number, mistakes: number }) => Record<string, number | string | boolean | null>,
 * }} GridSequenceOptions
 */

function defaultSequence(difficulty) {
  const size = difficulty <= 2 ? 3 : 4;
  const n = size * size;
  const seqMin = Math.min(n, 2 + difficulty);
  const seqMax = Math.min(n, 4 + difficulty);
  const seqLen = randInt(seqMin, Math.max(seqMin, seqMax));
  const sequence = shuffle([...Array(n)].map((_, i) => i)).slice(0, seqLen);
  return { size, sequence };
}

/**
 * Pure single-round task. Resolves with TaskResult, or null if cancelled.
 *
 * @param {HTMLElement} root
 * @param {TaskEnv} env
 * @param {GridSequenceOptions} opts
 * @returns {Promise<TaskResult | null>}
 */
export function runGridSequenceTask(root, env, opts) {
  const { difficulty, isActive } = env;
  const onWrongTap = opts.onWrongTap || "fail";
  const successRule = opts.successRule || "threshold";

  const generated = opts.generateSequence
    ? opts.generateSequence(difficulty)
    : defaultSequence(difficulty);
  if (!generated) return Promise.resolve(null);

  const { size, sequence } = generated;
  const expectedOrder = opts.expectedOrder ? opts.expectedOrder(sequence) : sequence;
  const { onMs, offMs } = opts.timings(difficulty);

  return new Promise(async (resolve) => {
    const phase = document.createElement("p");
    phase.className = "phase-label";
    phase.textContent = "Watch the sequence…";
    root.appendChild(phase);

    const wrap = document.createElement("div");
    root.appendChild(wrap);

    const { tiles } = createTileGrid(wrap, size, { interactive: false });

    for (const idx of sequence) {
      if (!isActive()) return resolve(null);
      tiles[idx].classList.add("highlight", "flash");
      await delay(onMs);
      if (!isActive()) return resolve(null);
      tiles[idx].classList.remove("highlight", "flash");
      await delay(offMs);
    }
    if (!isActive()) return resolve(null);

    phase.textContent = opts.userPhaseText;

    let step = 0;
    let done = false;
    let resolving = false;
    let correctSteps = 0;
    let mistakes = 0;
    const length = expectedOrder.length;

    const finish = (success, points) => {
      done = true;
      for (const t of tiles) t.disabled = true;
      const quality = successRule === "completed"
        ? ((correctSteps + mistakes) ? correctSteps / (correctSteps + mistakes) : 0)
        : (length ? correctSteps / length : 0);
      resolve({
        success,
        quality,
        points,
        metrics: opts.metrics({ length, correctSteps, mistakes }),
        summary: `Correct ${correctSteps}/${length}, mistakes ${mistakes}.`,
      });
    };

    const onClick = async (i) => {
      if (done || resolving || !isActive()) return;
      resolving = true;
      const pressed = tiles[i];
      pressed.classList.add("flash");
      window.setTimeout(() => pressed.classList.remove("flash"), 180);

      const expected = expectedOrder[step];
      if (i !== expected) {
        mistakes += 1;
        pressed.classList.add("mark-wrong");
        tiles[expected].classList.add("highlight");
        await delay(MISTAKE_FLASH_MS);
        if (!isActive()) { resolving = false; return resolve(null); }
        pressed.classList.remove("mark-wrong");
        tiles[expected].classList.remove("highlight");

        if (onWrongTap === "fail") {
          for (const t of tiles) t.disabled = true;
          phase.textContent = "Full sequence was…";
          for (let k = 0; k < expectedOrder.length; k++) {
            if (!isActive()) { resolving = false; return resolve(null); }
            const cell = tiles[expectedOrder[k]];
            cell.classList.add("highlight", "flash");
            await delay(Math.max(140, onMs * 0.7));
            cell.classList.remove("flash");
            await delay(Math.max(60, offMs * 0.5));
          }
          if (!isActive()) { resolving = false; return resolve(null); }
          finish(false, 0);
          resolving = false;
          return;
        }
        if (step > 0) {
          step -= 1;
          tiles[expectedOrder[step]].classList.remove("selected");
        }
        phase.textContent = `Slip — rewind to step ${step + 1}/${length}.`;
        resolving = false;
        return;
      }

      correctSteps += 1;
      pressed.classList.add("selected");
      step += 1;
      if (step < length) {
        resolving = false;
        return;
      }

      const accuracy = successRule === "completed"
        ? ((correctSteps + mistakes) ? correctSteps / (correctSteps + mistakes) : 0)
        : (length ? correctSteps / length : 0);
      const success = successRule === "completed"
        ? true
        : accuracy >= (opts.successThreshold ?? 1);
      const points = success ? opts.pointsForSuccess({ difficulty, length, accuracy }) : 0;
      finish(success, points);
      resolving = false;
    };

    enableTileGrid(tiles, (idx) => { void onClick(idx); });
  });
}

/**
 * Game wrapper: runs runGridSequenceTask under a full session loop.
 *
 * @param {HTMLElement} root
 * @param {import('../../play-shell.js').GameShell} shell
 * @param {GridSequenceOptions & {
 *   buildResult: (args: {
 *     result: TaskResult,
 *     progress: { round: number, totalRounds: number, nextDifficulty: number },
 *   }) => { title: string, detail: string },
 * }} opts
 */
export function mountGridSequenceGame(root, shell, opts) {
  return mountGame(root, shell, {
    runTask: (el, env) => runGridSequenceTask(el, env, opts),
    buildResult: opts.buildResult,
  });
}
