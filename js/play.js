import { GAMES } from "./games-data.js";
import { constructsForGame, RESEARCH_DISCLAIMER } from "./cognitive-constructs.js";
import { requireEl } from "./lib/dom.js";
import { clamp } from "./lib/math.js";
import {
  clearCognitiveLocalStorage,
  cognitiveStorageStats,
  logRoundEvent,
  recordSessionAndCompare,
} from "./lib/cognitive-telemetry.js";
import { createElapsedTimer, formatTime } from "./lib/timer.js";
import "./posthog.js";

const params = new URLSearchParams(window.location.search);
const datasetSlug = document.documentElement.dataset.gameSlug?.trim() || null;
const slugFromQuery = params.get("game");
const pathParts = window.location.pathname.split("/").filter(Boolean);
const pageName = pathParts[pathParts.length - 1] || "";
const slugFromPath = pageName.endsWith(".html")
  ? decodeURIComponent(pageName.slice(0, -5))
  : null;
const slug = datasetSlug || slugFromQuery || slugFromPath;
const meta = GAMES.find((g) => g.slug === slug);
const lobbyHref = document.documentElement.dataset.lobbyHref || "index.html";

if (!meta) {
  window.location.href = lobbyHref;
  throw new Error("Unknown game slug");
}

document.title = `${meta.title} - Cognitive Games`;

requireEl("play-title").textContent = meta.title;
document.documentElement.style.setProperty("--game-accent", meta.accent);

const elTime = requireEl("stat-time");
const elScore = requireEl("stat-score");
const btnRestart = requireEl("btn-restart");
const instructionsPanel = requireEl("instructions-panel");
const instructionsText = requireEl("instructions-text");
const btnStart = requireEl("btn-start-round");
const gameRoot = requireEl("game-root");
const resultPanel = requireEl("result-panel");
const resultTitle = requireEl("result-title");
const resultDetail = requireEl("result-detail");
const btnPlayAgain = requireEl("btn-play-again");

const TOTAL_ROUNDS = meta.sessionRounds ?? 10;
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;

let totalScore = 0;
const session = {
  round: 0,
  difficulty: MIN_DIFFICULTY,
  qualityEarned: 0,
  qualityMax: 0,
  wins: 0,
  active: false,
  finished: false,
};

const timer = createElapsedTimer((sec) => {
  elTime.textContent = formatTime(sec);
});

function updateScoreLabel() {
  elScore.textContent = `Score: ${totalScore}`;
}

function setScore(n) {
  totalScore = n;
  updateScoreLabel();
}

function addScore(delta) {
  setScore(totalScore + delta);
}

/** Reset after each full session summary is logged to avoid duplicate local history writes. */
let sessionLogged = false;

function resetSessionProgress() {
  session.round = 0;
  session.difficulty = MIN_DIFFICULTY;
  session.qualityEarned = 0;
  session.qualityMax = 0;
  session.wins = 0;
  session.active = false;
  session.finished = false;
  sessionLogged = false;
  updateScoreLabel();
}

/**
 * @param {boolean} success
 * @param {number} [points]
 * @param {{ qualityFraction?: number, metrics?: Record<string, number | string | boolean | null> }} [opts]
 * `qualityFraction` in [0,1] scales the difficulty-weighted contribution to the session rating (default: 1 if success else 0).
 * `metrics` optional trial-level numbers for local analytics / PostHog.
 */
function recordRound(success, points = 0, opts = {}) {
  const levelUsed = session.difficulty;
  let q = opts.qualityFraction;
  if (typeof q !== "number" || Number.isNaN(q)) {
    q = success ? 1 : 0;
  } else {
    q = clamp(q, 0, 1);
  }

  if (session.finished) {
    const ratingNow = session.qualityMax > 0
      ? Math.round((session.qualityEarned / session.qualityMax) * 100)
      : 0;
    return {
      round: session.round,
      totalRounds: TOTAL_ROUNDS,
      nextDifficulty: session.difficulty,
      wins: session.wins,
      rating: ratingNow,
      done: true,
    };
  }

  session.active = true;
  session.round += 1;
  session.qualityMax += levelUsed;
  session.qualityEarned += levelUsed * q;

  if (success) {
    session.wins += 1;
    if (points > 0) addScore(points);
  }

  session.difficulty = clamp(
    levelUsed + (success ? 1 : -1),
    MIN_DIFFICULTY,
    MAX_DIFFICULTY,
  );

  session.finished = session.round >= TOTAL_ROUNDS;
  const rating = session.qualityMax > 0
    ? Math.round((session.qualityEarned / session.qualityMax) * 100)
    : 0;
  updateScoreLabel();

  logRoundEvent(meta.slug, {
    round: session.round,
    difficulty: levelUsed,
    success,
    qualityFraction: q,
    ratingAfter: rating,
    metrics: opts.metrics,
  });

  return {
    round: session.round,
    totalRounds: TOTAL_ROUNDS,
    nextDifficulty: session.difficulty,
    wins: session.wins,
    rating,
    done: session.finished,
  };
}

function showResult(title, detail) {
  timer.stop();
  resultTitle.textContent = title;
  let tail = "";
  if (session.finished && session.active && !sessionLogged) {
    sessionLogged = true;
    const rating = session.qualityMax > 0
      ? Math.round((session.qualityEarned / session.qualityMax) * 100)
      : 0;
    const prior = recordSessionAndCompare(meta.slug, { rating, wins: session.wins });
    if (prior && prior.priorCount > 0) {
      tail = ` Versus your saved past sessions on this title: higher than ${prior.percentile}% of prior runs (${prior.priorCount} stored).`;
    } else {
      tail = " Baseline session stored locally for future comparisons on this title.";
    }
  }
  resultDetail.textContent = `${detail}${tail} Total score: ${totalScore}.`;
  btnPlayAgain.textContent = session.finished
    ? (TOTAL_ROUNDS === 1 ? "Run again" : `Start new ${TOTAL_ROUNDS}-round session`)
    : "Next round";
  resultPanel.classList.remove("hidden");
}

function hideResult() {
  resultPanel.classList.add("hidden");
}

function ensureConstructPanel() {
  let el = document.getElementById("construct-panel");
  if (el) return el;
  const instructionsText = document.getElementById("instructions-text");
  if (!instructionsText) return null;
  el = document.createElement("div");
  el.id = "construct-panel";
  el.className = "construct-panel-wrap";
  el.hidden = true;
  instructionsText.insertAdjacentElement("afterend", el);
  return el;
}

function renderConstructPanel() {
  const constructPanel = ensureConstructPanel();
  if (!constructPanel) return;
  const list = constructsForGame(meta.slug);
  if (list.length === 0) {
    constructPanel.hidden = true;
    constructPanel.innerHTML = "";
    return;
  }
  constructPanel.hidden = false;
  constructPanel.innerHTML = "";

  const details = document.createElement("details");
  details.className = "construct-disclosure";

  const summary = document.createElement("summary");
  summary.textContent = "What cognitive processes this relates to";

  const disclaimer = document.createElement("p");
  disclaimer.className = "construct-disclaimer";
  disclaimer.textContent = RESEARCH_DISCLAIMER;

  const ul = document.createElement("ul");
  ul.className = "construct-list";

  for (const c of list) {
    const li = document.createElement("li");
    const lead = document.createElement("strong");
    lead.textContent = c.label;
    li.append(lead, document.createTextNode(` — ${c.blurb} `));
    const cite = document.createElement("cite");
    cite.className = "construct-cite";
    cite.textContent = c.cite;
    li.appendChild(cite);
    ul.appendChild(li);
  }

  details.append(summary, disclaimer, ul);
  constructPanel.appendChild(details);
}

function renderTelemetryPrivacyRow() {
  const instructionsPanel = document.getElementById("instructions-panel");
  if (!instructionsPanel) return;
  let el = document.getElementById("telemetry-privacy");
  if (!el) {
    el = document.createElement("div");
    el.id = "telemetry-privacy";
    el.className = "telemetry-privacy";
    const actions = instructionsPanel.querySelector(".instructions-actions");
    if (actions?.nextSibling) instructionsPanel.insertBefore(el, actions.nextSibling);
    else instructionsPanel.appendChild(el);
  }
  el.innerHTML = "";
  const stats = cognitiveStorageStats();
  const details = document.createElement("details");
  details.className = "telemetry-disclosure";
  const summary = document.createElement("summary");
  summary.textContent = "Data and privacy";
  const p = document.createElement("p");
  p.className = "telemetry-privacy-line";
  p.textContent =
    stats.sessionRows === 0
      ? "No saved sessions yet — after you finish a 10-round run, future runs can compare to your history on this device."
      : `Local history: ${stats.sessionRows} saved session${stats.sessionRows === 1 ? "" : "s"} across ${stats.gamesWithSessions} game${stats.gamesWithSessions === 1 ? "" : "s"} (this browser only).`;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn-ghost telemetry-clear-btn";
  btn.textContent = "Clear local history";
  btn.addEventListener("click", () => {
    if (
      !confirm(
        "Remove all locally saved sessions and round logs? “Versus your past runs” will reset. This cannot be undone.",
      )
    ) {
      return;
    }
    clearCognitiveLocalStorage();
    renderTelemetryPrivacyRow();
  });
  details.append(summary, p, btn);
  el.append(details);
}

/** @type {null | { restart: () => void, reset: () => void, destroy: () => void }} */
let current = null;

function startRoundNow() {
  hideResult();
  elTime.textContent = "0.00s";
  timer.stop();
  timer.start();
  current?.restart();
}

function startNewSession() {
  setScore(0);
  resetSessionProgress();
  session.active = true;
  instructionsPanel.classList.add("hidden");
  startRoundNow();
}

async function loadGame() {
  const loaders = {
    "cognitive-snapshot": () => import("./games/cognitive-snapshot.js"),
    "chess-glance": () => import("./games/chess-glance.js"),
    "piece-recall": () => import("./games/piece-recall.js"),
    "sequence-echo": () => import("./games/sequence-echo.js?v=2026-04-05c"),
    "pattern-grid": () => import("./games/pattern-grid.js?v=2026-04-05a"),
    "pair-recall": () => import("./games/pair-recall.js"),
    "path-memory": () => import("./games/path-memory.js"),
    "number-sweep": () => import("./games/number-sweep.js"),
    "color-word-clash": () => import("./games/color-word-clash.js"),
  };

  const load = loaders[/** @type {keyof typeof loaders} */ (meta.slug)];
  if (!load) {
    window.location.href = lobbyHref;
    return;
  }

  const mod = await load();
  instructionsText.innerHTML = mod.instructionsHtml;
  renderConstructPanel();
  renderTelemetryPrivacyRow();
  gameRoot.innerHTML = "";

  setScore(0);
  resetSessionProgress();
  elTime.textContent = "0.00s";
  hideResult();
  instructionsPanel.classList.remove("hidden");

  current?.destroy();
  current = mod.mount(gameRoot, {
    meta,
    setScore,
    addScore,
    getScore: () => totalScore,
    getDifficulty: () => session.difficulty,
    recordRound,
    startTimer: () => timer.start(),
    stopTimer: () => timer.stop(),
    resetTimerDisplay: () => {
      elTime.textContent = "0.00s";
    },
    showResult,
    hideResult,
    hideInstructions: () => instructionsPanel.classList.add("hidden"),
    showInstructions: () => instructionsPanel.classList.remove("hidden"),
    session: {
      get round() { return session.round; },
      get difficulty() { return session.difficulty; },
      get wins() { return session.wins; },
      get totalRounds() { return TOTAL_ROUNDS; },
      get rating() {
        return session.qualityMax > 0
          ? Math.round((session.qualityEarned / session.qualityMax) * 100)
          : 0;
      },
      get finished() { return session.finished; },
    },
  });
}

btnStart.addEventListener("click", () => {
  startNewSession();
});

btnRestart.addEventListener("click", () => {
  timer.stop();
  elTime.textContent = "0.00s";
  setScore(0);
  resetSessionProgress();
  hideResult();
  btnPlayAgain.textContent = "Play again";
  instructionsPanel.classList.remove("hidden");
  current?.reset();
});

btnPlayAgain.addEventListener("click", () => {
  if (session.finished || !session.active) {
    startNewSession();
    return;
  }
  startRoundNow();
});

await loadGame();
