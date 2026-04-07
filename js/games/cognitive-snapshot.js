import { createTileGrid } from "../lib/tile-grid.js";
import { createChessBoard } from "../lib/chess-board.js";
import { buildBoardChange } from "../lib/chess-change.js";
import { randomPlacements } from "../lib/chess-position.js";
import { clamp } from "../lib/math.js";
import { delay } from "../lib/async.js";
import { pickN, shuffle } from "../lib/random.js";
import { createRoundRuntime } from "./shared/round-runtime.js";

const SNAPSHOT_SUBTESTS = [
  {
    id: "pattern",
    label: "Pattern Grid",
    weight: 0.26,
    profiles: [
      { size: 3, targetCount: 3, previewMs: 1650 },
      { size: 3, targetCount: 4, previewMs: 1500 },
      { size: 4, targetCount: 5, previewMs: 1750 },
      { size: 4, targetCount: 6, previewMs: 1580 },
      { size: 5, targetCount: 7, previewMs: 1450 },
    ],
  },
  {
    id: "chess",
    label: "Chess Glance",
    weight: 0.24,
    profiles: [
      { minPieces: 5, maxPieces: 7, previewMs: 2850, clearMs: 2100, singleSquareOnly: true },
      { minPieces: 6, maxPieces: 8, previewMs: 2550, clearMs: 2200, singleSquareOnly: true },
      { minPieces: 8, maxPieces: 10, previewMs: 2300, clearMs: 2200, singleSquareOnly: true },
      { minPieces: 10, maxPieces: 12, previewMs: 2100, clearMs: 2300, singleSquareOnly: true },
      { minPieces: 12, maxPieces: 14, previewMs: 1900, clearMs: 2300, singleSquareOnly: true },
    ],
  },
  {
    id: "pairs",
    label: "Pair Recall",
    weight: 0.24,
    profiles: [
      { pairCount: 3 },
      { pairCount: 4 },
      { pairCount: 5 },
      { pairCount: 6 },
      { pairCount: 7 },
    ],
  },
  {
    id: "sweep",
    label: "Number Sweep",
    weight: 0.26,
    profiles: [
      { count: 6, columns: 3 },
      { count: 8, columns: 4 },
      { count: 10, columns: 5 },
      { count: 12, columns: 4 },
      { count: 14, columns: 4 },
    ],
  },
];

const PAIR_SYMBOLS = ["🍎", "🍌", "🍒", "🍇", "⭐", "🌙", "⚡", "🎵", "🎯", "🎲"];

function setInteractiveTiles(tiles, interactive) {
  for (const tile of tiles) {
    tile.disabled = !interactive;
    tile.classList.toggle("interactive", interactive);
  }
}

function summarizeStageScores(scores) {
  const average = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  return clamp(average, 0, 100);
}

function nextProfileIndex(currentIndex, score, maxIndex) {
  if (score >= 82) return clamp(currentIndex + 1, 0, maxIndex);
  if (score < 50) return clamp(currentIndex - 1, 0, maxIndex);
  return currentIndex;
}

function bandForComposite(composite) {
  if (composite >= 85) return { label: "Exceptional" };
  if (composite >= 72) return { label: "Strong" };
  if (composite >= 58) return { label: "Solid" };
  if (composite >= 45) return { label: "Developing" };
  if (composite >= 32) return { label: "Uneven" };
  return { label: "Early-stage" };
}

function stabilityForResults(results) {
  const taskScores = results.map((item) => item.score);
  const taskSpread = Math.max(...taskScores) - Math.min(...taskScores);
  const stageSpreadAvg = results
    .map((item) => Math.max(...item.stageScores) - Math.min(...item.stageScores))
    .reduce((sum, value) => sum + value, 0) / results.length;
  const combinedSpread = Math.round((taskSpread + stageSpreadAvg) / 2);
  if (combinedSpread <= 12) {
    return { label: "High", detail: "results stayed consistent across tasks and levels" };
  }
  if (combinedSpread <= 24) {
    return { label: "Moderate", detail: "some tasks separated, but the overall profile held together" };
  }
  return { label: "Developing", detail: "performance varied a lot across tasks or levels" };
}

/**
 * @param {HTMLElement} root
 * @param {import('../play-shell.js').GameShell} shell
 */
export function mount(root, shell) {
  const runtime = createRoundRuntime(root, shell);
  const teardown = runtime.teardown;
  const reset = runtime.reset;

  function renderReport(subscores, composite, band, stability) {
    root.innerHTML = "";

    const wrap = document.createElement("section");
    wrap.className = "instructions";

    const heading = document.createElement("h2");
    heading.className = "snapshot-heading";
    heading.textContent = "Snapshot Report";

    const summary = document.createElement("p");
    summary.className = "snapshot-summary";
    summary.textContent =
      `Composite score ${composite}/100. Band: ${band.label}. ` +
      `Stability: ${stability.label}.`;

    const grid = document.createElement("div");
    grid.className = "snapshot-grid";

    for (const item of subscores) {
      const card = document.createElement("article");
      card.className = "snapshot-card";

      const label = document.createElement("h3");
      label.textContent = item.label;

      const score = document.createElement("p");
      score.className = "snapshot-score";
      score.textContent = `${item.score}/100`;

      const detail = document.createElement("p");
      detail.className = "snapshot-detail";
      detail.textContent = item.detail;

      card.append(label, score, detail);
      grid.appendChild(card);
    }

    const note = document.createElement("p");
    note.className = "snapshot-note";
    note.textContent =
      `Stability note: ${stability.detail}. This profile is a heuristic summary from game performance on this device only. ` +
      "It is educational only, not clinical or normed.";

    wrap.append(heading, summary, grid, note);
    root.appendChild(wrap);
  }

  async function runPattern(rootEl, token, test) {
    const stageScores = [];
    const stageBits = [];
    let profileIndex = 1;

    for (let stageIndex = 0; stageIndex < 3; stageIndex++) {
      const stage = test.profiles[profileIndex];
      rootEl.innerHTML = "";
      const title = document.createElement("p");
      title.className = "phase-label";
      title.textContent = `1/4 Pattern Grid — level ${stageIndex + 1}/3. Memorize the highlighted cells.`;
      rootEl.appendChild(title);

      const board = document.createElement("div");
      rootEl.appendChild(board);
      const size = stage.size;
      const { tiles } = createTileGrid(board, size, { interactive: false });
      const target = new Set(pickN([...Array(size * size)].map((_, i) => i), stage.targetCount));
      for (const idx of target) tiles[idx].classList.add("highlight");
      await delay(stage.previewMs);
      if (!runtime.isActive(token)) return null;
      for (const tile of tiles) tile.classList.remove("highlight");
      setInteractiveTiles(tiles, true);

      const stageResult = await new Promise((resolve) => {
        let found = 0;
        let mistakes = 0;
        for (let i = 0; i < tiles.length; i++) {
          tiles[i].addEventListener("click", () => {
            if (!runtime.isActive(token) || tiles[i].disabled) return;
            if (target.has(i)) {
              tiles[i].disabled = true;
              tiles[i].classList.add("selected");
              found += 1;
              if (found === target.size) {
                const score = Math.round(100 * (1 - mistakes / (target.size + 1)));
                resolve({ score: clamp(score, 0, 100), detail: `L${stageIndex + 1}: ${found}/${target.size}, ${mistakes} mistakes` });
              }
              return;
            }

            mistakes += 1;
            tiles[i].classList.add("mark-wrong");
            setTimeout(() => tiles[i].classList.remove("mark-wrong"), 220);
            if (mistakes >= 2) {
              for (const idx of target) tiles[idx].classList.add("mark-correct");
              const score = Math.round((found / target.size) * 100);
              resolve({ score: clamp(score, 0, 100), detail: `L${stageIndex + 1}: ${found}/${target.size}, ${mistakes} mistakes` });
            }
          }, { once: false });
        }
      });
      if (!runtime.isActive(token)) return null;
      stageScores.push(stageResult.score);
      stageBits.push(`${stageResult.detail} [P${profileIndex + 1}]`);
      profileIndex = nextProfileIndex(profileIndex, stageResult.score, test.profiles.length - 1);
      await delay(320);
    }

    return { score: summarizeStageScores(stageScores), detail: stageBits.join(" | "), stageScores };
  }

  async function runChess(rootEl, token, test) {
    const stageScores = [];
    const stageBits = [];
    let profileIndex = 1;

    for (let stageIndex = 0; stageIndex < 3; stageIndex++) {
      const stage = test.profiles[profileIndex];
      rootEl.innerHTML = "";
      const title = document.createElement("p");
      title.className = "phase-label";
      title.textContent = `2/4 Chess Glance — level ${stageIndex + 1}/3. Find the new piece square.`;
      rootEl.appendChild(title);

      const placements1 = randomPlacements(stage.minPieces, stage.maxPieces);
      const change = buildBoardChange(placements1, {
        singleSquareOnly: stage.singleSquareOnly,
        addOnly: true,
      });
      if (!change) return { score: 0, detail: "Board change could not be generated." };

      const preview = document.createElement("div");
      rootEl.appendChild(preview);
      createChessBoard(preview, placements1, { interactive: false });
      await delay(stage.previewMs);
      if (!runtime.isActive(token)) return null;
      preview.remove();

      const clearLabel = document.createElement("p");
      clearLabel.className = "phase-label";
      clearLabel.textContent = "Board cleared… hold the position.";
      rootEl.appendChild(clearLabel);

      const clearBoard = document.createElement("div");
      rootEl.appendChild(clearBoard);
      createChessBoard(clearBoard, {}, { interactive: false });
      await delay(stage.clearMs);
      if (!runtime.isActive(token)) return null;
      clearLabel.remove();
      clearBoard.remove();

      const stageResult = await new Promise((resolve) => {
        const boardHost = document.createElement("div");
        rootEl.appendChild(boardHost);
        const changedSquares = change.changedSquares;
        const found = new Set();
        let attempts = 0;
        const attemptLimit = 1;
        const board = createChessBoard(boardHost, change.nextPlacements, {
          interactive: true,
          onCellClick: (sq) => {
            if (!runtime.isActive(token) || attempts >= attemptLimit || found.size >= changedSquares.length) return;
            attempts += 1;
            const correct = changedSquares.includes(sq) && !found.has(sq);
            if (correct) found.add(sq);
            board.clearMarks();
            for (const hit of found) board.setHighlight(hit, "mark-correct");
            if (!correct) board.setHighlight(sq, "mark-wrong");
            if (found.size < changedSquares.length && attempts < attemptLimit) return;
            board.clearMarks();
            for (const square of changedSquares) board.setHighlight(square, "mark-correct");
            const accuracy = found.size / changedSquares.length;
            const efficiency = (attemptLimit - attempts + 1) / attemptLimit;
            const score = Math.round(100 * (0.7 * accuracy + 0.3 * efficiency));
            resolve({
              score: clamp(score, 0, 100),
              detail: `L${stageIndex + 1}: ${change.summary}, ${found.size}/${changedSquares.length} in ${attempts} tries`,
            });
          },
        });
      });
      if (!runtime.isActive(token)) return null;
      stageScores.push(stageResult.score);
      stageBits.push(`${stageResult.detail} [P${profileIndex + 1}]`);
      profileIndex = nextProfileIndex(profileIndex, stageResult.score, test.profiles.length - 1);
      await delay(320);
    }

    return { score: summarizeStageScores(stageScores), detail: stageBits.join(" | "), stageScores };
  }

  async function runPairs(rootEl, token, test) {
    const stageScores = [];
    const stageBits = [];
    let profileIndex = 1;

    for (let stageIndex = 0; stageIndex < 3; stageIndex++) {
      const stage = test.profiles[profileIndex];
      rootEl.innerHTML = "";
      const title = document.createElement("p");
      title.className = "phase-label";
      title.textContent = `3/4 Pair Recall — level ${stageIndex + 1}/3. Clear the board in as few tries as possible.`;
      rootEl.appendChild(title);

      const grid = document.createElement("div");
      grid.className = "memory-grid";
      grid.style.gridTemplateColumns = "repeat(4, 1fr)";
      rootEl.appendChild(grid);

      const pairCount = stage.pairCount;
      const symbols = pickN(PAIR_SYMBOLS, pairCount);
      const deck = shuffle([...symbols, ...symbols]);
      /** @type {{ el: HTMLButtonElement, sym: string, off: boolean }[]} */
      const cards = deck.map((sym) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "memory-card";
        el.textContent = "?";
        grid.appendChild(el);
        return { el, sym, off: false };
      });

      const stageResult = await new Promise((resolve) => {
        let open = [];
        let attempts = 0;
        let misses = 0;
        let matched = 0;
        let lock = false;

        const reveal = (idx) => {
          cards[idx].el.textContent = cards[idx].sym;
          cards[idx].el.classList.add("memory-up");
        };
        const hide = (idx) => {
          if (cards[idx].off) return;
          cards[idx].el.textContent = "?";
          cards[idx].el.classList.remove("memory-up", "mark-wrong");
        };

        cards.forEach((card, idx) => {
          card.el.addEventListener("click", async () => {
            if (!runtime.isActive(token) || card.off || lock || open.includes(idx)) return;
            reveal(idx);
            open.push(idx);
            if (open.length < 2) return;
            attempts += 1;
            lock = true;
            const [a, b] = open;
            if (cards[a].sym === cards[b].sym) {
              cards[a].off = true;
              cards[b].off = true;
              cards[a].el.classList.add("memory-matched");
              cards[b].el.classList.add("memory-matched");
              matched += 1;
              open = [];
              lock = false;
              if (matched >= pairCount) {
                const ideal = pairCount;
                const efficiency = ideal / attempts;
                const score = Math.round(100 * clamp(0.75 * efficiency + 0.25 * (1 - misses / Math.max(1, attempts)), 0, 1));
                resolve({ score, detail: `L${stageIndex + 1}: ${attempts} tries, ${misses} misses` });
              }
              return;
            }
            misses += 1;
            cards[a].el.classList.add("mark-wrong");
            cards[b].el.classList.add("mark-wrong");
            await delay(420);
            if (!runtime.isActive(token)) return;
            hide(a);
            hide(b);
            open = [];
            lock = false;
          });
        });
      });
      if (!runtime.isActive(token)) return null;
      stageScores.push(stageResult.score);
      stageBits.push(`${stageResult.detail} [P${profileIndex + 1}]`);
      profileIndex = nextProfileIndex(profileIndex, stageResult.score, test.profiles.length - 1);
      await delay(320);
    }

    return { score: summarizeStageScores(stageScores), detail: stageBits.join(" | "), stageScores };
  }

  async function runSweep(rootEl, token, test) {
    const stageScores = [];
    const stageBits = [];
    let profileIndex = 1;

    for (let stageIndex = 0; stageIndex < 3; stageIndex++) {
      const stage = test.profiles[profileIndex];
      rootEl.innerHTML = "";
      const title = document.createElement("p");
      title.className = "phase-label";
      title.textContent = `4/4 Number Sweep — level ${stageIndex + 1}/3. Tap numbers in ascending order.`;
      rootEl.appendChild(title);

      const field = document.createElement("div");
      field.className = "number-sweep-field";
      rootEl.appendChild(field);

      const count = stage.count;
      const cols = stage.columns;
      const nums = shuffle([...Array(count)].map((_, i) => i + 1));
      const t0 = performance.now();
      const buttons = [];

      for (let i = 0; i < count; i++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "number-sweep-btn";
        btn.textContent = String(nums[i]);
        btn.dataset.value = String(nums[i]);
        btn.style.left = `${10 + (i % cols) * (70 / Math.max(1, cols - 1))}%`;
        btn.style.top = `${14 + Math.floor(i / cols) * 22}%`;
        field.appendChild(btn);
        buttons.push(btn);
      }

      const stageResult = await new Promise((resolve) => {
        let next = 1;
        let mistakes = 0;

        buttons.forEach((btn) => {
          btn.addEventListener("click", async () => {
            if (!runtime.isActive(token) || btn.disabled) return;
            const value = Number(btn.dataset.value);
            if (value !== next) {
              mistakes += 1;
              btn.classList.add("mark-wrong");
              for (const button of buttons) button.disabled = true;
              await delay(220);
              const ms = performance.now() - t0;
              const accuracy = (next - 1) / count;
              const speed = clamp((9500 - ms) / 6500, 0, 1);
              const score = Math.round(100 * (0.7 * accuracy + 0.3 * speed));
              resolve({ score: clamp(score, 0, 100), detail: `L${stageIndex + 1}: stopped at ${next}/${count}, ${Math.round(ms)} ms` });
              return;
            }
            btn.disabled = true;
            btn.classList.add("number-sweep-done");
            next += 1;
            if (next > count) {
              const ms = performance.now() - t0;
              const speed = clamp((9500 - ms) / 6500, 0, 1);
              const score = Math.round(100 * (0.68 + 0.32 * speed));
              resolve({ score: clamp(score, 0, 100), detail: `L${stageIndex + 1}: cleared ${count}/${count}, ${Math.round(ms)} ms, ${mistakes} mistakes` });
            }
          });
        });
      });
      if (!runtime.isActive(token)) return null;
      stageScores.push(stageResult.score);
      stageBits.push(`${stageResult.detail} [P${profileIndex + 1}]`);
      profileIndex = nextProfileIndex(profileIndex, stageResult.score, test.profiles.length - 1);
      await delay(320);
    }

    return { score: summarizeStageScores(stageScores), detail: stageBits.join(" | "), stageScores };
  }

  async function beginRound() {
    const token = runtime.beginRound();
    shell.hideInstructions();

    /** @type {{ id: string, label: string, weight: number, score: number, detail: string, stageScores: number[] }[]} */
    const results = [];
    const runners = {
      pattern: runPattern,
      chess: runChess,
      pairs: runPairs,
      sweep: runSweep,
    };

    for (const test of SNAPSHOT_SUBTESTS) {
      if (!runtime.isActive(token)) return;
      const run = runners[test.id];
      const result = await run(root, token, test);
      if (!result || !runtime.isActive(token)) return;
      results.push({ ...test, score: result.score, detail: result.detail });
      await delay(380);
    }

    const composite = Math.round(
      results.reduce((sum, item) => sum + item.score * item.weight, 0),
    );
    const band = bandForComposite(composite);
    const stability = stabilityForResults(results);
    const success = composite >= 55;
    const points = Math.round(composite * 3.2);
    const progress = shell.recordRound(success, points, {
      qualityFraction: composite / 100,
      metrics: Object.fromEntries(results.map((item) => [`snapshot_${item.id}`, item.score])),
    });
    renderReport(results, composite, band, stability);
    shell.stopTimer();
    shell.showResult(
      "Snapshot complete.",
      `Composite ${composite}/100. Band: ${band.label}. Stability: ${stability.label}. ` +
      `Subscores: ${results.map((item) => `${item.label} ${item.score}`).join(" | ")}.`,
    );
  }

  return {
    restart: beginRound,
    reset,
    destroy: teardown,
  };
}

export const instructionsHtml = `
  <strong>Cognitive Snapshot</strong> — Run four short checks built from the existing games:
  Pattern Grid, Chess Glance, Pair Recall, and Number Sweep. Each task runs for 3 adaptive levels,
  then the normalized task scores are combined into one composite score, a banded result, and a heuristic stability profile.`;
