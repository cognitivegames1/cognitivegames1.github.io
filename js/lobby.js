import { RESEARCH_DISCLAIMER } from "./cognitive-constructs.js";
import { CATEGORIES, gamesForFilter } from "./games-data.js";
import { requireEl } from "./lib/dom.js";
import "./posthog.js";

const researchDisclaimerEl = document.getElementById("research-disclaimer");
if (researchDisclaimerEl) {
  researchDisclaimerEl.textContent = RESEARCH_DISCLAIMER;
}

const filterRoot = requireEl("filter-chips");
const gamesRoot = requireEl("games-stage");
const deckCopy = requireEl("deck-copy");
const heroGameCount = requireEl("hero-game-count");
const heroCategoryCount = requireEl("hero-category-count");
const categoryLabel = new Map(CATEGORIES.map((item) => [item.id, item.label]));

/** @type {'all' | import('./games-data.js').CategoryId} */
let activeFilter = "all";
function labelForFilter() {
  if (activeFilter === "all") return "all tracks";
  return categoryLabel.get(activeFilter) ?? "selected track";
}

function renderChips() {
  filterRoot.innerHTML = "";

  const all = document.createElement("button");
  all.type = "button";
  all.className = "chip";
  all.textContent = "All";
  all.setAttribute("aria-pressed", activeFilter === "all" ? "true" : "false");
  all.addEventListener("click", () => setFilter("all"));
  filterRoot.appendChild(all);

  for (const category of CATEGORIES) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = category.label;
    chip.setAttribute("aria-pressed", activeFilter === category.id ? "true" : "false");
    chip.addEventListener("click", () => setFilter(category.id));
    filterRoot.appendChild(chip);
  }
}

/**
 * @param {'all' | import('./games-data.js').CategoryId} next
 */
function setFilter(next) {
  activeFilter = next;
  renderChips();
  renderDeck();
}

function makeMetaTag(text, accent = false) {
  const tag = document.createElement("span");
  tag.className = `rail-meta-tag${accent ? " accent" : ""}`;
  tag.textContent = text;
  return tag;
}

function makeRailCard(game, index) {
  const card = document.createElement("article");
  card.className = "rail-card";
  card.style.setProperty("--card-accent", game.accent);
  card.style.setProperty("--card-delay", `${Math.min(index * 42, 360)}ms`);

  const top = document.createElement("div");
  top.className = "rail-top";

  const icon = document.createElement("span");
  icon.className = "rail-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = game.icon;

  const badges = document.createElement("div");
  badges.className = "rail-badges";
  badges.append(
    makeMetaTag(categoryLabel.get(game.category) ?? game.category),
    makeMetaTag(game.roundLength, true),
  );
  top.append(icon, badges);

  const title = document.createElement("h3");
  title.className = "rail-title";
  title.textContent = game.title;

  const description = document.createElement("p");
  description.className = "rail-description";
  description.textContent = game.description;

  const foot = document.createElement("div");
  foot.className = "rail-foot";

  const difficulty = document.createElement("span");
  difficulty.className = "rail-difficulty";
  difficulty.textContent = game.difficulty;

  const action = document.createElement("a");
  action.className = "card-link";
  action.href = `games/${encodeURIComponent(game.slug)}.html`;
  action.textContent = "Play";
  action.setAttribute("aria-label", `Play ${game.title}`);
  action.title = `Play ${game.title}`;

  foot.append(difficulty, action);
  card.append(top, title, description, foot);
  return card;
}

function makeGamesGrid(games) {
  const track = document.createElement("div");
  track.className = "rail-track";
  track.setAttribute("role", "list");

  for (const [index, game] of games.entries()) {
    const card = makeRailCard(game, index);
    card.setAttribute("role", "listitem");
    track.appendChild(card);
  }

  return track;
}

function gamesForActiveFilter() {
  return [...gamesForFilter(activeFilter)].sort((left, right) => {
    const leftCategory = categoryLabel.get(left.category) ?? left.category;
    const rightCategory = categoryLabel.get(right.category) ?? right.category;
    const byCategory = rightCategory.localeCompare(leftCategory);
    if (byCategory !== 0) return byCategory;
    return left.title.localeCompare(right.title);
  });
}

function renderDeck() {
  gamesRoot.innerHTML = "";
  const games = gamesForActiveFilter();
  const allGamesCount = gamesForFilter("all").length;
  const activeCategoryCount = activeFilter === "all" ? CATEGORIES.length : 1;

  heroGameCount.textContent = `${allGamesCount} game${allGamesCount === 1 ? "" : "s"}`;
  heroCategoryCount.textContent = `${activeCategoryCount} categor${activeCategoryCount === 1 ? "y" : "ies"} active`;

  if (games.length === 0) {
    const empty = document.createElement("p");
    empty.className = "deck-empty";
    empty.textContent = "No games in this track yet. Try another filter.";
    gamesRoot.appendChild(empty);
    deckCopy.textContent = "No games match the current filter.";
    return;
  }

  deckCopy.textContent = `Showing ${games.length} game${games.length === 1 ? "" : "s"} in ${labelForFilter()}, sorted by category.`;
  gamesRoot.appendChild(makeGamesGrid(games));
}

renderChips();
renderDeck();
