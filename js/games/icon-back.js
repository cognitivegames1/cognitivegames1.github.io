import { randInt, shuffle } from "../lib/random.js";

const PROMPTS_PER_ROUND = 10;
const SUCCESS_THRESHOLD = 8;
const ANSWER_LOCK_MS = 220;
const PROMPT_SETTLE_MS = 120;

const ICONS = [
  "◆",
  "●",
  "▲",
  "■",
  "★",
  "☀",
  "☂",
  "☕",
  "♫",
  "☘",
  "⚙",
  "⚑",
  "✦",
  "✚",
  "✿",
  "☯",
];

export const instructionsHtml = `
  <strong>Icon Match (1-Back)</strong> — You get 10 comparisons. For each prompt, decide whether the
  current icon matches the immediately previous icon.`;

/**
 * @param {number} difficulty
 * @returns {string[]}
 */
function buildSequence(difficulty) {
  const poolSize = Math.min(ICONS.length, 4 + difficulty * 2);
  const pool = shuffle(ICONS).slice(0, poolSize);
  const matchBias = 0.28 + difficulty * 0.08;
  const sequence = [pool[randInt(0, pool.length - 1)]];

  for (let i = 1; i <= PROMPTS_PER_ROUND; i++) {
    const shouldMatch = Math.random() < matchBias;
    if (shouldMatch) {
      sequence.push(sequence[i - 1]);
      continue;
    }
    let next = sequence[i - 1];
    while (next === sequence[i - 1]) {
      next = pool[randInt(0, pool.length - 1)];
    }
    sequence.push(next);
  }

  return sequence;
}

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

  function beginRound() {
    alive = true;
    shell.hideResult();
    root.innerHTML = "";

    const difficulty = shell.getDifficulty();
    const sequence = buildSequence(difficulty);
    let prompt = 1;
    let correct = 0;
    let finished = false;
    let acceptingInput = true;

    const phase = document.createElement("p");
    phase.className = "phase-label";
    root.appendChild(phase);

    const board = document.createElement("div");
    board.style.display = "grid";
    board.style.gridTemplateColumns = "repeat(2, minmax(140px, 1fr))";
    board.style.gap = "0.75rem";
    board.style.maxWidth = "520px";
    board.style.margin = "0 auto";
    root.appendChild(board);

    const prevBox = document.createElement("div");
    prevBox.className = "instructions";
    prevBox.style.margin = "0";
    const prevLabel = document.createElement("p");
    prevLabel.className = "phase-label";
    prevLabel.style.margin = "0 0 0.5rem";
    prevLabel.textContent = "Previous";
    const prevIcon = document.createElement("p");
    prevIcon.className = "stroop-word";
    prevIcon.style.margin = "0";
    prevBox.append(prevLabel, prevIcon);

    const currBox = document.createElement("div");
    currBox.className = "instructions";
    currBox.style.margin = "0";
    const currLabel = document.createElement("p");
    currLabel.className = "phase-label";
    currLabel.style.margin = "0 0 0.5rem";
    currLabel.textContent = "Current";
    const currIcon = document.createElement("p");
    currIcon.className = "stroop-word";
    currIcon.style.margin = "0";
    currBox.append(currLabel, currIcon);

    board.append(prevBox, currBox);

    const actions = document.createElement("div");
    actions.className = "instructions-actions";
    actions.style.justifyContent = "center";
    actions.style.marginTop = "1rem";
    root.appendChild(actions);

    const btnMatch = document.createElement("button");
    btnMatch.type = "button";
    btnMatch.className = "btn-primary";
    btnMatch.textContent = "Match";

    const btnNoMatch = document.createElement("button");
    btnNoMatch.type = "button";
    btnNoMatch.className = "btn-ghost";
    btnNoMatch.textContent = "No match";

    actions.append(btnMatch, btnNoMatch);

    const renderPrompt = () => {
      if (!alive || finished) return;
      phase.textContent = `Prompt ${prompt}/${PROMPTS_PER_ROUND}`;
      prevIcon.textContent = sequence[prompt - 1];
      currIcon.textContent = sequence[prompt];
    };

    const finishRound = () => {
      if (!alive || finished) return;
      finished = true;

      btnMatch.disabled = true;
      btnNoMatch.disabled = true;

      const accuracy = Math.round((correct / PROMPTS_PER_ROUND) * 100);
      const success = correct >= SUCCESS_THRESHOLD;
      const points = success ? 55 + correct * 10 + difficulty * 9 : 0;
      const progress = shell.recordRound(success, points);
      shell.stopTimer();

      if (progress.done) {
        shell.showResult(
          "Session complete.",
          `Performance: ${progress.rating}/100. Wins: ${progress.wins}/${progress.totalRounds}. Total points: ${shell.getScore()}.`,
        );
        return;
      }

      shell.showResult(
        success ? "Pattern tracked." : "Pattern slipped.",
        `${success ? `+${points} points. ` : ""}Correct: ${correct}/${PROMPTS_PER_ROUND} (${accuracy}%). Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      );
    };

    /**
     * @param {boolean} saysMatch
     */
    const answer = async (saysMatch) => {
      if (!alive || finished || !acceptingInput) return;
      acceptingInput = false;
      const expectedMatch = sequence[prompt] === sequence[prompt - 1];
      if (saysMatch === expectedMatch) correct++;
      prompt += 1;
      if (prompt > PROMPTS_PER_ROUND) {
        finishRound();
        return;
      }

      await sleep(PROMPT_SETTLE_MS);
      if (!alive || finished) return;
      renderPrompt();
      await sleep(Math.max(0, ANSWER_LOCK_MS - PROMPT_SETTLE_MS));
      if (!alive || finished) return;
      acceptingInput = true;
    };

    btnMatch.addEventListener("click", () => {
      void answer(true);
    });
    btnNoMatch.addEventListener("click", () => {
      void answer(false);
    });

    renderPrompt();
  }

  return {
    restart: beginRound,
    reset,
    destroy: teardown,
  };
}
