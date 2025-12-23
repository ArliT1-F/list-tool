
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
    document.querySelectorAll(".tabs button").forEach(b => {
        b.classList.remove("active");
        b.setAttribute('aria-selected', 'false');
    });
    document.getElementById(id).classList.remove("hidden");
    const activeTab = document.querySelector(`.tabs button[data-tab="${id}"]`);
    activeTab.classList.add("active");
    activeTab.setAttribute('aria-selected', 'true');
}

// Copy to Clipboard
function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('copied');
        }, 1500);
    });
}

// Render Diff Block
function renderBlock(title, items, className) {
    const count = items.length;
    const id = `block-${Math.random().toString(36).substr(2, 9)}`;
    const content = count > 0 
        ? items.join("\n") 
        : '<span class="empty">No items</span>';
    
    let countClass = 'count-zero';
    if (count > 0) {
        if (className === 'diff-missing') countClass = 'count-red';
        else if (className === 'diff-only') countClass = 'count-blue';
        else if (className === 'diff-common') countClass = 'count-green';
    }
    
    return `
        <div class="diff-block">
            <div class="diff-header">
                <div class="diff-title">
                    <span class="diff-count ${countClass}">${count}</span>
                    ${title}
                </div>
                ${count > 0 ? `<button class="copy-btn" onclick="copyToClipboard(\`${items.join('\\n')}\`, this)">📋 Copy</button>` : ''}
            </div>
            <div class="diff-list ${className}">${content}</div>
        </div>
    `;
}

// Validation
function validate() {
    const A = parseList(listA.value);
    const B = parseList(listB.value);
    
    if (A.size === 0 && B.size === 0) {
        validationMsg.textContent = '⚠️ Please enter items in at least List A and List B to compare.';
        validationMsg.classList.remove('hidden');
        return false;
    }
    
    if (A.size === 0 || B.size === 0) {
        validationMsg.textContent = '⚠️ Both List A and List B need to have at least one item.';
        validationMsg.classList.remove('hidden');
        return false;
    }
    
    validationMsg.classList.add('hidden');
    return true;
}

// Main Process Function
function processLists() {
    if (!validate()) {
        resultsEl.classList.add('hidden');
        return;
    }

    const A = parseList(listA.value);
    const B = parseList(listB.value);
    const C = parseList(listC.value);
    const names = getNames();

    updateAllCounts();
    resultsEl.classList.remove('hidden');

    // SUMMARY
    const totalUnique = new Set([...A, ...B, ...C]).size;
    summaryEl.innerHTML = `
        <div style="line-height: 1.8;">
            <strong>📊 Overview</strong><br>
            ${names.a}: <strong>${A.size}</strong> unique items<br>
            ${names.b}: <strong>${B.size}</strong> unique items<br>
            ${C.size ? `${names.c}: <strong>${C.size}</strong> unique items<br>` : ''}
            <br>
            <strong>🔢 Totals</strong><br>
            Combined unique items: <strong>${totalUnique}</strong><br>
            Common in ${names.a} & ${names.b}: <strong>${intersect(A, B).length}</strong>
            ${C.size ? `<br>Common in all three: <strong>${[...A].filter(x => B.has(x) && C.has(x)).length}</strong>` : ''}
        </div>
    `;

    // DIFFS
    diffsEl.innerHTML = `
        ${renderBlock(`🟥 In ${names.a} but not in ${names.b}`, diff(A, B), "diff-missing")}
        ${renderBlock(`🟦 In ${names.b} but not in ${names.a}`, diff(B, A), "diff-only")}
        ${C.size ? renderBlock(`🟥 In ${names.a} but not in ${names.c}`, diff(A, C), "diff-missing") : ""}
        ${C.size ? renderBlock(`🟦 In ${names.c} but not in ${names.a}`, diff(C, A), "diff-only") : ""}
        ${C.size ? renderBlock(`🟥 In ${names.b} but not in ${names.c}`, diff(B, C), "diff-missing") : ""}
        ${C.size ? renderBlock(`🟦 In ${names.c} but not in ${names.b}`, diff(C, B), "diff-only") : ""}
    `;

    // COMMON
    commonEl.innerHTML = `
        ${renderBlock(`🟩 Common in ${names.a} & ${names.b}`, intersect(A, B), "diff-common")}
        ${C.size ? renderBlock(`🟩 Common in ${names.a} & ${names.c}`, intersect(A, C), "diff-common") : ""}
        ${C.size ? renderBlock(`🟩 Common in ${names.b} & ${names.c}`, intersect(B, C), "diff-common") : ""}
        ${C.size ? renderBlock(`🟩 Common in ${names.a}, ${names.b} & ${names.c}`, [...A].filter(x => B.has(x) && C.has(x)), "diff-common") : ""}
    `;

    showTab("summary");
    
    // Scroll to results
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Clear Functions
function clearList(id) {
    document.getElementById(id).value = '';
    updateAllCounts();
}

function clearAll() {
    listA.value = '';
    listB.value = '';
    listC.value = '';
    updateAllCounts();
    resultsEl.classList.add('hidden');
    validationMsg.classList.add('hidden');
}

// Event Listeners
listA.addEventListener('input', () => updateLiveCount(listA, countA));
listB.addEventListener('input', () => updateLiveCount(listB, countB));
listC.addEventListener('input', () => updateLiveCount(listC, countC));

document.getElementById('compareBtn').addEventListener('click', processLists);
document.getElementById('clearAllBtn').addEventListener('click', clearAll);

// Tab click handlers
document.querySelectorAll('.tabs button').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
});

// Keyboard shortcut: Ctrl+Enter to compare
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        processLists();
    }
});

// Initialize counts on load
updateAllCounts();