import { createTileGrid } from "../lib/tile-grid.js";
import { pickN, randInt } from "../lib/random.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export const instructionsHtml = `
  <strong>Pattern Grid</strong> — A pattern flashes briefly. Toggle cells to match it, then press
  <strong>Check pattern</strong>.`;

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
    await sleep(previewMs);
    if (!alive) return;

    for (let i = 0; i < tiles.length; i++) {
      tiles[i].classList.remove("highlight");
    }

    phase.textContent = "Recreate the pattern.";

    /** @type {Set<number>} */
    const chosen = new Set();
    let failed = false;

    /**
     * @param {number | null} explicitWrong
     */
    function revealDiff(explicitWrong = null) {
      if (explicitWrong != null) {
        tiles[explicitWrong].classList.add("mark-wrong");
      }
      for (const i of chosen) {
        if (!target.has(i)) tiles[i].classList.add("mark-wrong");
      }
      for (const i of target) {
        if (!chosen.has(i)) tiles[i].classList.add("highlight");
      }
    }

    const actions = document.createElement("div");
    actions.className = "instructions-actions";
    actions.style.marginTop = "1rem";

    const check = document.createElement("button");
    check.type = "button";
    check.className = "btn-primary";
    check.textContent = "Check pattern";

    actions.appendChild(check);
    root.appendChild(actions);

    async function failRound(badIdx) {
      if (failed) return;
      failed = true;
      revealDiff(badIdx);
      check.disabled = true;
      for (const tile of tiles) tile.disabled = true;
      phase.textContent = "Review: red is wrong selection, glow is missed correct cell.";

      const progress = shell.recordRound(false, 0);
      shell.stopTimer();
      if (progress.done) {
        shell.showResult(
          "Session complete.",
          `Performance: ${progress.rating}/100. Wins: ${progress.wins}/${progress.totalRounds}. Total points: ${shell.getScore()}.`,
        );
        return;
      }

      await sleep(550);
      if (!alive) return;
      shell.showResult(
        "First mistake.",
        `Wrong cell. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      );
    }

    for (let i = 0; i < tiles.length; i++) {
      const idx = i;
      const btn = tiles[idx];
      btn.disabled = false;
      btn.classList.add("interactive");
      btn.addEventListener("click", () => {
        if (failed) return;
        if (chosen.has(idx)) {
          chosen.delete(idx);
          btn.classList.remove("selected");
        } else {
          if (!target.has(idx)) {
            void failRound(idx);
            return;
          }
          chosen.add(idx);
          btn.classList.add("selected");
        }
      });
    }

    check.addEventListener("click", async () => {
      if (failed) return;
      let match = chosen.size === target.size;
      if (match) {
        for (const i of target) {
          if (!chosen.has(i)) {
            match = false;
            break;
          }
        }
      } else {
        match = false;
      }

      if (!match) {
        failed = true;
        revealDiff();
        for (const t of tiles) t.disabled = true;
        check.disabled = true;
        phase.textContent = "Review: red is wrong selection, glow is missed correct cell.";
        await sleep(550);
        if (!alive) return;
      }

      const pts = match ? 80 + target.size * 8 + difficulty * 6 : 0;
      const progress = shell.recordRound(match, pts);

      shell.stopTimer();
      if (progress.done) {
        shell.showResult(
          "Session complete.",
          `Performance: ${progress.rating}/100. Wins: ${progress.wins}/${progress.totalRounds}. Total points: ${shell.getScore()}.`,
        );
        return;
      }

      shell.showResult(
        match ? "Pattern matched." : "Mismatch.",
        `${match
          ? `+${pts} points. ${target.size} cells.`
          : "Compare your selection with what you remembered."} Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      );
    });
  }

  return {
    restart: beginRound,
    reset,
    destroy: teardown,
  };
}
