/**
 * Local-only session & round history. No server, no network.
 * "Percentile" is computed against this device's own past runs.
 */

const STORAGE_SESSIONS = "cg_cognitive_sessions_v1";
const STORAGE_ROUNDS = "cg_cognitive_rounds_v1";
const STORAGE_TESTS = "cg_cognitive_tests_v1";
const MAX_SESSIONS_PER_GAME = 40;
const MAX_ROUND_EVENTS = 400;
const MAX_TESTS_PER_SLUG = 40;

/**
 * @typedef {{
 *   slug: string,
 *   at: number,
 *   rating: number,
 *   wins: number,
 * }} SessionRecord
 */

/**
 * @typedef {{
 *   slug: string,
 *   at: number,
 *   round: number,
 *   difficulty: number,
 *   success: boolean,
 *   qualityFraction: number,
 *   ratingAfter: number,
 *   metrics?: Record<string, number | string | boolean | null>,
 * }} RoundRecord
 */

function readSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_SESSIONS);
    if (!raw) return /** @type {Record<string, SessionRecord[]>} */ ({});
    const o = JSON.parse(raw);
    return typeof o === "object" && o ? o : {};
  } catch {
    return {};
  }
}

function writeSessions(/** @type {Record<string, SessionRecord[]>} */ data) {
  try {
    localStorage.setItem(STORAGE_SESSIONS, JSON.stringify(data));
  } catch {
    /* quota */
  }
}

function readRounds() {
  try {
    const raw = localStorage.getItem(STORAGE_ROUNDS);
    if (!raw) return /** @type {RoundRecord[]} */ ([]);
    const a = JSON.parse(raw);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function writeRounds(/** @type {RoundRecord[]} */ rows) {
  try {
    localStorage.setItem(STORAGE_ROUNDS, JSON.stringify(rows.slice(-MAX_ROUND_EVENTS)));
  } catch {
    /* quota */
  }
}

/**
 * Fraction of prior sessions on this game with strictly lower rating (0–100).
 * @param {string} slug
 * @param {number} rating
 * @returns {null | { percentile: number, priorCount: number }}
 */
function compareToOwnHistory(slug, rating) {
  const all = readSessions();
  const listRaw = all[slug];
  const list = Array.isArray(listRaw) ? listRaw : [];
  if (list.length === 0) return null;
  const below = list.filter((s) => s.rating < rating).length;
  return {
    percentile: Math.round((below / list.length) * 100),
    priorCount: list.length,
  };
}

/**
 * Saves this session, returns comparison vs prior sessions only (before save).
 * @param {string} slug
 * @param {{ rating: number, wins: number }} summary
 * @returns {null | { percentile: number, priorCount: number }}
 */
export function recordSessionAndCompare(slug, summary) {
  const before = compareToOwnHistory(slug, summary.rating);
  const all = readSessions();
  const listRaw = all[slug];
  const list = Array.isArray(listRaw) ? listRaw : [];
  list.push({
    slug,
    at: Date.now(),
    rating: summary.rating,
    wins: summary.wins,
  });
  all[slug] = list.slice(-MAX_SESSIONS_PER_GAME);
  writeSessions(all);
  return before;
}

/**
 * @param {string} slug
 * @param {Omit<RoundRecord, 'at' | 'slug'> & { metrics?: Record<string, number | string | boolean | null> }} payload
 */
export function logRoundEvent(slug, payload) {
  const row = {
    slug,
    at: Date.now(),
    ...payload,
  };
  const rounds = readRounds();
  rounds.push(row);
  writeRounds(rounds);
}

/**
 * @typedef {{ slug: string, at: number, overall: number }} TestRecord
 */

function readTests() {
  try {
    const raw = localStorage.getItem(STORAGE_TESTS);
    if (!raw) return /** @type {Record<string, TestRecord[]>} */ ({});
    const o = JSON.parse(raw);
    return typeof o === "object" && o ? o : {};
  } catch {
    return {};
  }
}

function writeTests(/** @type {Record<string, TestRecord[]>} */ data) {
  try {
    localStorage.setItem(STORAGE_TESTS, JSON.stringify(data));
  } catch {
    /* quota */
  }
}

/**
 * Saves this test run, returns comparison vs prior runs on the same test (before save).
 * @param {string} slug
 * @param {{ overall: number }} summary
 * @returns {{ percentile: number, priorCount: number }}
 */
export function recordTestAndCompare(slug, summary) {
  const all = readTests();
  const listRaw = all[slug];
  const list = Array.isArray(listRaw) ? listRaw : [];
  const priorCount = list.length;
  const below = list.filter((t) => t.overall < summary.overall).length;
  const percentile = priorCount > 0 ? Math.round((below / priorCount) * 100) : 0;

  list.push({ slug, at: Date.now(), overall: summary.overall });
  all[slug] = list.slice(-MAX_TESTS_PER_SLUG);
  writeTests(all);
  return { percentile, priorCount };
}

/**
 * Remove all locally stored round/session history used for comparisons and analytics buffers.
 */
export function clearCognitiveLocalStorage() {
  try {
    localStorage.removeItem(STORAGE_SESSIONS);
    localStorage.removeItem(STORAGE_ROUNDS);
    localStorage.removeItem(STORAGE_TESTS);
  } catch {
    /* ignore */
  }
}

/**
 * @returns {{ sessionRows: number, gamesWithSessions: number, testRows: number, testsWithRuns: number }}
 */
export function cognitiveStorageStats() {
  const sessions = readSessions();
  let sessionRows = 0;
  for (const v of Object.values(sessions)) {
    sessionRows += Array.isArray(v) ? v.length : 0;
  }
  const tests = readTests();
  let testRows = 0;
  for (const v of Object.values(tests)) {
    testRows += Array.isArray(v) ? v.length : 0;
  }
  return {
    sessionRows,
    gamesWithSessions: Object.keys(sessions).length,
    testRows,
    testsWithRuns: Object.keys(tests).length,
  };
}
