import { createTileGrid } from "../../lib/tile-grid.js";
import { randInt } from "../../lib/random.js";
import { delay } from "../../lib/async.js";
import { createRoundRuntime } from "./round-runtime.js";
import { showSessionComplete } from "./results.js";

/**
 * @typedef {{
 *   timings: (difficulty: number) => { onMs: number, offMs: number },
 *   expectedOrder: (sequence: number[]) => number[],
 *   userPhaseText: string,
 *   failOnFirstMistake?: boolean,
 *   successThreshold: number,
 *   pointsForSuccess: (args: { difficulty: number, length: number, accuracy: number }) => number,
 *   metrics: (args: { length: number, correctSteps: number, mistakes: number }) => Record<string, number | string | boolean | null>,
 *   roundResult: (args: {
 *     success: boolean,
 *     points: number,
 *     correctSteps: number,
 *     mistakes: number,
 *     length: number,
 *     progress: { round: number, totalRounds: number, nextDifficulty: number },
 *   }) => { title: string, detail: string },
 * }} GridSequenceOptions
 */

/**
 * @param {HTMLElement} root
 * @param {import('../../play-shell.js').GameShell} shell
 * @param {GridSequenceOptions} opts
 */
export function mountGridSequenceGame(root, shell, opts) {
  const runtime = createRoundRuntime(root, shell);
  const teardown = runtime.teardown;
  const reset = runtime.reset;

  async function beginRound() {
    const myRound = runtime.beginRound();

    const difficulty = shell.getDifficulty();
    const size = difficulty <= 2 ? 3 : 4;
    const n = size * size;
    const seqMin = Math.min(n, 2 + difficulty);
    const seqMax = Math.min(n, 4 + difficulty);
    const seqLen = randInt(seqMin, Math.max(seqMin, seqMax));
    const { onMs, offMs } = opts.timings(difficulty);

    /** @type {number[]} */
    const sequence = [];
    for (let i = 0; i < seqLen; i++) sequence.push(randInt(0, n - 1));
    const expectedOrder = opts.expectedOrder(sequence);

    const phase = document.createElement("p");
    phase.className = "phase-label";
    phase.textContent = "Watch the sequence…";
    root.appendChild(phase);

    const wrap = document.createElement("div");
    root.appendChild(wrap);

    const { tiles } = createTileGrid(wrap, size, { interactive: false });

    for (const idx of sequence) {
      if (!runtime.isActive(myRound)) return;
      tiles[idx].classList.add("highlight", "flash");
      await delay(onMs);
      if (!runtime.isActive(myRound)) return;
      tiles[idx].classList.remove("highlight", "flash");
      await delay(offMs);
    }

    if (!runtime.isActive(myRound)) return;

    phase.textContent = opts.userPhaseText;
    for (const t of tiles) {
      t.disabled = false;
      t.classList.add("interactive");
    }

    let step = 0;
    let done = false;
    let resolving = false;
    let correctSteps = 0;
    let mistakes = 0;

    const onClick = async (i) => {
      if (done || resolving || !runtime.isActive(myRound)) return;
      resolving = true;
      const pressed = tiles[i];
      pressed.classList.add("flash");
      window.setTimeout(() => {
        pressed.classList.remove("flash");
      }, 180);

      const expected = expectedOrder[step];
      if (i !== expected) {
        mistakes += 1;
        pressed.classList.add("mark-wrong");
        tiles[expected].classList.add("highlight");
        await delay(260);
        if (!runtime.isActive(myRound)) return;
        pressed.classList.remove("mark-wrong");
        tiles[expected].classList.remove("highlight");

        if (opts.failOnFirstMistake) {
          done = true;
          for (const t of tiles) t.disabled = true;
          const length = expectedOrder.length;
          const accuracy = length ? correctSteps / length : 0;
          const progress = shell.recordRound(false, 0, {
            qualityFraction: accuracy,
            metrics: opts.metrics({ length, correctSteps, mistakes }),
          });
          shell.stopTimer();
          if (progress.done) {
            showSessionComplete(shell, progress);
            return;
          }
          const result = opts.roundResult({
            success: false,
            points: 0,
            correctSteps,
            mistakes,
            length,
            progress,
          });
          shell.showResult(result.title, result.detail);
          resolving = false;
          return;
        }
      } else {
        correctSteps += 1;
        pressed.classList.add("selected");
      }

      step += 1;
      if (step < expectedOrder.length) {
        resolving = false;
        return;
      }

      done = true;
      for (const t of tiles) t.disabled = true;

      const length = expectedOrder.length;
      const accuracy = length ? correctSteps / length : 0;
      const success = accuracy >= opts.successThreshold;
      const points = success
        ? opts.pointsForSuccess({ difficulty, length, accuracy })
        : 0;

      const progress = shell.recordRound(success, points, {
        qualityFraction: accuracy,
        metrics: opts.metrics({ length, correctSteps, mistakes }),
      });
      shell.stopTimer();

      if (progress.done) {
        showSessionComplete(shell, progress);
        return;
      }

      const result = opts.roundResult({
        success,
        points,
        correctSteps,
        mistakes,
        length,
        progress,
      });
      shell.showResult(result.title, result.detail);
      resolving = false;
    };

    for (let i = 0; i < tiles.length; i++) {
      const idx = i;
      tiles[idx].addEventListener("click", () => {
        void onClick(idx);
      });
    }
  }

  return {
    restart: beginRound,
    reset,
    destroy: teardown,
  };
}
