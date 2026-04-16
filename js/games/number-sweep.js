import { randInt, shuffle } from "../lib/random.js";
import { MISTAKE_FLASH_MS, disableControls } from "../lib/feedback.js";
import { delay } from "../lib/async.js";
import { mountGame } from "./shared/game-session.js";

export const instructionsHtml = `
  <strong>Number Sweep</strong> — Numbers appear scattered on the field. Tap them in ascending order
  (1, then 2, then 3…) as fast as you can. One wrong tap ends the round immediately.`;

/** @type {import('./shared/task.js').TaskMeta} */
export const taskMeta = { domains: ["attention", "speed"] };

function placePositions(count) {
  const compact = window.matchMedia("(max-width: 767px)").matches;
  const leftMin = compact ? 8 : 6;
  const leftMax = compact ? 80 : 78;
  const topMin = compact ? 10 : 8;
  const topMax = compact ? 70 : 72;
  const minDxBase = compact ? 18 : 16;
  const minDyBase = compact ? 14 : 12;
  const densityRelax = count >= 14 ? 4 : count >= 10 ? 2 : 0;
  const minDx = Math.max(10, minDxBase - densityRelax);
  const minDy = Math.max(8, minDyBase - Math.floor(densityRelax / 2));

  /** @type {{ left: number, top: number }[]} */
  const out = [];
  const tries = 120;
  for (let i = 0; i < count; i++) {
    let ok = false;
    for (let t = 0; t < tries && !ok; t++) {
      const left = randInt(leftMin, leftMax);
      const top = randInt(topMin, topMax);
      ok = out.every((p) => Math.abs(p.left - left) > minDx || Math.abs(p.top - top) > minDy);
      if (ok) out.push({ left, top });
    }
    if (!ok) {
      const cols = compact ? (count > 10 ? 4 : 3) : 4;
      const rows = Math.ceil(count / cols);
      const leftStart = 10;
      const topStart = 14;
      const xStep = cols > 1 ? 70 / (cols - 1) : 0;
      const yStep = rows > 1 ? 54 / (rows - 1) : 0;
      out.push({
        left: leftStart + (i % cols) * xStep,
        top: topStart + Math.floor(i / cols) * yStep,
      });
    }
  }
  return out;
}

/**
 * @param {HTMLElement} root
 * @param {import('./shared/task.js').TaskEnv} env
 * @returns {Promise<import('./shared/task.js').TaskResult | null>}
 */
export function runTask(root, env) {
  const { difficulty, isActive } = env;
  const countByLevel = [0, 6, 9, 12, 14, 16];
  const count = Math.min(16, countByLevel[difficulty] ?? 16);
  const hardCapMs = difficulty >= 4 ? 30000 : 0;
  const positions = placePositions(count);

  return new Promise((resolve) => {
    const t0 = performance.now();

    const phase = document.createElement("p");
    phase.className = "phase-label";
    phase.textContent = "Tap numbers in ascending order.";
    root.appendChild(phase);

    const wrap = document.createElement("div");
    wrap.className = "number-sweep-field";
    root.appendChild(wrap);

    const nums = shuffle([...Array(count)].map((_, i) => i + 1));
    /** @type {HTMLButtonElement[]} */
    const buttons = [];

    for (let i = 0; i < count; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "number-sweep-btn";
      btn.textContent = String(nums[i]);
      btn.style.left = `${positions[i].left}%`;
      btn.style.top = `${positions[i].top}%`;
      btn.dataset.value = String(nums[i]);
      btn.setAttribute("aria-label", `Number ${nums[i]}`);
      wrap.appendChild(btn);
      buttons.push(btn);
    }

    let next = 1;
    let resolving = false;
    let mistakes = 0;
    let timedOut = false;
    let capTimer = 0;
    let ended = false;

    const finishWin = () => {
      if (ended) return;
      ended = true;
      if (capTimer) window.clearTimeout(capTimer);
      disableControls(buttons);
      const ms = performance.now() - t0;
      const timeBonus = Math.min(180, Math.max(0, Math.round(320 - ms / 42)));
      const pts = Math.round(60 + count * 8 + difficulty * 12 + timeBonus);
      resolve({
        success: true,
        quality: 1,
        points: pts,
        metrics: { sweepMs: Math.round(ms), numberCount: count, sweepMistakes: mistakes },
        summary: `Swept ${count} in ${Math.round(ms)} ms.`,
      });
    };

    const finishFail = () => {
      if (ended) return;
      ended = true;
      if (capTimer) window.clearTimeout(capTimer);
      disableControls(buttons);
      const ms = performance.now() - t0;
      const progressFraction = count > 0 ? (next - 1) / count : 0;
      resolve({
        success: false,
        quality: progressFraction,
        points: 0,
        metrics: {
          sweepMs: Math.round(ms),
          numberCount: count,
          sweepMistakes: mistakes,
          sweepTimedOut: timedOut,
        },
        summary: timedOut
          ? `Time's up at ${next - 1}/${count}.`
          : `Wrong tap at ${next - 1}/${count}.`,
      });
    };

    if (hardCapMs > 0) {
      capTimer = window.setTimeout(() => {
        if (!isActive() || next > count) return;
        timedOut = true;
        finishFail();
      }, hardCapMs);
    }

    for (const btn of buttons) {
      btn.addEventListener("click", async () => {
        if (!isActive() || resolving || btn.disabled) return;
        const v = parseInt(btn.dataset.value ?? "0", 10);
        if (v !== next) {
          resolving = true;
          mistakes += 1;
          btn.classList.add("mark-wrong");
          const expected = buttons.find((x) => parseInt(x.dataset.value ?? "0", 10) === next);
          expected?.classList.add("mark-correct");
          phase.textContent = `Wrong tap. You needed ${next}.`;
          await delay(MISTAKE_FLASH_MS);
          if (!isActive()) return resolve(null);
          finishFail();
          return;
        }
        btn.disabled = true;
        btn.classList.add("number-sweep-done");
        phase.textContent = `Great. Next: ${next + 1 <= count ? next + 1 : "done"}.`;
        next++;
        if (next > count) finishWin();
      });
    }
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
      if (result.success) {
        return {
          title: "Full sweep.",
          detail: `+${result.points} points. Mistakes: ${m.sweepMistakes}, time ${m.sweepMs} ms. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
        };
      }
      return {
        title: m.sweepTimedOut ? "Out of time." : "Sweep broken.",
        detail: `${result.summary} Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      };
    },
  });
}
