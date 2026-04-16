import { createTileGrid, enableTileGrid } from "../lib/tile-grid.js";
import { pickN, randInt } from "../lib/random.js";
import { delay } from "../lib/async.js";
import { mountGame } from "./shared/game-session.js";

export const instructionsHtml = `
  <strong>Pattern Grid</strong> — A pattern flashes briefly. Tap only the cells that were highlighted.
  The first wrong tap fails the round immediately.`;

/** @type {import('./shared/task.js').TaskMeta} */
export const taskMeta = { domains: ["memory", "spatial"] };

/**
 * @param {HTMLElement} root
 * @param {import('./shared/task.js').TaskEnv} env
 * @returns {Promise<import('./shared/task.js').TaskResult | null>}
 */
export function runTask(root, env) {
  const { difficulty, isActive } = env;
  const size = difficulty <= 2 ? 3 : difficulty === 3 ? 4 : 5;
  const n = size * size;
  const kMin = Math.max(2, Math.min(n - 1, 2 + difficulty));
  const kMax = Math.max(kMin, Math.min(n - 1, 4 + difficulty));
  const k = randInt(kMin, kMax);
  const target = new Set(pickN([...Array(n)].map((_, i) => i), k));

  return new Promise(async (resolve) => {
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

    const previewMs = Math.max(1200, Math.min(2600, 300 * k));
    await delay(previewMs);
    if (!isActive()) return resolve(null);

    for (let i = 0; i < tiles.length; i++) tiles[i].classList.remove("highlight");
    phase.textContent = "Tap only the cells from memory. First mistake fails.";

    /** @type {Set<number>} */
    const found = new Set();
    let done = false;

    enableTileGrid(tiles, (idx) => {
      if (done || !isActive()) return;
      if (found.has(idx)) return;
      const btn = tiles[idx];

      if (!target.has(idx)) {
        done = true;
        btn.classList.add("mark-wrong");
        for (const t of tiles) t.disabled = true;
        for (const targetIdx of target) {
          if (!found.has(targetIdx)) tiles[targetIdx].classList.add("mark-correct");
        }
        const quality = target.size > 0 ? found.size / target.size : 0;
        resolve({
          success: false,
          quality,
          points: 0,
          metrics: {
            patternCells: target.size,
            patternCorrect: found.size,
            patternMistakes: 1,
          },
          summary: `Broken at ${found.size}/${target.size}.`,
        });
        return;
      }

      found.add(idx);
      btn.classList.add("selected");
      btn.disabled = true;
      phase.textContent = `Correct ${found.size}/${target.size}.`;

      if (found.size === target.size) {
        done = true;
        const pts = Math.round(88 + target.size * 8 + difficulty * 6);
        resolve({
          success: true,
          quality: 1,
          points: pts,
          metrics: {
            patternCells: target.size,
            patternCorrect: found.size,
            patternMistakes: 0,
          },
          summary: `Full ${target.size}/${target.size}.`,
        });
      }
    });
  });
}

/**
 * @param {HTMLElement} root
 * @param {import('../play-shell.js').GameShell} shell
 */
export function mount(root, shell) {
  return mountGame(root, shell, {
    runTask,
    buildResult({ result, progress }) {
      const m = /** @type {any} */ (result.metrics);
      return result.success
        ? {
            title: "Pattern captured.",
            detail: `+${result.points} points. Correct ${m.patternCorrect}/${m.patternCells}. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
          }
        : {
            title: "Pattern broken.",
            detail: `Wrong tile (red). Correct ${m.patternCorrect}/${m.patternCells}. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
          };
    },
  });
}
