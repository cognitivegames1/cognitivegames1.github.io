import { randInt } from "../lib/random.js";

export const instructionsHtml = `
  <strong>Reaction Gate</strong> — Wait until the button turns green, then tap as fast as you can.
  Tapping <em>before</em> green ends the round.`;

/**
 * @param {HTMLElement} root
 * @param {import('../play-shell.js').GameShell} shell
 */
export function mount(root, shell) {
  let alive = true;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timerId = null;

  function teardown() {
    alive = false;
    if (timerId != null) clearTimeout(timerId);
    timerId = null;
    root.innerHTML = "";
  }

  function reset() {
    teardown();
    shell.stopTimer();
    shell.resetTimerDisplay();
  }

  function beginRound() {
    alive = true;
    shell.hideResult();
    root.innerHTML = "";

    const difficulty = shell.getDifficulty();
    const waitMs = randInt(
      700 + (6 - difficulty) * 280,
      1600 + (6 - difficulty) * 420,
    );

    const hint = document.createElement("p");
    hint.className = "phase-label";
    hint.textContent = "Do not tap until the button turns green.";
    root.appendChild(hint);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reaction-btn reaction-wait";
    btn.textContent = "Wait…";
    btn.disabled = false;
    root.appendChild(btn);

    let armed = false;
    /** @type {number | null} */
    let tGo = null;

    const failEarly = () => {
      if (!alive || armed) return;
      if (timerId != null) clearTimeout(timerId);
      timerId = null;
      btn.disabled = true;
      btn.className = "reaction-btn reaction-early";
      btn.textContent = "Too early";
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
        "False start.",
        `Wait for green. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      );
    };

    btn.addEventListener("click", () => {
      if (!alive) return;
      if (!armed) {
        failEarly();
        return;
      }
      if (tGo == null) return;
      const ms = performance.now() - tGo;
      btn.disabled = true;
      const capped = Math.min(ms, 1200);
      const pts = Math.max(0, Math.round(220 - capped * 0.35 + difficulty * 12));
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
        "Reaction logged.",
        `+${pts} points (${Math.round(ms)} ms). Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      );
    });

    timerId = setTimeout(() => {
      if (!alive) return;
      armed = true;
      btn.className = "reaction-btn reaction-go";
      btn.textContent = "Tap!";
      tGo = performance.now();
      hint.textContent = "Go!";
    }, waitMs);
  }

  return {
    restart: beginRound,
    reset,
    destroy: teardown,
  };
}
