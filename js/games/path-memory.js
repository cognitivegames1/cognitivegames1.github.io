import { createTileGrid } from "../lib/tile-grid.js";
import { pick, randInt } from "../lib/random.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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
      (x) => path.length < 2 || x !== path[path.length - 2],
    );
    if (opts.length === 0) return null;
    cur = pick(opts);
    path.push(cur);
  }
  return path;
}

export const instructionsHtml = `
  <strong>Path Memory</strong> — A path lights up along adjacent cells. Watch, then tap the same route in order.`;

/**
 * @param {HTMLElement} root
 * @param {import('../play-shell.js').GameShell} shell
 */
export function mount(root, shell) {
  let alive = true;

  function teardown() {
    alive = false;
    root.innerHTML = "";
  }

  function reset() {
    teardown();
    shell.stopTimer();
    shell.resetTimerDisplay();
  }

  async function beginRound() {
    alive = true;
    shell.hideResult();
    root.innerHTML = "";

    const difficulty = shell.getDifficulty();
    const size = difficulty <= 2 ? 4 : difficulty <= 4 ? 5 : 6;
    const pathLen = Math.min(size * size - 2, 3 + difficulty * 2);

    let path = null;
    for (let t = 0; t < 40 && !path; t++) {
      path = randomPath(size, pathLen);
    }
    if (!path) path = [0, 1, 2];

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
      if (!alive) return;
      tiles[idx].classList.add("highlight", "flash");
      await sleep(onMs);
      tiles[idx].classList.remove("highlight", "flash");
      await sleep(offMs);
    }

    if (!alive) return;

    phase.textContent = "Retrace the path on the grid.";

    for (const t of tiles) {
      t.disabled = false;
      t.classList.add("interactive");
    }

    let step = 0;
    let done = false;

    const onClick = async (i) => {
      if (done) return;
      const expected = path[step];
      const pressed = tiles[i];
      pressed.classList.add("flash");
      window.setTimeout(() => pressed.classList.remove("flash"), 160);

      if (i !== expected) {
        done = true;
        pressed.classList.add("mark-wrong");
        tiles[expected].classList.add("highlight");
        for (const t of tiles) t.disabled = true;
        await sleep(280);
        const progress = shell.recordRound(false, 0);
        shell.stopTimer();
        if (progress.done) {
          shell.showResult(
            "Session complete.",
            `Performance: ${progress.rating}/100. Wins: ${progress.wins}/${progress.totalRounds}. Total points: ${shell.getScore()}.`,
          );
          return;
        }
        shell.showResult(
          "Path broken.",
          `Next cell was position ${expected + 1}. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
        );
        return;
      }

      pressed.classList.add("selected");
      step++;
      if (step >= path.length) {
        done = true;
        for (const t of tiles) t.disabled = true;
        const pts = 75 + pathLen * 10 + difficulty * 8;
        const progress = shell.recordRound(true, pts);
        shell.stopTimer();
        if (progress.done) {
          shell.showResult(
            "Session complete.",
            `Performance: ${progress.rating}/100. Wins: ${progress.wins}/${progress.totalRounds}. Total points: ${shell.getScore()}.`,
          );
          return;
        }
        shell.showResult(
          "Path locked in.",
          `+${pts} points. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
        );
      }
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
