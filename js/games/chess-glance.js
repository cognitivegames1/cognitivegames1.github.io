import { createChessBoard, pieceName } from "../lib/chess-board.js";
import { randomPlacements } from "../lib/chess-position.js";
import { pick, randInt } from "../lib/random.js";
import { delay } from "../lib/async.js";
import { createRoundRuntime } from "./shared/round-runtime.js";
import { showSessionComplete } from "./shared/results.js";

const EXTRA_PIECE_LIMITS = {
  K: 1,
  Q: 1,
  R: 2,
  B: 2,
  N: 2,
  P: 8,
  k: 1,
  q: 1,
  r: 2,
  b: 2,
  n: 2,
  p: 8,
};

function randomPiece(placements) {
  const counts = new Map();
  for (const piece of Object.values(placements)) {
    counts.set(piece, (counts.get(piece) ?? 0) + 1);
  }

  const choices = Object.entries(EXTRA_PIECE_LIMITS)
    .filter(([piece, limit]) => (counts.get(piece) ?? 0) < limit)
    .map(([piece]) => piece);

  if (choices.length === 0) return null;
  return pick(choices);
}

function allSquares() {
  return [...Array(64)].map((_, i) => {
    const files = "abcdefgh";
    const file = i % 8;
    const rank = Math.floor(i / 8);
    return `${files[file]}${rank + 1}`;
  });
}

function buildBoardChange(placements) {
  const occupied = Object.keys(placements);
  const empty = allSquares().filter((sq) => !(sq in placements));
  const removable = occupied.filter((sq) => placements[sq] !== "K" && placements[sq] !== "k");

  /** @type {("add" | "remove" | "move")[]} */
  const modes = [];
  if (empty.length > 0 && randomPiece(placements)) modes.push("add");
  if (removable.length > 0) modes.push("remove");
  if (occupied.length > 0 && empty.length > 0) modes.push("move");
  if (modes.length === 0) return null;

  const mode = pick(modes);
  /** @type {Record<string, string>} */
  const nextPlacements = { ...placements };

  if (mode === "add") {
    const square = pick(empty);
    const piece = randomPiece(nextPlacements);
    if (!piece) return null;
    nextPlacements[square] = piece;
    return {
      nextPlacements,
      changedSquares: [square],
      summary: `${pieceName(piece)} added on ${square.toUpperCase()}`,
    };
  }

  if (mode === "remove") {
    const square = pick(removable);
    const piece = nextPlacements[square];
    delete nextPlacements[square];
    return {
      nextPlacements,
      changedSquares: [square],
      summary: `${pieceName(piece)} removed from ${square.toUpperCase()}`,
    };
  }

  const source = pick(occupied);
  const destination = pick(empty);
  const piece = nextPlacements[source];
  delete nextPlacements[source];
  nextPlacements[destination] = piece;
  return {
    nextPlacements,
    changedSquares: [source, destination],
    summary: `${pieceName(piece)} moved from ${source.toUpperCase()} to ${destination.toUpperCase()}`,
  };
}

export const instructionsHtml = `
  <strong>Chess Glance</strong> — Study the board briefly. It disappears, then a new board appears with
  one board change: a piece may be added, removed, or moved. Tap every square involved in the change.`;

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
    const memorizeMs = randInt(
      Math.max(1800, 5200 - difficulty * 500),
      Math.max(2200, 6200 - difficulty * 520),
    );
    const minPieces = 4 + difficulty;
    const maxPieces = Math.min(minPieces + 3, 16);

    const placements1 = randomPlacements(minPieces, maxPieces);
    const change = buildBoardChange(placements1);
    if (!change) return;
    const placements2 = change.nextPlacements;
    const changedSquares = change.changedSquares;
    const questionCount = changedSquares.length;

    const phase = document.createElement("p");
    phase.className = "phase-label";
    phase.textContent = "Memorize the position…";
    root.appendChild(phase);

    const wrap1 = document.createElement("div");
    root.appendChild(wrap1);
    createChessBoard(wrap1, placements1, { interactive: false });

    await delay(memorizeMs);
    if (!runtime.isActive(myRound)) return;

    wrap1.remove();

    // Briefly show an empty board between phases to avoid transition cues.
    phase.textContent = "Clearing board…";
    const clearWrap = document.createElement("div");
    root.appendChild(clearWrap);
    createChessBoard(clearWrap, {}, { interactive: false });
    await delay(1000);
    if (!runtime.isActive(myRound)) return;
    clearWrap.remove();

    phase.innerHTML = `Find the changed square${questionCount === 1 ? "" : "s"}.`;

    const wrap2 = document.createElement("div");
    root.appendChild(wrap2);

    const found = new Set();
    let attempts = 0;
    const attemptLimit = questionCount + 2;

    const board = createChessBoard(wrap2, placements2, {
      interactive: true,
      onCellClick: (sq) => {
        if (!runtime.isActive(myRound)) return;
        if (attempts >= attemptLimit || found.size >= questionCount) return;
        attempts += 1;
        const correct = changedSquares.includes(sq) && !found.has(sq);
        if (correct) found.add(sq);

        board.clearMarks();
        for (const s of found) board.setHighlight(s, "mark-correct");
        if (!correct) board.setHighlight(sq, "mark-wrong");

        phase.innerHTML = `Found ${found.size}/${questionCount} new square${questionCount === 1 ? "" : "s"}. Attempts ${attempts}/${attemptLimit}.`;
        if (found.size < questionCount && attempts < attemptLimit) return;

        board.clearMarks();
        for (const s of changedSquares) board.setHighlight(s, "mark-correct");
        if (!correct) board.setHighlight(sq, "mark-wrong");

        const qualityFraction = questionCount > 0 ? found.size / questionCount : 0;
        const success = found.size === questionCount;
        const attemptFactor = (attemptLimit - attempts + 1) / attemptLimit;
        const pts = success
          ? Math.round((100 + difficulty * 14) * (0.58 + 0.42 * attemptFactor))
          : 0;
        const progress = shell.recordRound(success, pts, {
          qualityFraction,
          metrics: {
            chessGlanceTargets: questionCount,
            chessGlanceFound: found.size,
            chessGlanceAttempts: attempts,
          },
        });

        shell.stopTimer();
        if (progress.done) {
          showSessionComplete(shell, progress);
          return;
        }

        shell.showResult(
          success ? "Board changes tracked." : "Some changes missed.",
          `${success ? `+${pts} points. ` : ""}Found ${found.size}/${questionCount}. Change: ${change.summary}. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
        );
      },
    });
  }

  return {
    restart: beginRound,
    reset,
    destroy: teardown,
  };
}
