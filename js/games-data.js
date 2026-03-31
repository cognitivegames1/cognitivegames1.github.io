/** @typedef {'visual-memory' | 'working-memory' | 'spatial' | 'attention'} CategoryId */

/**
 * @typedef {{
 *   slug: string,
 *   title: string,
 *   category: CategoryId,
 *   description: string,
 *   difficulty: string,
 *   roundLength: string,
 *   accent: string,
 *   icon: string
 * }} GameMeta
 */

/** @type {{ id: CategoryId, label: string }[]} */
export const CATEGORIES = [
  { id: "visual-memory", label: "Visual Memory" },
  { id: "working-memory", label: "Working Memory" },
  { id: "spatial", label: "Spatial Reasoning" },
  { id: "attention", label: "Attention and Speed" },
];

/** @type {GameMeta[]} */
export const GAMES = [
  {
    slug: "chess-glance",
    title: "Chess Glance",
    category: "visual-memory",
    description:
      "Memorize the board, then spot the one new piece that appears. Fast visual encoding.",
    difficulty: "Medium",
    roundLength: "~45s",
    accent: "#f472b6",
    icon: "♟",
  },
  {
    slug: "piece-recall",
    title: "Piece Recall",
    category: "visual-memory",
    description:
      "Study the position, then place the piece you were asked about. Same board engine as Chess Glance.",
    difficulty: "Medium",
    roundLength: "~1 min",
    accent: "#a78bfa",
    icon: "♜",
  },
  {
    slug: "pattern-grid",
    title: "Pattern Grid",
    category: "visual-memory",
    description:
      "Cells flash on briefly. Recreate the exact pattern from memory.",
    difficulty: "Easy–Hard",
    roundLength: "~30–60s",
    accent: "#38bdf8",
    icon: "▦",
  },
  {
    slug: "sequence-echo",
    title: "Sequence Echo",
    category: "working-memory",
    description:
      "Watch the sequence, then tap tiles in the same order. Length and pace scale with difficulty.",
    difficulty: "Easy–Hard",
    roundLength: "~30–90s",
    accent: "#4ade80",
    icon: "◇",
  },
  {
    slug: "n-back-grid",
    title: "N-Back Grid",
    category: "working-memory",
    description:
      "Watch a tile stream, then identify the tile that repeated after N steps.",
    difficulty: "Easy–Hard",
    roundLength: "~40–90s",
    accent: "#f59e0b",
    icon: "⟲",
  },
  {
    slug: "icon-back",
    title: "Icon Match (1-Back)",
    category: "working-memory",
    description:
      "Decide if the current icon matches the previous one. 10 fixed comparisons per round.",
    difficulty: "Easy–Hard",
    roundLength: "~25–50s",
    accent: "#34d399",
    icon: "◉",
  },
  {
    slug: "reverse-echo",
    title: "Reverse Echo",
    category: "working-memory",
    description:
      "Watch a tile sequence, then replay it in reverse order.",
    difficulty: "Easy–Hard",
    roundLength: "~30–90s",
    accent: "#fb7185",
    icon: "↶",
  },
  {
    slug: "pair-recall",
    title: "Pair Recall",
    category: "visual-memory",
    description:
      "Flip two cards at a time and find all matching pairs. One mismatch ends the round.",
    difficulty: "Easy–Hard",
    roundLength: "~1–3 min",
    accent: "#c084fc",
    icon: "🎴",
  },
  {
    slug: "path-memory",
    title: "Path Memory",
    category: "spatial",
    description:
      "A path lights through adjacent cells. Watch, then retrace the same route in order.",
    difficulty: "Easy–Hard",
    roundLength: "~30–90s",
    accent: "#2dd4bf",
    icon: "⌗",
  },
  {
    slug: "number-sweep",
    title: "Number Sweep",
    category: "attention",
    description:
      "Tap scattered numbers in ascending order as fast as you can. One wrong tap ends the round.",
    difficulty: "Easy–Hard",
    roundLength: "~20–60s",
    accent: "#f472b6",
    icon: "🔢",
  },
  {
    slug: "color-word-clash",
    title: "Color–Word Clash",
    category: "attention",
    description:
      "Stroop-style: pick the ink color of the word, not the word itself.",
    difficulty: "Easy–Hard",
    roundLength: "~30–60s",
    accent: "#38bdf8",
    icon: "◐",
  },
  {
    slug: "reaction-gate",
    title: "Reaction Gate",
    category: "attention",
    description:
      "Wait for green, then tap immediately. Early taps count as a false start.",
    difficulty: "Easy–Hard",
    roundLength: "~30–60s",
    accent: "#a3e635",
    icon: "⚡",
  },
  {
    slug: "target-count",
    title: "Target Count",
    category: "attention",
    description:
      "Track one target tile through a rapid flash stream, then report how many times it appeared.",
    difficulty: "Easy–Hard",
    roundLength: "~30–70s",
    accent: "#f97316",
    icon: "◎",
  },
];

/**
 * @param {CategoryId | 'all'} filter
 * @returns {GameMeta[]}
 */
export function gamesForFilter(filter) {
  if (filter === "all") return GAMES;
  return GAMES.filter((g) => g.category === filter);
}

/**
 * @param {CategoryId} category
 * @returns {GameMeta[]}
 */
export function gamesInCategory(category) {
  return GAMES.filter((g) => g.category === category);
}
