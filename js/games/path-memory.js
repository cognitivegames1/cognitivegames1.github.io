import { createTileGrid } from "../lib/tile-grid.js";
import { pick, randInt } from "../lib/random.js";
import { delay } from "../lib/async.js";
import { createRoundRuntime } from "./shared/round-runtime.js";
import { showSessionComplete } from "./shared/results.js";

/**
 * @param {number} idx
 * @param {number} size
 */
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

/**
 * @param {number} size
 * @param {number} len
 */
function randomPath(size, len) {
  const n = size * size;
  let cur = randInt(0, n - 1);
  /** @type {number[]} */
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

export const instructionsHtml = `
  <strong>Path Memory</strong> — A path lights up along adjacent cells. Watch, then tap the same route in order.
  Wrong taps rewind one step, so you need to recover from memory slips.`;

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
    const size = difficulty <= 2 ? 4 : difficulty <= 4 ? 5 : 6;
    const pathLen = Math.min(size * size - 2, 3 + difficulty * 2);

    let path = null;
    for (let t = 0; t < 40 && !path; t++) {
      path = randomPath(size, pathLen);
    }
    if (!path) {
      for (let len = pathLen - 1; len >= 3 && !path; len--) {
        for (let t = 0; t < 40 && !path; t++) {
          path = randomPath(size, len);
        }
      }
    }
    if (!path) path = randomPath(size, 3);
    if (!path) return;

    const onMs = Math.max(200, 420 - difficulty * 45);
    const offMs = Math.max(100, 200 - difficulty * 18);

    const phase = document.createElement("p");
    phase.className = "phase-label";
    phase.textContent = "Watch the path…";
    root.appendChild(phase);

    const wrap = document.createElement("div");
    root.appendChild(wrap);

    const { tiles } = createTileGrid(wrap, size, { interactive: false });

    for (const idx of path) {
      if (!runtime.isActive(myRound)) return;
      tiles[idx].classList.add("highlight", "flash");
      await delay(onMs);
      if (!runtime.isActive(myRound)) return;
      tiles[idx].classList.remove("highlight", "flash");
      await delay(offMs);
    }

    if (!runtime.isActive(myRound)) return;

    phase.textContent = "Retrace the path on the grid.";

    for (const t of tiles) {
      t.disabled = false;
      t.classList.add("interactive");
    }

    let step = 0;
    let done = false;
    let resolving = false;
    let mistakes = 0;
    let totalTaps = 0;
    let correctTaps = 0;

    const onClick = async (i) => {
      if (done || resolving || !runtime.isActive(myRound)) return;
      resolving = true;
      totalTaps += 1;
      const expected = path[step];
      const pressed = tiles[i];
      pressed.classList.add("flash");
      window.setTimeout(() => pressed.classList.remove("flash"), 160);

      if (i !== expected) {
        mistakes += 1;
        pressed.classList.add("mark-wrong");
        tiles[expected].classList.add("highlight");
        await delay(260);
        if (!runtime.isActive(myRound)) return;
        pressed.classList.remove("mark-wrong");
        tiles[expected].classList.remove("highlight");
        if (step > 0) {
          step -= 1;
          tiles[path[step]].classList.remove("selected");
        }
        phase.textContent = `Slip — rewind to step ${step + 1}/${path.length}.`;
        resolving = false;
        return;
      }

      correctTaps += 1;
      pressed.classList.add("selected");
      step++;
      if (step >= path.length) {
        done = true;
        for (const t of tiles) t.disabled = true;
        const quality = totalTaps > 0 ? correctTaps / totalTaps : 0;
        const success = quality >= 0.62;
        const actualLength = path.length;
        const pts = success
          ? Math.round((75 + actualLength * 10 + difficulty * 8) * (0.6 + 0.4 * quality))
          : 0;
        const progress = shell.recordRound(success, pts, {
          qualityFraction: quality,
          metrics: {
            pathLength: actualLength,
            pathMistakes: mistakes,
            pathTaps: totalTaps,
          },
        });
        shell.stopTimer();
        if (progress.done) {
          showSessionComplete(shell, progress);
          return;
        }
        shell.showResult(
          success ? "Path recovered." : "Path unstable.",
          `${success ? `+${pts} points. ` : ""}Mistakes: ${mistakes}, quality ${Math.round(quality * 100)}%. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
        );
      }
      resolving = false;
    };

    for (let i = 0; i < tiles.length; i++) {
      const idx = i;
      tiles[idx].addEventListener("click", () => onClick(idx));
    }
  }

  return {
    restart: beginRound,
    reset,
    destroy: teardown,
  };
}
