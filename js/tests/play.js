import("../lib/analytics.js").catch(() => {});
import { findTest } from "../tests-data.js";
import { runTest } from "./test-shell.js";
import { renderTestReport } from "./test-results.js";
import { recordTestAndCompare } from "../lib/cognitive-telemetry.js";
import { requireEl } from "../lib/dom.js";
import { createElapsedTimer, formatTime } from "../lib/timer.js";

const datasetSlug = document.documentElement.dataset.testSlug?.trim() || null;
const params = new URLSearchParams(window.location.search);
const slugFromQuery = params.get("test");
const pathParts = window.location.pathname.split("/").filter(Boolean);
const pageName = pathParts[pathParts.length - 1] || "";
const slugFromPath = pageName.endsWith(".html") ? decodeURIComponent(pageName.slice(0, -5)) : null;
const slug = datasetSlug || slugFromQuery || slugFromPath;
const test = slug ? findTest(slug) : null;
const lobbyHref = document.documentElement.dataset.lobbyHref || "../index.html";

if (!test) {
  window.location.href = lobbyHref;
  throw new Error("Unknown test slug");
}

document.title = `${test.title} - Cognitive Games`;
requireEl("play-title").textContent = test.title;

const elTime = requireEl("stat-time");
const elStage = requireEl("stat-stage");
const statLine = /** @type {HTMLElement} */ (document.querySelector(".play-top .stat-line"));

{
  const liveWrap = document.createElement("span");
  liveWrap.className = "stat-live";
  while (statLine.firstChild) liveWrap.appendChild(statLine.firstChild);
  const idle = document.createElement("span");
  idle.className = "stat-idle";
  idle.textContent = `${test.stages.length} stages · ${test.estimatedTime}`;
  statLine.append(idle, liveWrap);
  statLine.dataset.state = "idle";
}
function setStatState(state) { statLine.dataset.state = state; }
const btnStart = requireEl("btn-start-test");
const btnRestart = requireEl("btn-restart");
const instructionsPanel = requireEl("instructions-panel");
const instructionsText = requireEl("instructions-text");
const testRoot = requireEl("test-root");
const resultPanel = requireEl("result-panel");
const resultBody = requireEl("result-body");
const btnPlayAgain = requireEl("btn-play-again");

instructionsText.innerHTML = `
  <p>${test.description}</p>
  <p class="test-stages-hint">
    ${test.stages.map((s) => `<span class="test-stage-chip">${s.note ?? s.game} <em>d${s.difficulty}</em></span>`).join("")}
  </p>
  <p>${test.estimatedTime} · ${test.stages.length} stages · fixed difficulty.</p>
`;

const timer = createElapsedTimer((sec) => {
  elTime.textContent = formatTime(sec);
});

let running = false;
let cancelled = false;
let stageIdx = 0;

function updateStageLabel() {
  elStage.textContent = `${stageIdx}/${test.stages.length}`;
}
updateStageLabel();

function resetUi() {
  timer.stop();
  elTime.textContent = "0.00s";
  stageIdx = 0;
  updateStageLabel();
  setStatState("idle");
  testRoot.innerHTML = "";
  resultPanel.classList.add("hidden");
}

async function startTest() {
  if (running) return;
  running = true;
  cancelled = false;
  instructionsPanel.classList.add("hidden");
  resultPanel.classList.add("hidden");
  testRoot.innerHTML = "";
  stageIdx = 0;
  updateStageLabel();
  setStatState("active");
  timer.stop();
  elTime.textContent = "0.00s";
  timer.start();

  const outcome = await runTest(testRoot, test, {
    isActive: () => !cancelled,
    onStage: (i, total) => {
      stageIdx = i + 1;
      elStage.textContent = `${stageIdx}/${total}`;
    },
  });

  running = false;
  timer.stop();

  if (!outcome) {
    testRoot.innerHTML = "";
    instructionsPanel.classList.remove("hidden");
    return;
  }

  const compare = recordTestAndCompare(test.slug, { overall: outcome.overall });
  testRoot.innerHTML = "";
  setStatState("done");
  renderTestReport(resultBody, test, outcome, compare ?? { priorCount: 0 });
  resultPanel.classList.remove("hidden");
  btnPlayAgain.textContent = "Run again";
}

btnStart.addEventListener("click", () => {
  void startTest();
});

btnRestart.addEventListener("click", () => {
  cancelled = true;
  running = false;
  resetUi();
  instructionsPanel.classList.remove("hidden");
});

btnPlayAgain.addEventListener("click", () => {
  cancelled = true;
  running = false;
  resetUi();
  void startTest();
});
