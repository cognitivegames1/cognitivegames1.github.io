/**
 * @param {HTMLElement} container
 * @param {number} size
 * @param {{ interactive?: boolean, onTileClick?: (index: number) => void }} options
 */
export function createTileGrid(container, size, options = {}) {
  const { interactive = false, onTileClick } = options;
  container.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "tile-grid";
  grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

  /** @type {HTMLButtonElement[]} */
  const tiles = [];

  const n = size * size;
  for (let i = 0; i < n; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tile";
    btn.dataset.index = String(i);
    btn.disabled = !interactive;
    if (interactive) {
      btn.classList.add("interactive");
      btn.addEventListener("click", () => onTileClick?.(i));
    }
    tiles.push(btn);
    grid.appendChild(btn);
  }

  container.appendChild(grid);
  return { grid, tiles };
}
