/**
 * @typedef {import('../games/shared/task.js').TaskResult} TaskResult
 * @typedef {import('../games/shared/task.js').TaskMeta} TaskMeta
 * @typedef {import('../games/shared/task.js').Domain} Domain
 * @typedef {import('../tests-data.js').TestMeta} TestMeta
 * @typedef {import('../tests-data.js').TestStage} TestStage
 */

/**
 * @typedef {object} StageOutcome
 * @property {TestStage} stage
 * @property {TaskMeta} meta
 * @property {TaskResult} result
 */

/**
 * @typedef {object} DomainScore
 * @property {Domain} domain
 * @property {number} score       0..100
 * @property {number} stageCount
 */

/**
 * @typedef {object} TestOutcome
 * @property {number} overall              0..100
 * @property {DomainScore[]} perDomain
 * @property {StageOutcome[]} stages
 * @property {number} totalPoints
 * @property {{ label: string }} band
 */

const LOADERS = /** @type {const} */ ({
  "sequence-echo": () => import("../games/sequence-echo.js"),
  "path-memory": () => import("../games/path-memory.js"),
  "pattern-grid": () => import("../games/pattern-grid.js"),
  "pair-recall": () => import("../games/pair-recall.js"),
  "piece-recall": () => import("../games/piece-recall.js"),
  "chess-glance": () => import("../games/chess-glance.js"),
  "number-sweep": () => import("../games/number-sweep.js"),
  "color-word-clash": () => import("../games/color-word-clash.js"),
});

/**
 * @param {keyof typeof LOADERS} slug
 * @returns {Promise<{ runTask: (root: HTMLElement, env: { difficulty: number, isActive: () => boolean }) => Promise<TaskResult | null>, taskMeta: TaskMeta, instructionsHtml: string }>}
 */
async function loadGameModule(slug) {
  const loader = LOADERS[slug];
  if (!loader) throw new Error(`Unknown game slug "${slug}"`);
  const mod = await loader();
  if (typeof mod.runTask !== "function" || !mod.taskMeta) {
    throw new Error(`Game "${slug}" does not export runTask/taskMeta`);
  }
  return /** @type {any} */ (mod);
}

/**
 * @param {number} overall
 * @returns {{ label: string }}
 */
function bandFor(overall) {
  if (overall >= 80) return { label: "Elite" };
  if (overall >= 60) return { label: "Strong" };
  if (overall >= 40) return { label: "Baseline" };
  return { label: "Below baseline" };
}

/**
 * @param {StageOutcome[]} stages
 * @returns {{ overall: number, perDomain: DomainScore[] }}
 */
function aggregate(stages) {
  /** @type {Map<Domain, { num: number, den: number, count: number }>} */
  const byDomain = new Map();

  for (const s of stages) {
    const w = (s.stage.weight ?? 1) * s.stage.difficulty;
    const q = Math.max(0, Math.min(1, s.result.quality));
    for (const d of s.meta.domains) {
      const acc = byDomain.get(d) ?? { num: 0, den: 0, count: 0 };
      acc.num += q * w;
      acc.den += w;
      acc.count += 1;
      byDomain.set(d, acc);
    }
  }

  /** @type {DomainScore[]} */
  const perDomain = [];
  for (const [domain, acc] of byDomain) {
    const score = acc.den > 0 ? Math.round((acc.num / acc.den) * 100) : 0;
    perDomain.push({ domain, score, stageCount: acc.count });
  }
  perDomain.sort((a, b) => a.domain.localeCompare(b.domain));

  const overall = perDomain.length > 0
    ? Math.round(perDomain.reduce((s, d) => s + d.score, 0) / perDomain.length)
    : 0;

  return { overall, perDomain };
}

/**
 * Runs a test as a sequence of game tasks at fixed difficulties.
 *
 * @param {HTMLElement} root
 * @param {TestMeta} test
 * @param {{
 *   onStage?: (index: number, total: number, stage: TestStage) => void,
 *   isActive?: () => boolean,
 * }} [hooks]
 * @returns {Promise<TestOutcome | null>}
 */
export async function runTest(root, test, hooks = {}) {
  const isActive = hooks.isActive ?? (() => true);
  /** @type {StageOutcome[]} */
  const outcomes = [];
  let totalPoints = 0;

  for (let i = 0; i < test.stages.length; i++) {
    if (!isActive()) return null;
    const stage = test.stages[i];
    hooks.onStage?.(i, test.stages.length, stage);

    const mod = await loadGameModule(/** @type {any} */ (stage.game));
    if (!isActive()) return null;
    root.innerHTML = "";

    const result = await mod.runTask(root, {
      difficulty: stage.difficulty,
      isActive,
    });
    if (!result || !isActive()) return null;

    outcomes.push({ stage, meta: mod.taskMeta, result });
    totalPoints += result.points;
  }

  const { overall, perDomain } = aggregate(outcomes);
  return {
    overall,
    perDomain,
    stages: outcomes,
    totalPoints,
    band: bandFor(overall),
  };
}
