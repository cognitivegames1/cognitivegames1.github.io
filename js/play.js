import { GAMES } from "./games-data.js";
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
document.getElementById("play-title").textContent = meta.title;
document.documentElement.style.setProperty("--game-accent", meta.accent);

const elTime = document.getElementById("stat-time");
const elScore = document.getElementById("stat-score");
const btnRestart = document.getElementById("btn-restart");
const instructionsPanel = document.getElementById("instructions-panel");
const instructionsText = document.getElementById("instructions-text");
const btnStart = document.getElementById("btn-start-round");
const gameRoot = document.getElementById("game-root");
const resultPanel = document.getElementById("result-panel");
const resultTitle = document.getElementById("result-title");
const resultDetail = document.getElementById("result-detail");
const btnPlayAgain = document.getElementById("btn-play-again");

const TOTAL_ROUNDS = 10;
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

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

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

function resetSessionProgress() {
  session.round = 0;
  session.difficulty = MIN_DIFFICULTY;
  session.qualityEarned = 0;
  session.qualityMax = 0;
  session.wins = 0;
  session.active = false;
  session.finished = false;
  updateScoreLabel();
}

function recordRound(success, points = 0) {
  const levelUsed = session.difficulty;

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

  if (success) {
    session.wins += 1;
    session.qualityEarned += levelUsed;
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
  resultDetail.textContent = `${detail} Total score: ${totalScore}.`;
  btnPlayAgain.textContent = session.finished ? "Start new 10-round session" : "Next round";
  resultPanel.classList.remove("hidden");
}

function hideResult() {
  resultPanel.classList.add("hidden");
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
    "chess-glance": () => import("./games/chess-glance.js"),
    "piece-recall": () => import("./games/piece-recall.js"),
    "sequence-echo": () => import("./games/sequence-echo.js"),
    "pattern-grid": () => import("./games/pattern-grid.js"),
    "n-back-grid": () => import("./games/n-back-grid.js"),
    "icon-back": () => import("./games/icon-back.js"),
    "reverse-echo": () => import("./games/reverse-echo.js"),
    "pair-recall": () => import("./games/pair-recall.js"),
    "path-memory": () => import("./games/path-memory.js"),
    "number-sweep": () => import("./games/number-sweep.js"),
    "color-word-clash": () => import("./games/color-word-clash.js"),
    "reaction-gate": () => import("./games/reaction-gate.js"),
    "target-count": () => import("./games/target-count.js"),
  };

  const load = loaders[/** @type {keyof typeof loaders} */ (meta.slug)];
  if (!load) {
    window.location.href = lobbyHref;
    return;
  }

  const mod = await load();
  instructionsText.innerHTML = mod.instructionsHtml;
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
