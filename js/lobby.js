import { CATEGORIES, gamesInCategory } from "./games-data.js";
import "./posthog.js";

const filterRoot = document.getElementById("filter-chips");
const sectionsRoot = document.getElementById("category-sections");

/** @type {'all' | import('./games-data.js').CategoryId} */
let activeFilter = "all";

function renderChips() {
  filterRoot.innerHTML = "";
  const all = document.createElement("button");
  all.type = "button";
  all.className = "chip";
  all.textContent = "All";
  all.setAttribute("aria-pressed", activeFilter === "all" ? "true" : "false");
  all.addEventListener("click", () => setFilter("all"));
  filterRoot.appendChild(all);

  for (const c of CATEGORIES) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = c.label;
    b.setAttribute("aria-pressed", activeFilter === c.id ? "true" : "false");
    b.addEventListener("click", () => setFilter(c.id));
    filterRoot.appendChild(b);
  }
}

/**
 * @param {'all' | import('./games-data.js').CategoryId} f
 */
function setFilter(f) {
  activeFilter = f;
  renderChips();
  renderSections();
}

function renderSections() {
  sectionsRoot.innerHTML = "";

  const cats =
    activeFilter === "all"
      ? CATEGORIES.map((c) => c.id)
      : [activeFilter];

  for (const catId of cats) {
    const games = gamesInCategory(catId);
    if (games.length === 0) continue;

    const cat = CATEGORIES.find((c) => c.id === catId);
    const section = document.createElement("section");
    section.className = "category-block";
    section.id = `cat-${catId}`;

    const h2 = document.createElement("h2");
    h2.textContent = cat?.label ?? catId;
    section.appendChild(h2);

    const grid = document.createElement("div");
    grid.className = "card-grid";

    for (const g of games) {
      const card = document.createElement("article");
      card.className = "game-card";
      card.style.setProperty("--card-accent", g.accent);

      const inner = document.createElement("div");
      inner.className = "game-card-inner";

      const icon = document.createElement("div");
      icon.className = "icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = g.icon;

      const title = document.createElement("h3");
      title.textContent = g.title;

      const desc = document.createElement("p");
      desc.textContent = g.description;

      const meta = document.createElement("div");
      meta.className = "meta-row";

      const d = document.createElement("span");
      d.className = "pill";
      d.textContent = g.difficulty;

      const len = document.createElement("span");
      len.className = "pill accent";
      len.style.setProperty("--card-accent", g.accent);
      len.textContent = g.roundLength;

      meta.append(d, len);

      const link = document.createElement("a");
      link.className = "cta";
      link.href = `games/${encodeURIComponent(g.slug)}.html`;
      link.textContent = "Play now →";

      inner.append(icon, title, desc, meta, link);
      card.appendChild(inner);
      grid.appendChild(card);
    }

    section.appendChild(grid);
    sectionsRoot.appendChild(section);
  }

  if (sectionsRoot.childElementCount === 0) {
    const empty = document.createElement("p");
    empty.className = "hero";
    empty.style.paddingTop = "0.5rem";
    empty.style.color = "var(--text-muted)";
    empty.textContent =
      "No games in this category yet. Try “All” or another bucket.";
    sectionsRoot.appendChild(empty);
  }
}

renderChips();
renderSections();
