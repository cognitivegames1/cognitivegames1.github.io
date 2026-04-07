import { randInt, shuffle } from "../lib/random.js";
import { disableControls } from "../lib/feedback.js";
import { delay } from "../lib/async.js";
import { createRoundRuntime } from "./shared/round-runtime.js";
import { showSessionComplete } from "./shared/results.js";

export const instructionsHtml = `
  <strong>Number Sweep</strong> — Numbers appear scattered on the field. Tap them in ascending order
  (1, then 2, then 3…) as fast as you can. One wrong tap ends the round immediately.`;

/**
 * @param {HTMLElement} root
 * @param {import('../play-shell.js').GameShell} shell
 */
export function mount(root, shell) {
  const runtime = createRoundRuntime(root, shell);
  const teardown = runtime.teardown;
  const reset = runtime.reset;

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
        ok = out.every(
          (p) => Math.abs(p.left - left) > minDx || Math.abs(p.top - top) > minDy,
        );
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

  async function beginRound() {
    const myRound = runtime.beginRound();

    const t0 = performance.now();
    const difficulty = shell.getDifficulty();
    const count = Math.min(16, 4 + difficulty * 2);
    const positions = placePositions(count);

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

    const finishRound = async () => {
      disableControls(buttons);
      const msRaw = performance.now() - t0;
      const ms = msRaw;
      const accuracy = 1;
      const success = true;
      const timeBonus = Math.min(180, Math.max(0, Math.round(320 - ms / 42)));
      const pts = success
        ? Math.round((60 + count * 8 + difficulty * 12 + timeBonus) * (0.55 + 0.45 * accuracy))
        : 0;
      const progress = shell.recordRound(success, pts, {
        qualityFraction: accuracy,
        metrics: {
          sweepMs: Math.round(ms),
          sweepRawMs: Math.round(msRaw),
          numberCount: count,
          sweepMistakes: mistakes,
        },
      });
      shell.stopTimer();
      if (progress.done) {
        showSessionComplete(shell, progress);
        return;
      }
      shell.showResult(
        "Full sweep.",
        `+${pts} points. Mistakes: ${mistakes}, time ${Math.round(ms)} ms. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      );
    };

    const failRound = async () => {
      disableControls(buttons);
      const ms = performance.now() - t0;
      const progressFraction = count > 0 ? (next - 1) / count : 0;
      const progress = shell.recordRound(false, 0, {
        qualityFraction: progressFraction,
        metrics: {
          sweepMs: Math.round(ms),
          sweepRawMs: Math.round(ms),
          numberCount: count,
          sweepMistakes: mistakes,
        },
      });
      shell.stopTimer();
      if (progress.done) {
        showSessionComplete(shell, progress);
        return;
      }
      shell.showResult(
        "Sweep broken.",
        `Wrong tap on ${next}. Reached ${next - 1}/${count}. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      );
    };

    for (const btn of buttons) {
      btn.addEventListener("click", async () => {
        if (!runtime.isActive(myRound) || resolving || btn.disabled) return;
        const v = parseInt(btn.dataset.value ?? "0", 10);
        if (v !== next) {
          resolving = true;
          mistakes += 1;
          btn.classList.add("mark-wrong");
          const expected = buttons.find(
            (x) => parseInt(x.dataset.value ?? "0", 10) === next,
          );
          expected?.classList.add("mark-correct");
          phase.textContent = `Wrong tap. You needed ${next}.`;
          await delay(280);
          if (!runtime.isActive(myRound)) return;
          await failRound();
          return;
        }
        btn.disabled = true;
        btn.classList.add("number-sweep-done");
        phase.textContent = `Great. Next: ${next + 1 <= count ? next + 1 : "done"}.`;
        next++;
        if (next > count) {
          await finishRound();
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
