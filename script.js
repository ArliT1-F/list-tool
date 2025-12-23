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

function renderBlock(title, items, cssClass) {
  return `
    <div class="diff-block">
      <div class="diff-title">${title}</div>
      <div class="diff-list" ${cssClass}">
        ${items.length ? items.join("<br>") : "<span class='empty'>- none -</span>"}
      </div>
    </div>
  `;
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

  diffs.innerHTML = `
    ${renderBlock(
      "🟥 In A but not in B",
      diff(A, B),
      "diff-missing"
    )}

    ${renderBlock(
      "🟦 In B but not in A",
      diff(B, A),
      "diff-only"
    )}

    ${
      C.size
        ? renderBlock(
            "🟥 In A but not in C",
            diff(A, C),
            "diff-missing"
          )
        : ""
    }
  `;
  
  common.innerHTML = `
    ${renderBlock(
      "🟩 Common in A & B",
      intersect(A, B),
      "diff-common"
    )}

    ${
      C.size
        ? renderBlock(
            "🟩 Common in A & C",
            intersect(A, C),
            "diff-common"
          )
        : ""
    }
  `;

  showTab("summary");
}

