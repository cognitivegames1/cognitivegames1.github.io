import "./lib/analytics.js";
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

const elTime = requireEl("stat-time");
const elScore = requireEl("stat-score");
const elRound = requireEl("stat-round");
const statLine = /** @type {HTMLElement} */ (document.querySelector(".play-top .stat-line"));

{
  const liveWrap = document.createElement("span");
  liveWrap.className = "stat-live";
  while (statLine.firstChild) liveWrap.appendChild(statLine.firstChild);
  const idle = document.createElement("span");
  idle.className = "stat-idle";
  idle.textContent = `${meta.sessionRounds ?? 10} rounds · adaptive`;
  statLine.append(idle, liveWrap);
  statLine.dataset.state = "idle";
}
function setStatState(state) { statLine.dataset.state = state; }
const btnRestart = requireEl("btn-restart");
const instructionsPanel = requireEl("instructions-panel");
const instructionsText = requireEl("instructions-text");
const btnStart = requireEl("btn-start-round");
const gameRoot = requireEl("game-root");
const resultPanel = requireEl("result-panel");
const resultTitle = requireEl("result-title");
const resultDetail = requireEl("result-detail");
const btnPlayAgain = requireEl("btn-play-again");
const playMain = /** @type {HTMLElement} */ (document.querySelector(".play-main"));

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

const timer = createElapsedTimer((sec) => { elTime.textContent = formatTime(sec); });

function updateScoreLabel() { elScore.textContent = String(totalScore); }
function updateRoundLabel() {
  elRound.textContent = `${session.round}/${TOTAL_ROUNDS}`;
}
function setScore(n) { totalScore = n; updateScoreLabel(); }
function addScore(delta) { setScore(totalScore + delta); }

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
  updateRoundLabel();
}

/**
 * @param {boolean} success
 * @param {number} [points]
 * @param {{ qualityFraction?: number, metrics?: Record<string, number | string | boolean | null> }} [opts]
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
  updateRoundLabel();

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
  if (session.finished) setStatState("done");
  resultTitle.textContent = title;
  let tail = "";
  if (session.finished && session.active && !sessionLogged) {
    sessionLogged = true;
    const rating = session.qualityMax > 0
      ? Math.round((session.qualityEarned / session.qualityMax) * 100)
      : 0;
    const prior = recordSessionAndCompare(meta.slug, { rating, wins: session.wins });
    if (prior && prior.priorCount > 0) {
      tail = ` Vs past runs on this device: higher than ${prior.percentile}% (${prior.priorCount} stored).`;
    } else {
      tail = " Baseline saved locally.";
    }
  }
  resultDetail.textContent = `${detail}${tail} Total: ${totalScore}.`;
  btnPlayAgain.textContent = session.finished
    ? (TOTAL_ROUNDS === 1 ? "Run again" : `New ${TOTAL_ROUNDS}-round session`)
    : "Next round";
  resultPanel.classList.remove("hidden");
}

function hideResult() { resultPanel.classList.add("hidden"); }

function renderFooterBlocks() {
  for (const id of ["construct-block", "privacy-block"]) {
    document.getElementById(id)?.remove();
  }

  const constructs = constructsForGame(meta.slug);
  if (constructs.length > 0) {
    const block = document.createElement("details");
    block.className = "details-block";
    block.id = "construct-block";
    block.innerHTML = `<summary>Cognitive constructs this targets</summary>`;

    const disclaimer = document.createElement("p");
    disclaimer.textContent = RESEARCH_DISCLAIMER;
    block.appendChild(disclaimer);

    const ul = document.createElement("ul");
    for (const c of constructs) {
      const li = document.createElement("li");
      const lead = document.createElement("strong");
      lead.textContent = c.label;
      li.append(lead, document.createTextNode(` — ${c.blurb} `));
      const cite = document.createElement("cite");
      cite.textContent = c.cite;
      li.appendChild(cite);
      ul.appendChild(li);
    }
    block.appendChild(ul);
    playMain.appendChild(block);
  }

  const privacy = document.createElement("details");
  privacy.className = "details-block";
  privacy.id = "privacy-block";
  const stats = cognitiveStorageStats();
  const line = stats.sessionRows === 0
    ? `No saved sessions yet. After you finish a ${TOTAL_ROUNDS}-round run, future runs can compare to your history on this device.`
    : `Local history: ${stats.sessionRows} saved session${stats.sessionRows === 1 ? "" : "s"} across ${stats.gamesWithSessions} game${stats.gamesWithSessions === 1 ? "" : "s"} (this browser only).`;
  privacy.innerHTML = `
    <summary>Privacy & local data</summary>
    <p>${line}</p>
    <p class="hint">Anonymous pageviews are sent to PostHog (us.i.posthog.com). No account, no personal data.</p>
    <button type="button" class="btn ghost small" data-clear>Clear local history</button>
  `;
  privacy.querySelector("[data-clear]")?.addEventListener("click", () => {
    if (!confirm("Remove all locally saved sessions and round logs? This cannot be undone.")) return;
    clearCognitiveLocalStorage();
    renderFooterBlocks();
  });
  playMain.appendChild(privacy);
}

/** @type {null | { restart: () => void, reset: () => void, destroy: () => void }} */
let current = null;

function startRoundNow() {
  hideResult();
  elTime.textContent = "0.00s";
  setStatState("active");
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
  renderFooterBlocks();
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
    resetTimerDisplay: () => { elTime.textContent = "0.00s"; },
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

btnStart.addEventListener("click", () => { startNewSession(); });

btnRestart.addEventListener("click", () => {
  timer.stop();
  elTime.textContent = "0.00s";
  setScore(0);
  resetSessionProgress();
  setStatState("idle");
  hideResult();
  btnPlayAgain.textContent = "Next round";
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
