import("./lib/analytics.js").catch(() => {});
import { RESEARCH_DISCLAIMER } from "./cognitive-constructs.js";
import { CATEGORIES, GAMES, gamesForFilter } from "./games-data.js";
import { TESTS } from "./tests-data.js";
import { clearCognitiveLocalStorage, cognitiveStorageStats } from "./lib/cognitive-telemetry.js";
import { requireEl } from "./lib/dom.js";

const researchDisclaimerEl = document.getElementById("research-disclaimer");
if (researchDisclaimerEl) researchDisclaimerEl.textContent = RESEARCH_DISCLAIMER;

const filterRoot = requireEl("filter-chips");
const listRoot = requireEl("games-stage");
const modeTabs = requireEl("mode-tabs");
const btnClear = requireEl("btn-clear-local");
const privacyLine = requireEl("telemetry-privacy-line");

const categoryShort = new Map(CATEGORIES.map((item) => [item.id, item.short]));
const gameIcon = new Map(GAMES.map((g) => [g.slug, g.icon]));

/** @type {'games' | 'tests'} */
let mode = "games";
/** @type {'all' | import('./games-data.js').CategoryId} */
let activeFilter = "all";

function renderTabs() {
  for (const btn of modeTabs.querySelectorAll("button")) {
    btn.setAttribute("aria-pressed", btn.dataset.mode === mode ? "true" : "false");
  }
}

function renderChips() {
  filterRoot.innerHTML = "";
  if (mode !== "games") { filterRoot.hidden = true; return; }
  filterRoot.hidden = false;

  const items = [{ id: "all", label: "All" }, ...CATEGORIES.map((c) => ({ id: c.id, label: c.short }))];
  for (const item of items) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = item.label;
    chip.setAttribute("aria-pressed", activeFilter === item.id ? "true" : "false");
    chip.addEventListener("click", () => setFilter(/** @type {any} */ (item.id)));
    filterRoot.appendChild(chip);
  }
}

/** @param {'all' | import('./games-data.js').CategoryId} next */
function setFilter(next) {
  activeFilter = next;
  renderChips();
  renderList();
}

/** @param {'games' | 'tests'} next */
function setMode(next) {
  if (mode === next) return;
  mode = next;
  renderTabs();
  renderChips();
  renderList();
}

for (const btn of modeTabs.querySelectorAll("button")) {
  btn.addEventListener("click", () => setMode(/** @type {any} */ (btn.dataset.mode)));
}

function makeCard({ title, meta, description, href, glyph = "◇", actionLabel = "Play", index = 0 }) {
  const card = document.createElement("a");
  card.className = "card";
  card.href = href;
  card.setAttribute("aria-label", `${actionLabel} ${title}`);
  card.style.setProperty("--row-delay", `${Math.min(index * 38, 280)}ms`);

  const g = document.createElement("span");
  g.className = "card-glyph";
  g.setAttribute("aria-hidden", "true");
  g.textContent = glyph;

  const h = document.createElement("h3");
  h.className = "card-title";
  h.textContent = title;

  const m = document.createElement("p");
  m.className = "card-meta";
  m.textContent = meta;

  const d = document.createElement("p");
  d.className = "card-desc";
  d.textContent = description;

  const foot = document.createElement("span");
  foot.className = "card-foot";
  foot.setAttribute("aria-hidden", "true");
  foot.textContent = "→";

  card.append(g, h, m, d, foot);
  return card;
}

function gamesForActiveFilter() {
  return [...gamesForFilter(activeFilter)].sort((a, b) => a.title.localeCompare(b.title));
}

function renderList() {
  listRoot.innerHTML = "";
  listRoot.classList.remove("featured");

  if (mode === "tests") {
    if (TESTS.length === 0) {
      const empty = document.createElement("p");
      empty.className = "card-desc";
      empty.textContent = "No tests yet.";
      listRoot.appendChild(empty);
      return;
    }
    if (TESTS.length === 1) listRoot.classList.add("featured");
    TESTS.forEach((t, i) =>
      listRoot.appendChild(makeCard({
        title: t.title,
        meta: `Test · ${t.estimatedTime} · ${t.stages.length} stages`,
        description: t.description,
        href: `tests/${encodeURIComponent(t.slug)}.html`,
        glyph: t.icon || "◈",
        actionLabel: "Run",
        index: i,
      })),
    );
    return;
  }

  const games = gamesForActiveFilter();
  if (games.length === 0) {
    const empty = document.createElement("p");
    empty.className = "card-desc";
    empty.textContent = "No games in this track.";
    listRoot.appendChild(empty);
    return;
  }
  games.forEach((g, i) =>
    listRoot.appendChild(makeCard({
      title: g.title,
      meta: `${categoryShort.get(g.category) ?? g.category} · ${g.roundLength}`,
      description: g.description,
      href: `games/${encodeURIComponent(g.slug)}.html`,
      glyph: gameIcon.get(g.slug) || "◇",
      actionLabel: "Play",
      index: i,
    })),
  );
}

function renderPrivacyLine() {
  const stats = cognitiveStorageStats();
  const parts = [];
  if (stats.sessionRows > 0) parts.push(`${stats.sessionRows} game session${stats.sessionRows === 1 ? "" : "s"} across ${stats.gamesWithSessions} game${stats.gamesWithSessions === 1 ? "" : "s"}`);
  if (stats.testRows > 0) parts.push(`${stats.testRows} test run${stats.testRows === 1 ? "" : "s"} across ${stats.testsWithRuns} test${stats.testsWithRuns === 1 ? "" : "s"}`);
  privacyLine.textContent = parts.length === 0
    ? "No saved runs yet. Future sessions will be comparable to these on this device only."
    : `Local history: ${parts.join(", ")}. This browser only.`;
}

btnClear.addEventListener("click", () => {
  if (!confirm("Remove all locally saved sessions and test runs? This cannot be undone.")) return;
  clearCognitiveLocalStorage();
  renderPrivacyLine();
});

renderTabs();
renderChips();
renderList();
renderPrivacyLine();
