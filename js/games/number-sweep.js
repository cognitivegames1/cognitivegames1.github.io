import { randInt, shuffle } from "../lib/random.js";
import { disableControls, revealPause } from "../lib/feedback.js";

export const instructionsHtml = `
  <strong>Number Sweep</strong> — Numbers appear scattered on the field. Tap them in ascending order
  (1, then 2, then 3…) as fast as you can. One wrong tap ends the round.`;

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

  function placePositions(count) {
    /** @type {{ left: number, top: number }[]} */
    const out = [];
    const tries = 80;
    for (let i = 0; i < count; i++) {
      let ok = false;
      for (let t = 0; t < tries && !ok; t++) {
        const left = randInt(6, 78);
        const top = randInt(8, 72);
        ok = out.every(
          (p) => Math.abs(p.left - left) > 16 || Math.abs(p.top - top) > 12,
        );
        if (ok) out.push({ left, top });
      }
      if (!ok) out.push({ left: 10 + (i % 4) * 20, top: 15 + Math.floor(i / 4) * 18 });
    }
    return out;
  }

  async function beginRound() {
    alive = true;
    shell.hideResult();
    root.innerHTML = "";

    const difficulty = shell.getDifficulty();
    const count = Math.min(16, 4 + difficulty * 2);
    const positions = placePositions(count);

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
      wrap.appendChild(btn);
      buttons.push(btn);
    }

    let next = 1;

    const fail = async (detail) => {
      await revealPause(buttons);
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
        "Wrong order.",
        `${detail} Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      );
    };

    const succeed = async () => {
      disableControls(buttons);
      const pts = 60 + count * 8 + difficulty * 12;
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
        "Full sweep.",
        `+${pts} points. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      );
    };

    for (const btn of buttons) {
      btn.addEventListener("click", async () => {
        if (!alive || btn.disabled) return;
        const v = parseInt(btn.dataset.value ?? "0", 10);
        if (v !== next) {
          btn.classList.add("mark-wrong");
          const expected = buttons.find(
            (x) => parseInt(x.dataset.value ?? "0", 10) === next,
          );
          expected?.classList.add("mark-correct");
          await fail(`You needed ${next} next.`);
          return;
        }
        btn.disabled = true;
        btn.classList.add("number-sweep-done");
        next++;
        if (next > count) await succeed();
      });
    }
  }

  return {
    restart: beginRound,
    reset,
    destroy: teardown,
  };
}
