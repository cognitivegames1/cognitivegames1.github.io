import { pickN, shuffle } from "../lib/random.js";

const SYMBOLS = ["🍎", "🍌", "🍒", "🍇", "⭐", "🌙", "☀️", "⚡", "🎵", "🎯", "🎲", "🔷"];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export const instructionsHtml = `
  <strong>Pair Recall</strong> — Flip two cards at a time. Find every matching pair. One mismatch ends
  the round; clearing the board wins.`;

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
    const pairCount = Math.min(8, 4 + Math.min(difficulty, 4));
    const syms = pickN(SYMBOLS, pairCount);
    const deck = shuffle([...syms, ...syms]);

    const cols = 4;
    const phase = document.createElement("p");
    phase.className = "phase-label";
    phase.textContent = "Match every pair.";
    root.appendChild(phase);

    const grid = document.createElement("div");
    grid.className = "memory-grid";
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    root.appendChild(grid);

    /** @type {{ el: HTMLButtonElement, sym: string, off: boolean }[]} */
    const cards = deck.map((sym) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "memory-card";
      btn.textContent = "?";
      btn.setAttribute("aria-label", "Hidden card");
      grid.appendChild(btn);
      return { el: btn, sym, off: false };
    });

    /** @type {number | null} */
    let firstIdx = null;
    let lock = false;
    let matched = 0;
    let inputLocked = false;

    /**
     * @param {number} idx
     */
    const pairIndexOf = (idx) => cards.findIndex(
      (c, i) => i !== idx && c.sym === cards[idx].sym,
    );

    const endWin = () => {
      const pts = 90 + pairCount * 14 + difficulty * 10;
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
        "All pairs found.",
        `+${pts} points. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      );
    };

    const endFail = () => {
      inputLocked = true;
      cards.forEach((c) => {
        c.el.disabled = true;
      });
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
        "Mismatch.",
        `Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      );
    };

    cards.forEach((card, i) => {
      card.el.addEventListener("click", async () => {
        if (!alive || lock || card.off || inputLocked) return;
        const faceUp = card.el.classList.contains("memory-up");
        if (faceUp) return;

        card.el.textContent = card.sym;
        card.el.classList.add("memory-up");

        if (firstIdx === null) {
          firstIdx = i;
          return;
        }

        const j = firstIdx;
        firstIdx = null;
        if (j === i) return;

        lock = true;

        if (cards[j].sym === card.sym) {
          cards[j].off = true;
          card.off = true;
          cards[j].el.classList.add("memory-matched");
          card.el.classList.add("memory-matched");
          matched++;
          lock = false;
          if (matched >= pairCount) endWin();
          return;
        }

        cards[j].el.classList.add("mark-wrong");
        card.el.classList.add("mark-wrong");
        const pairOfFirst = pairIndexOf(j);
        const pairOfSecond = pairIndexOf(i);
        const reveals = [pairOfFirst, pairOfSecond];

        for (const r of reveals) {
          if (r < 0 || r === i || r === j) continue;
          const rc = cards[r];
          if (rc.off) continue;
          rc.el.textContent = rc.sym;
          rc.el.classList.add("memory-up", "reveal-correct");
        }

        await sleep(900);
        if (!alive) return;
        endFail();
      });
    });
  }

  return {
    restart: beginRound,
    reset,
    destroy: teardown,
  };
}
