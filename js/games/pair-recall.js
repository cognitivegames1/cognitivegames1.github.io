import { pickN, shuffle } from "../lib/random.js";
import { PAIR_MISMATCH_MS } from "../lib/feedback.js";
import { delay } from "../lib/async.js";
import { mountGame } from "./shared/game-session.js";

const SYMBOLS = ["🍎", "🍌", "🍒", "🍇", "⭐", "🌙", "☀️", "⚡", "🎵", "🎯", "🎲", "🔷"];

export const instructionsHtml = `
  <strong>Pair Recall</strong> — Flip two cards at a time and match pairs from memory.
  Mismatches briefly reveal both cards, then they close again. Clear the board and finish in as few tries as possible.`;

/** @type {import('./shared/task.js').TaskMeta} */
export const taskMeta = { domains: ["memory"] };

/**
 * @param {HTMLElement} root
 * @param {import('./shared/task.js').TaskEnv} env
 * @returns {Promise<import('./shared/task.js').TaskResult | null>}
 */
export function runTask(root, env) {
  const { difficulty, isActive } = env;
  const pairCount = Math.min(10, 4 + difficulty);
  const syms = pickN(SYMBOLS, pairCount);
  const deck = shuffle([...syms, ...syms]);
  const cols = 4;

  return new Promise((resolve) => {
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

    const finishWin = () => {
      const efficiency = attempts > 0 ? pairCount / attempts : 1;
      const quality = Math.max(0, Math.min(1, efficiency));
      const successThreshold = difficulty >= 5 ? 0.70 : difficulty >= 4 ? 0.65 : difficulty >= 3 ? 0.62 : difficulty >= 2 ? 0.60 : 0.55;
      const success = quality >= successThreshold;
      const pts = success
        ? Math.round((80 + pairCount * 12 + difficulty * 10) * (0.65 + 0.35 * quality))
        : 0;
      resolve({
        success,
        quality,
        points: pts,
        metrics: { pairAttempts: attempts, pairMisses: misses, pairCount, pairMatched: matched },
        summary: `Cleared in ${attempts} tries (${Math.round(quality * 100)}% efficient).`,
      });
    };

    const finishFail = () => {
      const completion = pairCount > 0 ? matched / pairCount : 0;
      const efficiency = attempts > 0 ? matched / attempts : 0;
      const quality = Math.max(0, Math.min(1, 0.7 * completion + 0.3 * efficiency));
      resolve({
        success: false,
        quality,
        points: 0,
        metrics: { pairAttempts: attempts, pairMisses: misses, pairCount, pairMatched: matched },
        summary: `Budget exhausted at ${matched}/${pairCount}.`,
      });
    };

    const revealFaceUp = (idx, extras = []) => {
      const c = cards[idx];
      c.el.textContent = c.sym;
      c.el.classList.add("memory-up", ...extras);
    };
    const hideFaceDown = (idx) => {
      const c = cards[idx];
      if (c.off) return;
      c.el.textContent = "?";
      c.el.classList.remove("memory-up", "mark-wrong", "reveal-correct");
    };

    cards.forEach((card, i) => {
      card.el.addEventListener("click", async () => {
        if (!isActive() || card.off || lock) return;
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
          if (matched >= pairCount) finishWin();
          else if (attempts >= maxAttempts) {
            for (const c of cards) c.el.disabled = true;
            finishFail();
          }
          return;
        }

        misses++;
        left.el.classList.add("mark-wrong");
        right.el.classList.add("mark-wrong");
        phase.textContent = `Miss ${misses}. Tries: ${attempts}.`;
        await delay(PAIR_MISMATCH_MS);
        if (!isActive()) return resolve(null);

        left.el.classList.remove("mark-wrong");
        right.el.classList.remove("mark-wrong");
        hideFaceDown(leftIdx);
        hideFaceDown(rightIdx);
        open = [];
        lock = false;
        if (attempts >= maxAttempts && matched < pairCount) {
          for (const c of cards) c.el.disabled = true;
          finishFail();
          return;
        }
        phase.textContent = `Pairs ${matched}/${pairCount}. Tries: ${attempts}.`;
      });
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
      const quality = Math.round(result.quality * 100);
      if (result.success) {
        return {
          title: "All pairs found.",
          detail: `+${result.points} points. Tries: ${m.pairAttempts}, misses: ${m.pairMisses}, efficiency ${quality}%. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
        };
      }
      if (m.pairMatched >= m.pairCount) {
        return {
          title: "Board cleared, but memory was too noisy.",
          detail: `Tries: ${m.pairAttempts}, misses: ${m.pairMisses}, efficiency ${quality}%. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
        };
      }
      return {
        title: "Memory budget exhausted.",
        detail: `Matched ${m.pairMatched}/${m.pairCount}. Tries: ${m.pairAttempts}. Misses: ${m.pairMisses}. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      };
    },
  });
}
