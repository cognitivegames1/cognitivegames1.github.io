import { createTileGrid } from "../lib/tile-grid.js";
import { pickN, randInt } from "../lib/random.js";
import { delay } from "../lib/async.js";
import { createRoundRuntime } from "./shared/round-runtime.js";
import { showSessionComplete } from "./shared/results.js";

export const instructionsHtml = `
  <strong>Pattern Grid</strong> — A pattern flashes briefly. Tap only the cells that were highlighted.
  The first wrong tap fails the round immediately.`;

/**
 * @param {HTMLElement} root
 * @param {import('../play-shell.js').GameShell} shell
 */
export function mount(root, shell) {
  const runtime = createRoundRuntime(root, shell);
  const teardown = runtime.teardown;
  const reset = runtime.reset;

  async function beginRound() {
    const myRound = runtime.beginRound();

    const difficulty = shell.getDifficulty();
    const size = difficulty <= 2 ? 3 : difficulty === 3 ? 4 : 5;
    const n = size * size;
    const kMin = Math.max(2, Math.min(n - 1, 1 + difficulty * 2));
    const kMax = Math.max(kMin, Math.min(n - 1, 3 + difficulty * 2));
    const k = randInt(kMin, kMax);
    const target = new Set(pickN([...Array(n)].map((_, i) => i), k));

    const phase = document.createElement("p");
    phase.className = "phase-label";
    phase.textContent = "Memorize the highlighted cells…";
    root.appendChild(phase);

    const wrap = document.createElement("div");
    root.appendChild(wrap);

    const { tiles } = createTileGrid(wrap, size, { interactive: false });

    for (let i = 0; i < tiles.length; i++) {
      if (target.has(i)) tiles[i].classList.add("highlight");
    }

    const previewMs = size === 3 ? 1800 : size === 4 ? 1500 : 1250;
    await delay(previewMs);
    if (!runtime.isActive(myRound)) return;

    for (let i = 0; i < tiles.length; i++) {
      tiles[i].classList.remove("highlight");
    }

    phase.textContent = "Tap only the cells from memory. First mistake fails.";

    /** @type {Set<number>} */
    const found = new Set();
    let done = false;

    for (let i = 0; i < tiles.length; i++) {
      const idx = i;
      const btn = tiles[idx];
      btn.disabled = false;
      btn.classList.add("interactive");
      btn.addEventListener("click", () => {
        if (done || !runtime.isActive(myRound)) return;
        if (found.has(idx)) return;

        if (!target.has(idx)) {
          done = true;
          btn.classList.add("mark-wrong");
          for (const t of tiles) t.disabled = true;
          const quality = target.size > 0 ? found.size / target.size : 0;
          const progress = shell.recordRound(false, 0, {
            qualityFraction: quality,
            metrics: {
              patternCells: target.size,
              patternCorrect: found.size,
              patternMistakes: 1,
            },
          });
          shell.stopTimer();
          if (progress.done) {
            showSessionComplete(shell, progress);
            return;
          }
          shell.showResult(
            "Pattern broken.",
            `Wrong tile (red). Correct ${found.size}/${target.size}. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
          );
          return;
        }

        found.add(idx);
        btn.classList.add("selected");
        btn.disabled = true;
        phase.textContent = `Correct ${found.size}/${target.size}.`;

        if (found.size === target.size) {
          done = true;
          const pts = Math.round(88 + target.size * 8 + difficulty * 6);
          const progress = shell.recordRound(true, pts, {
            qualityFraction: 1,
            metrics: {
              patternCells: target.size,
              patternCorrect: found.size,
              patternMistakes: 0,
            },
          });
          shell.stopTimer();
          if (progress.done) {
            showSessionComplete(shell, progress);
            return;
          }
          shell.showResult(
            "Pattern captured.",
            `+${pts} points. Correct ${found.size}/${target.size}. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
          );
          return;
        }
      });
    }
  }

  return {
    restart: beginRound,
    reset,
    destroy: teardown,
  };
}
