/**
 * @typedef {import('./test-shell.js').TestOutcome} TestOutcome
 * @typedef {import('../tests-data.js').TestMeta} TestMeta
 */

const DOMAIN_LABELS = {
  memory: "Memory",
  attention: "Attention",
  inhibition: "Inhibition",
  spatial: "Spatial",
  speed: "Speed",
};

/**
 * Render the test report into a container. Replaces container contents.
 *
 * @param {HTMLElement} container
 * @param {TestMeta} test
 * @param {TestOutcome} outcome
 * @param {{ priorCount?: number, percentile?: number | null }} [compare]
 */
export function renderTestReport(container, test, outcome, compare) {
  container.innerHTML = "";

  const wrap = document.createElement("section");
  wrap.className = "test-report";

  const heading = document.createElement("h2");
  heading.className = "result-title";
  heading.textContent = `${test.title} — Report`;

  const overall = document.createElement("div");
  overall.className = "test-report-head";
  const score = document.createElement("span");
  score.className = "test-report-score";
  score.textContent = `${outcome.overall}/100`;
  const band = document.createElement("span");
  band.className = "test-report-band";
  band.textContent = outcome.band.label;
  overall.append(score, band);

  const domainGrid = document.createElement("div");
  domainGrid.className = "test-report-domains";
  for (const d of outcome.perDomain) {
    const card = document.createElement("article");
    card.className = "test-report-domain";
    const label = document.createElement("h3");
    label.textContent = DOMAIN_LABELS[d.domain] ?? d.domain;
    const val = document.createElement("p");
    val.className = "test-report-domain-score";
    val.textContent = `${d.score}/100`;
    const count = document.createElement("p");
    count.style.fontSize = "var(--text-xs)";
    count.style.color = "var(--text-dim)";
    count.textContent = `${d.stageCount} stage${d.stageCount === 1 ? "" : "s"}`;
    card.append(label, val, count);
    domainGrid.appendChild(card);
  }

  const stageList = document.createElement("ol");
  stageList.className = "test-report-stages";
  for (const s of outcome.stages) {
    const li = document.createElement("li");
    const head = document.createElement("strong");
    head.textContent = `${s.stage.note ?? s.stage.game} (d${s.stage.difficulty})`;
    const detail = document.createElement("span");
    detail.textContent = ` — ${Math.round(s.result.quality * 100)}% · ${s.result.summary ?? (s.result.success ? "pass" : "miss")}`;
    li.append(head, detail);
    stageList.appendChild(li);
  }

  const footer = document.createElement("p");
  footer.className = "result-detail";
  const parts = [`Total task points: ${outcome.totalPoints}.`];
  if (compare && typeof compare.percentile === "number" && (compare.priorCount ?? 0) > 0) {
    parts.push(`Higher than ${compare.percentile}% of your prior ${compare.priorCount} runs of this test.`);
  } else if (compare && compare.priorCount === 0) {
    parts.push("First run — saved as baseline for future comparisons.");
  }
  parts.push("Local device only. Educational, not clinical.");
  footer.textContent = parts.join(" ");

  wrap.append(heading, overall, domainGrid, stageList, footer);
  container.appendChild(wrap);
}
