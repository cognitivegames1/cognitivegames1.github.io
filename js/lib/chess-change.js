import { pieceName } from "./chess-board.js";
import { allSquares } from "./chess-position.js";
import { pick } from "./random.js";

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

function randomExtraPiece(placements) {
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

/**
 * @param {Record<string, string>} placements
 * @param {{ singleSquareOnly?: boolean, addOnly?: boolean }} [options]
 */
export function buildBoardChange(placements, options = {}) {
  const { singleSquareOnly = false, addOnly = false } = options;
  const occupied = Object.keys(placements);
  const empty = allSquares().filter((sq) => !(sq in placements));
  const removable = occupied.filter((sq) => placements[sq] !== "K" && placements[sq] !== "k");

  /** @type {("add" | "remove" | "move")[]} */
  const modes = [];
  if (empty.length > 0 && randomExtraPiece(placements)) modes.push("add");
  if (!addOnly && removable.length > 0) modes.push("remove");
  if (!addOnly && !singleSquareOnly && occupied.length > 0 && empty.length > 0) modes.push("move");
  if (modes.length === 0) return null;

  const mode = pick(modes);
  /** @type {Record<string, string>} */
  const nextPlacements = { ...placements };

  if (mode === "add") {
    const square = pick(empty);
    const piece = randomExtraPiece(nextPlacements);
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
