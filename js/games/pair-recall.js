import { pickN, shuffle } from "../lib/random.js";
import { delay } from "../lib/async.js";
import { createRoundRuntime } from "./shared/round-runtime.js";
import { showSessionComplete } from "./shared/results.js";

const SYMBOLS = ["🍎", "🍌", "🍒", "🍇", "⭐", "🌙", "☀️", "⚡", "🎵", "🎯", "🎲", "🔷"];

export const instructionsHtml = `
  <strong>Pair Recall</strong> — Flip two cards at a time and match pairs from memory.
  Mismatches briefly reveal both cards, then they close again. Clear the board and finish in as few tries as possible.`;

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
    const pairCount = Math.min(8, 4 + Math.min(difficulty, 4));
    const syms = pickN(SYMBOLS, pairCount);
    const deck = shuffle([...syms, ...syms]);

    const cols = 4;
    const phase = document.createElement("p");
    phase.className = "phase-label";
    phase.textContent = "Match every pair. Finish in as few tries as possible.";
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

    /** @type {number[]} */
    let open = [];
    let matched = 0;
    let attempts = 0;
    let misses = 0;
    let lock = false;
    const maxAttempts = Math.max(pairCount + 2, Math.round(pairCount * 1.75));

    const endWin = () => {
      if (!runtime.isActive(myRound)) return;
      const efficiency = attempts > 0 ? pairCount / attempts : 1;
      const quality = Math.max(0, Math.min(1, efficiency));
      const successThreshold = difficulty >= 4 ? 0.72 : difficulty >= 2 ? 0.64 : 0.58;
      const success = quality >= successThreshold;
      const pts = success
        ? Math.round((80 + pairCount * 12 + difficulty * 10) * (0.65 + 0.35 * quality))
        : 0;
      const progress = shell.recordRound(success, pts, {
        qualityFraction: quality,
        metrics: { pairAttempts: attempts, pairMisses: misses, pairCount, pairMatched: matched },
      });
      shell.stopTimer();
      if (progress.done) {
        showSessionComplete(shell, progress);
        return;
      }
      shell.showResult(
        success ? "All pairs found." : "Board cleared, but memory was too noisy.",
        `${success ? `+${pts} points. ` : ""}Tries: ${attempts}, misses: ${misses}, efficiency ${Math.round(quality * 100)}%. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      );
    };

    const endFail = () => {
      if (!runtime.isActive(myRound)) return;
      const completion = pairCount > 0 ? matched / pairCount : 0;
      const efficiency = attempts > 0 ? matched / attempts : 0;
      const quality = Math.max(0, Math.min(1, 0.7 * completion + 0.3 * efficiency));
      const progress = shell.recordRound(false, 0, {
        qualityFraction: quality,
        metrics: { pairAttempts: attempts, pairMisses: misses, pairCount, pairMatched: matched },
      });
      shell.stopTimer();
      if (progress.done) {
        showSessionComplete(shell, progress);
        return;
      }
      shell.showResult(
        "Memory budget exhausted.",
        `Matched ${matched}/${pairCount}. Tries: ${attempts}/${maxAttempts}. Misses: ${misses}. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      );
    };

    /**
     * @param {number} idx
     * @param {string[]} extraClasses
     */
    const revealFaceUp = (idx, extraClasses = []) => {
      if (idx < 0 || idx >= cards.length) return;
      const c = cards[idx];
      c.el.textContent = c.sym;
      c.el.classList.add("memory-up", ...extraClasses);
    };

    /**
     * @param {number} idx
     */
    const hideFaceDown = (idx) => {
      if (idx < 0 || idx >= cards.length) return;
      const c = cards[idx];
      if (c.off) return;
      c.el.textContent = "?";
      c.el.classList.remove("memory-up", "mark-wrong", "reveal-correct");
    };

    cards.forEach((card, i) => {
      card.el.addEventListener("click", async () => {
        if (!runtime.isActive(myRound) || card.off || lock) return;
        if (open.includes(i)) return;

        revealFaceUp(i);
        open.push(i);

        if (open.length < 2) return;

        lock = true;
        attempts += 1;
        const [leftIdx, rightIdx] = open;
        const left = cards[leftIdx];
        const right = cards[rightIdx];

        if (left.sym === right.sym) {
          left.off = true;
          right.off = true;
          left.el.classList.add("memory-matched");
          right.el.classList.add("memory-matched");
          matched++;
          open = [];
          phase.textContent = `Pairs ${matched}/${pairCount}. Tries: ${attempts}.`;
          lock = false;
          if (matched >= pairCount) endWin();
          return;
        }

        misses++;
        left.el.classList.add("mark-wrong");
        right.el.classList.add("mark-wrong");
        phase.textContent = `Miss ${misses}. Tries: ${attempts}.`;
        await delay(520);
        if (!runtime.isActive(myRound)) return;

        left.el.classList.remove("mark-wrong");
        right.el.classList.remove("mark-wrong");
        hideFaceDown(leftIdx);
        hideFaceDown(rightIdx);
        open = [];
        lock = false;
        if (attempts >= maxAttempts && matched < pairCount) {
          for (const c of cards) c.el.disabled = true;
          endFail();
          return;
        }
        phase.textContent = `Pairs ${matched}/${pairCount}. Tries: ${attempts}.`;
      });
    });
  }

  return {
    restart: beginRound,
    reset,
    destroy: teardown,
  };
}
