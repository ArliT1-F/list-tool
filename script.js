function normalizeLine(line) {
  return line
    .toUpperCase()
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseList(text) {
  return new Set(
    text
      .split(/\r?\n/)
      .map(normalizeLine)
      .filter(Boolean)
  );
}

function diff(a, b) {
  return [...a].filter(x => !b.has(x));
}

function intersect(a, b) {
  return [...a].filter(x => b.has(x));
}

function updateCounts(A, B, C) {
  document.getElementById("countA").textContent = `${A.size} entries`;
  document.getElementById("countB").textContent = `${B.size} entries`;
  document.getElementById("countC").textContent = `${C.size} entries`;
}

function showTab(id) {
  document.querySelectorAll(".tab-content").forEach(t => t.classList.add("hidden"));
  document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
  document.getElementById(id).classList.remove("hidden");
  document.querySelector(`.tabs button[onclick*="${id}"]`).classList.add("active");
}

function processLists() {
  const A = parseList(listA.value);
  const B = parseList(listB.value);
  const C = parseList(listC.value);

  updateCounts(A, B, C);

  document.getElementById("results").classList.remove("hidden");

  summary.textContent =
    `List A: ${A.size}\nList B: ${B.size}` +
    (C.size ? `\nList C: ${C.size}` : "");

  diffs.textContent =
    `A → B:\n${diff(A, B).join("\n") || "—"}\n\n` +
    `B → A:\n${diff(B, A).join("\n") || "—"}` +
    (C.size ? `\n\nA → C:\n${diff(A, C).join("\n") || "—"}` : "");

  common.textContent =
    `A ∩ B:\n${intersect(A, B).join("\n") || "—"}` +
    (C.size ? `\n\nA ∩ C:\n${intersect(A, C).join("\n") || "—"}` : "");

  showTab("summary");
}
