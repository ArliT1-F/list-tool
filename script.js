
// DOM Elements
const listA = document.getElementById('listA');
const listB = document.getElementById('listB');
const listC = document.getElementById('listC');
const nameA = document.getElementById('nameA');
const nameB = document.getElementById('nameB');
const nameC = document.getElementById('nameC');
const countA = document.getElementById('countA');
const countB = document.getElementById('countB');
const countC = document.getElementById('countC');
const resultsEl = document.getElementById('results');
const summaryEl = document.getElementById('summary');
const diffsEl = document.getElementById('diffs');
const commonEl = document.getElementById('common');
const validationMsg = document.getElementById('validationMsg');

// Get list names
function getNames() {
    return {
        a: nameA.value.trim() || 'List A',
        b: nameB.value.trim() || 'List B',
        c: nameC.value.trim() || 'List C'
    };
}

// Utility Functions
function normalizeLine(line) {
  return line
    .toUpperCase()
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();
    return line.trim().replace(/\s+/g, " ").toUpperCase();
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

// Real-time count updates
function updateLiveCount(textarea, countEl) {
    const set = parseList(textarea.value);
    const count = set.size;
    countEl.textContent = `${count} ${count === 1 ? 'entry' : 'entries'}`;
    countEl.classList.toggle('has-items', count > 0);
}

function updateAllCounts() {
    updateLiveCount(listA, countA);
    updateLiveCount(listB, countB);
    updateLiveCount(listC, countC);
}

// Tab Management
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

