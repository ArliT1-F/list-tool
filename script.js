const STORAGE_KEY = "list-tool-state-v2";
const AUTO_COMPARE_DEBOUNCE_MS = 350;

// DOM Elements
const listA = document.getElementById("listA");
const listB = document.getElementById("listB");
const listC = document.getElementById("listC");
const nameA = document.getElementById("nameA");
const nameB = document.getElementById("nameB");
const nameC = document.getElementById("nameC");
const countA = document.getElementById("countA");
const countB = document.getElementById("countB");
const countC = document.getElementById("countC");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const diffsEl = document.getElementById("diffs");
const commonEl = document.getElementById("common");
const validationMsg = document.getElementById("validationMsg");
const ignoreCaseEl = document.getElementById("ignoreCase");
const ignoreCommasEl = document.getElementById("ignoreCommas");
const normalizeWhitespaceEl = document.getElementById("normalizeWhitespace");
const autoCompareEl = document.getElementById("autoCompare");
const exportBtn = document.getElementById("exportBtn");
const swapBtn = document.getElementById("swapBtn");
const sampleBtn = document.getElementById("sampleBtn");

const state = {
    activeTab: "summary",
    autoCompareTimer: null,
    exportText: {
        summary: "",
        diffs: "",
        common: ""
    }
};

function getNames() {
    return {
        a: nameA.value.trim() || "List A",
        b: nameB.value.trim() || "List B",
        c: nameC.value.trim() || "List C"
    };
}

function getSettings() {
    return {
        ignoreCase: ignoreCaseEl.checked,
        ignoreCommas: ignoreCommasEl.checked,
        normalizeWhitespace: normalizeWhitespaceEl.checked,
        autoCompare: autoCompareEl.checked
    };
}

function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function normalizeLine(line, settings) {
    let normalized = line.trim();
    if (!normalized) {
        return "";
    }

    if (settings.normalizeWhitespace) {
        normalized = normalized.replace(/\s+/g, " ");
    }
    if (settings.ignoreCommas) {
        normalized = normalized.replace(/,/g, "");
    }
    if (settings.ignoreCase) {
        normalized = normalized.toUpperCase();
    }

    return normalized.trim();
}

function parseList(text, settings) {
    const parsed = new Map();

    text.split(/\r?\n/).forEach((rawLine) => {
        const trimmed = rawLine.trim();
        if (!trimmed) {
            return;
        }

        const key = normalizeLine(trimmed, settings);
        if (key && !parsed.has(key)) {
            parsed.set(key, trimmed);
        }
    });

    return parsed;
}

function diff(a, b) {
    return [...a].filter((item) => !b.has(item));
}

function intersect(a, b) {
    return [...a].filter((item) => b.has(item));
}

function toDisplayItems(keys, ...maps) {
    const result = [];
    keys.forEach((key) => {
        const sourceMap = maps.find((listMap) => listMap.has(key));
        result.push(sourceMap ? sourceMap.get(key) : key);
    });
    return result.sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
}

function updateLiveCount(textarea, countEl) {
    const count = parseList(textarea.value, getSettings()).size;
    countEl.textContent = `${count} ${count === 1 ? "entry" : "entries"}`;
    countEl.classList.toggle("has-items", count > 0);
}

function updateAllCounts() {
    updateLiveCount(listA, countA);
    updateLiveCount(listB, countB);
    updateLiveCount(listC, countC);
}

function showTab(id) {
    state.activeTab = id;
    document.querySelectorAll(".tab-content").forEach((panel) => panel.classList.add("hidden"));
    document.querySelectorAll(".tabs button").forEach((btn) => {
        btn.classList.remove("active");
        btn.setAttribute("aria-selected", "false");
    });

    document.getElementById(id).classList.remove("hidden");
    const activeTab = document.querySelector(`.tabs button[data-tab="${id}"]`);
    if (activeTab) {
        activeTab.classList.add("active");
        activeTab.setAttribute("aria-selected", "true");
    }
}

async function copyToClipboard(text, btn) {
    const originalText = btn.textContent;
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            const helper = document.createElement("textarea");
            helper.value = text;
            helper.setAttribute("readonly", "true");
            helper.style.position = "absolute";
            helper.style.left = "-9999px";
            document.body.appendChild(helper);
            helper.select();
            document.execCommand("copy");
            helper.remove();
        }

        btn.textContent = "✓ Copied!";
        btn.classList.add("copied");
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove("copied");
        }, 1500);
    } catch (_error) {
        btn.textContent = "⚠️ Copy failed";
        setTimeout(() => {
            btn.textContent = originalText;
        }, 1500);
    }
}

function getCountClass(className, count) {
    if (count === 0) {
        return "count-zero";
    }
    if (className === "diff-missing") {
        return "count-red";
    }
    if (className === "diff-only") {
        return "count-blue";
    }
    return "count-green";
}

function renderBlock(title, items, className) {
    const count = items.length;
    const payload = encodeURIComponent(items.join("\n"));
    const safeContent = count > 0
        ? items.map((item) => escapeHtml(item)).join("\n")
        : '<span class="empty">No items</span>';
    const countClass = getCountClass(className, count);

    return `
        <article class="diff-block">
            <div class="diff-header">
                <h3 class="diff-title">
                    <span class="diff-count ${countClass}">${count}</span>
                    ${escapeHtml(title)}
                </h3>
                ${count > 0 ? `<button type="button" class="copy-btn" data-copy="${payload}">📋 Copy</button>` : ""}
            </div>
            <div class="diff-list ${className}">${safeContent}</div>
        </article>
    `;
}

function validate() {
    const settings = getSettings();
    const names = getNames();
    const hasA = parseList(listA.value, settings).size > 0;
    const hasB = parseList(listB.value, settings).size > 0;

    if (!hasA && !hasB) {
        validationMsg.textContent = `⚠️ Please add at least one item to ${names.a} and ${names.b}.`;
        validationMsg.classList.remove("hidden");
        return false;
    }

    if (!hasA || !hasB) {
        validationMsg.textContent = `⚠️ ${names.a} and ${names.b} both need at least one item.`;
        validationMsg.classList.remove("hidden");
        return false;
    }

    validationMsg.classList.add("hidden");
    return true;
}

function formatExportSection(title, items) {
    const lines = [title, "-".repeat(title.length)];
    if (items.length === 0) {
        lines.push("No items");
    } else {
        items.forEach((item) => lines.push(item));
    }
    lines.push("");
    return lines.join("\n");
}

function processLists(options = {}) {
    const shouldScroll = options.scrollIntoView !== false;
    if (!validate()) {
        resultsEl.classList.add("hidden");
        exportBtn.disabled = true;
        return;
    }

    const settings = getSettings();
    const names = getNames();
    const mapA = parseList(listA.value, settings);
    const mapB = parseList(listB.value, settings);
    const mapC = parseList(listC.value, settings);
    const setA = new Set(mapA.keys());
    const setB = new Set(mapB.keys());
    const setC = new Set(mapC.keys());

    const onlyA = toDisplayItems(diff(setA, setB), mapA);
    const onlyB = toDisplayItems(diff(setB, setA), mapB);
    const commonAB = toDisplayItems(intersect(setA, setB), mapA, mapB);
    const allThree = toDisplayItems(
        [...setA].filter((item) => setB.has(item) && setC.has(item)),
        mapA,
        mapB,
        mapC
    );

    const onlyAFromC = toDisplayItems(diff(setA, setC), mapA);
    const onlyCFromA = toDisplayItems(diff(setC, setA), mapC);
    const onlyBFromC = toDisplayItems(diff(setB, setC), mapB);
    const onlyCFromB = toDisplayItems(diff(setC, setB), mapC);
    const commonAC = toDisplayItems(intersect(setA, setC), mapA, mapC);
    const commonBC = toDisplayItems(intersect(setB, setC), mapB, mapC);

    updateAllCounts();
    resultsEl.classList.remove("hidden");
    exportBtn.disabled = false;

    const totalUnique = new Set([...setA, ...setB, ...setC]).size;

    summaryEl.innerHTML = `
        <div class="summary-grid">
            <section class="summary-card">
                <h3>📊 Overview</h3>
                <ul>
                    <li>${escapeHtml(names.a)}: <strong>${setA.size}</strong> unique items</li>
                    <li>${escapeHtml(names.b)}: <strong>${setB.size}</strong> unique items</li>
                    ${setC.size ? `<li>${escapeHtml(names.c)}: <strong>${setC.size}</strong> unique items</li>` : ""}
                </ul>
            </section>
            <section class="summary-card">
                <h3>🔢 Totals</h3>
                <ul>
                    <li>Combined unique items: <strong>${totalUnique}</strong></li>
                    <li>Common in ${escapeHtml(names.a)} &amp; ${escapeHtml(names.b)}: <strong>${commonAB.length}</strong></li>
                    ${setC.size ? `<li>Common in all three: <strong>${allThree.length}</strong></li>` : ""}
                </ul>
            </section>
        </div>
    `;

    const diffBlocks = [
        renderBlock(`In ${names.a} but not in ${names.b}`, onlyA, "diff-missing"),
        renderBlock(`In ${names.b} but not in ${names.a}`, onlyB, "diff-only")
    ];
    if (setC.size) {
        diffBlocks.push(
            renderBlock(`In ${names.a} but not in ${names.c}`, onlyAFromC, "diff-missing"),
            renderBlock(`In ${names.c} but not in ${names.a}`, onlyCFromA, "diff-only"),
            renderBlock(`In ${names.b} but not in ${names.c}`, onlyBFromC, "diff-missing"),
            renderBlock(`In ${names.c} but not in ${names.b}`, onlyCFromB, "diff-only")
        );
    }
    diffsEl.innerHTML = diffBlocks.join("");

    const commonBlocks = [
        renderBlock(`Common in ${names.a} & ${names.b}`, commonAB, "diff-common")
    ];
    if (setC.size) {
        commonBlocks.push(
            renderBlock(`Common in ${names.a} & ${names.c}`, commonAC, "diff-common"),
            renderBlock(`Common in ${names.b} & ${names.c}`, commonBC, "diff-common"),
            renderBlock(`Common in ${names.a}, ${names.b} & ${names.c}`, allThree, "diff-common")
        );
    }
    commonEl.innerHTML = commonBlocks.join("");

    state.exportText.summary = [
        "Summary",
        "=======",
        `${names.a}: ${setA.size} unique items`,
        `${names.b}: ${setB.size} unique items`,
        `${names.c}: ${setC.size} unique items`,
        "",
        `Combined unique items: ${totalUnique}`,
        `Common in ${names.a} & ${names.b}: ${commonAB.length}`,
        `Common in all three: ${allThree.length}`
    ].join("\n");
    state.exportText.diffs = [
        formatExportSection(`In ${names.a} but not in ${names.b}`, onlyA),
        formatExportSection(`In ${names.b} but not in ${names.a}`, onlyB),
        setC.size ? formatExportSection(`In ${names.a} but not in ${names.c}`, onlyAFromC) : "",
        setC.size ? formatExportSection(`In ${names.c} but not in ${names.a}`, onlyCFromA) : "",
        setC.size ? formatExportSection(`In ${names.b} but not in ${names.c}`, onlyBFromC) : "",
        setC.size ? formatExportSection(`In ${names.c} but not in ${names.b}`, onlyCFromB) : ""
    ].filter(Boolean).join("\n");
    state.exportText.common = [
        formatExportSection(`Common in ${names.a} & ${names.b}`, commonAB),
        setC.size ? formatExportSection(`Common in ${names.a} & ${names.c}`, commonAC) : "",
        setC.size ? formatExportSection(`Common in ${names.b} & ${names.c}`, commonBC) : "",
        setC.size ? formatExportSection(`Common in ${names.a}, ${names.b} & ${names.c}`, allThree) : ""
    ].filter(Boolean).join("\n");

    if (!document.querySelector(`.tabs button[data-tab="${state.activeTab}"]`)) {
        state.activeTab = "summary";
    }
    showTab(state.activeTab);
    persistState();

    if (shouldScroll) {
        resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function maybeAutoCompare() {
    if (!getSettings().autoCompare) {
        return;
    }
    clearTimeout(state.autoCompareTimer);
    state.autoCompareTimer = setTimeout(() => {
        processLists({ scrollIntoView: false });
    }, AUTO_COMPARE_DEBOUNCE_MS);
}

function handleInputChange() {
    updateAllCounts();
    persistState();
    maybeAutoCompare();
}

function persistState() {
    const snapshot = {
        listA: listA.value,
        listB: listB.value,
        listC: listC.value,
        nameA: nameA.value,
        nameB: nameB.value,
        nameC: nameC.value,
        settings: getSettings(),
        activeTab: state.activeTab
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (_error) {
        // Ignore storage issues (private mode, quota, disabled storage).
    }
}

function restoreState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return;
        }

        const saved = JSON.parse(raw);
        listA.value = saved.listA || "";
        listB.value = saved.listB || "";
        listC.value = saved.listC || "";
        nameA.value = saved.nameA || "List A";
        nameB.value = saved.nameB || "List B";
        nameC.value = saved.nameC || "List C";
        state.activeTab = saved.activeTab || "summary";

        if (saved.settings) {
            ignoreCaseEl.checked = saved.settings.ignoreCase !== false;
            ignoreCommasEl.checked = saved.settings.ignoreCommas !== false;
            normalizeWhitespaceEl.checked = saved.settings.normalizeWhitespace !== false;
            autoCompareEl.checked = Boolean(saved.settings.autoCompare);
        }
    } catch (_error) {
        // Ignore invalid localStorage content and keep defaults.
    }
}

function exportActiveTab() {
    if (exportBtn.disabled) {
        return;
    }

    const text = state.exportText[state.activeTab] || "";
    if (!text.trim()) {
        return;
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `list-diff-${state.activeTab}-${stamp}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

function loadSampleData() {
    listA.value = "alpha\nbravo\ncharlie\nzulu";
    listB.value = "bravo\ncharlie\ndelta\necho";
    listC.value = "charlie\ndelta\nfoxtrot";
    handleInputChange();
    processLists();
}

function swapAB() {
    const originalA = listA.value;
    listA.value = listB.value;
    listB.value = originalA;

    const originalNameA = nameA.value;
    nameA.value = nameB.value;
    nameB.value = originalNameA;

    handleInputChange();
}

function clearList(id) {
    const target = document.getElementById(id);
    target.value = "";
    handleInputChange();
    if (!getSettings().autoCompare) {
        resultsEl.classList.add("hidden");
        exportBtn.disabled = true;
    }
}

function clearAll() {
    listA.value = "";
    listB.value = "";
    listC.value = "";
    updateAllCounts();
    resultsEl.classList.add("hidden");
    validationMsg.classList.add("hidden");
    exportBtn.disabled = true;
    state.exportText = { summary: "", diffs: "", common: "" };
    persistState();
}

listA.addEventListener("input", handleInputChange);
listB.addEventListener("input", handleInputChange);
listC.addEventListener("input", handleInputChange);
nameA.addEventListener("input", persistState);
nameB.addEventListener("input", persistState);
nameC.addEventListener("input", persistState);

ignoreCaseEl.addEventListener("change", handleInputChange);
ignoreCommasEl.addEventListener("change", handleInputChange);
normalizeWhitespaceEl.addEventListener("change", handleInputChange);
autoCompareEl.addEventListener("change", () => {
    persistState();
    if (!autoCompareEl.checked) {
        clearTimeout(state.autoCompareTimer);
        return;
    }
    maybeAutoCompare();
});

document.getElementById("compareBtn").addEventListener("click", processLists);
document.getElementById("clearAllBtn").addEventListener("click", clearAll);
swapBtn.addEventListener("click", swapAB);
sampleBtn.addEventListener("click", loadSampleData);
exportBtn.addEventListener("click", exportActiveTab);

document.querySelectorAll(".tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
        showTab(btn.dataset.tab);
        persistState();
    });
});

resultsEl.addEventListener("click", (event) => {
    const copyBtn = event.target.closest(".copy-btn");
    if (!copyBtn) {
        return;
    }

    const payload = copyBtn.getAttribute("data-copy");
    const text = decodeURIComponent(payload || "");
    copyToClipboard(text, copyBtn);
});

document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        processLists();
    }
});

restoreState();
updateAllCounts();
if (getSettings().autoCompare && (listA.value || listB.value || listC.value)) {
    processLists({ scrollIntoView: false });
}