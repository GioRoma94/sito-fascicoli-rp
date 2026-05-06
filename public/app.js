const storageKey = "rp-police-case-archive";

const defaultCases = [
  {
    id: crypto.randomUUID(),
    title: "Operazione Red Harbor",
    number: "CID-2049-17",
    status: "APERTO",
    lead: "Det. M. Reynolds",
    summary: "Indagine su una rete di ricettazione legata al porto e a veicoli rubati.",
    chapters: [
      {
        id: crypto.randomUUID(),
        title: "Primo rapporto sul deposito",
        narrative: "Alle 22:40 una pattuglia ha segnalato movimenti sospetti presso un magazzino dismesso. Sono stati rilevati tre veicoli senza targhe e comunicazioni radio non autorizzate.",
        people: "Jack Moretti - sospetto principale\nElena Vargas - testimone\nUnita 12-Adam - primo intervento"
      }
    ]
  }
];

let cases = loadCases();
let selectedCaseId = cases[0]?.id || null;

const caseList = document.querySelector("#caseList");
const caseSearch = document.querySelector("#caseSearch");
const newCaseBtn = document.querySelector("#newCaseBtn");
const caseEditor = document.querySelector("#caseEditor");
const emptyState = document.querySelector("#emptyState");
const caseTitle = document.querySelector("#caseTitle");
const caseStatus = document.querySelector("#caseStatus");
const caseNumber = document.querySelector("#caseNumber");
const titleInput = document.querySelector("#titleInput");
const numberInput = document.querySelector("#numberInput");
const statusInput = document.querySelector("#statusInput");
const leadInput = document.querySelector("#leadInput");
const summaryInput = document.querySelector("#summaryInput");
const newChapterBtn = document.querySelector("#newChapterBtn");
const chapters = document.querySelector("#chapters");

function loadCases() {
  const storedCases = localStorage.getItem(storageKey);
  if (!storedCases) {
    return defaultCases;
  }

  try {
    return JSON.parse(storedCases);
  } catch {
    return defaultCases;
  }
}

function saveCases() {
  localStorage.setItem(storageKey, JSON.stringify(cases));
}

function getSelectedCase() {
  return cases.find((caseFile) => caseFile.id === selectedCaseId);
}

function createCase() {
  const caseFile = {
    id: crypto.randomUUID(),
    title: "Nuovo fascicolo",
    number: `CID-${new Date().getFullYear()}-${String(cases.length + 1).padStart(3, "0")}`,
    status: "APERTO",
    lead: "",
    summary: "",
    chapters: []
  };

  cases.unshift(caseFile);
  selectedCaseId = caseFile.id;
  saveCases();
  render();
  titleInput.focus();
}

function createChapter() {
  const caseFile = getSelectedCase();
  if (!caseFile) {
    return;
  }

  caseFile.chapters.push({
    id: crypto.randomUUID(),
    title: `Capitolo ${caseFile.chapters.length + 1}`,
    narrative: "",
    people: ""
  });

  saveCases();
  render();
  document.querySelector(`[data-chapter-title="${caseFile.chapters.at(-1).id}"]`)?.focus();
}

function updateSelectedCase(field, value) {
  const caseFile = getSelectedCase();
  if (!caseFile) {
    return;
  }

  caseFile[field] = value;
  saveCases();
  renderCaseList();
  renderHeader(caseFile);
}

function updateChapter(chapterId, field, value) {
  const caseFile = getSelectedCase();
  const chapter = caseFile?.chapters.find((item) => item.id === chapterId);
  if (!chapter) {
    return;
  }

  chapter[field] = value;
  saveCases();
}

function removeChapter(chapterId) {
  const caseFile = getSelectedCase();
  if (!caseFile) {
    return;
  }

  caseFile.chapters = caseFile.chapters.filter((chapter) => chapter.id !== chapterId);
  saveCases();
  render();
}

function renderCaseList() {
  const query = caseSearch.value.trim().toLowerCase();
  const visibleCases = cases.filter((caseFile) => {
    const searchText = `${caseFile.title} ${caseFile.number} ${caseFile.status} ${caseFile.lead}`.toLowerCase();
    return searchText.includes(query);
  });

  caseList.innerHTML = "";

  visibleCases.forEach((caseFile) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `case-tab${caseFile.id === selectedCaseId ? " active" : ""}`;
    button.innerHTML = `<strong>${escapeHtml(caseFile.title)}</strong><span>${escapeHtml(caseFile.number)} | ${escapeHtml(caseFile.status)}</span>`;
    button.addEventListener("click", () => {
      selectedCaseId = caseFile.id;
      render();
    });
    caseList.append(button);
  });
}

function renderHeader(caseFile) {
  caseTitle.textContent = caseFile?.title || "Seleziona un fascicolo";
  caseStatus.textContent = caseFile?.status || "ARCHIVE";
  caseNumber.textContent = caseFile?.number || "NO CASE";
}

function renderEditor(caseFile) {
  const hasCase = Boolean(caseFile);
  caseEditor.hidden = !hasCase;
  emptyState.hidden = hasCase;

  if (!caseFile) {
    return;
  }

  titleInput.value = caseFile.title;
  numberInput.value = caseFile.number;
  statusInput.value = caseFile.status;
  leadInput.value = caseFile.lead;
  summaryInput.value = caseFile.summary;
  chapters.innerHTML = "";

  if (caseFile.chapters.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = "<p class=\"badge\">NO CHAPTERS</p><h2>Nessun capitolo</h2><p>Aggiungi un capitolo per registrare narrativa e persone coinvolte.</p>";
    chapters.append(empty);
    return;
  }

  caseFile.chapters.forEach((chapter, index) => {
    const article = document.createElement("article");
    article.className = "chapter";
    article.innerHTML = `
      <div class="chapter-top">
        <span class="chapter-index">${index + 1}</span>
        <div class="field chapter-title">
          <label>Titolo capitolo</label>
          <input type="text" value="${escapeAttribute(chapter.title)}" data-chapter-title="${chapter.id}" data-chapter-field="title" />
        </div>
        <button class="remove-chapter" type="button" data-remove-chapter="${chapter.id}">Rimuovi</button>
      </div>
      <div class="field">
        <label>Narrativa</label>
        <textarea rows="8" data-chapter-field="narrative" data-chapter-id="${chapter.id}">${escapeHtml(chapter.narrative)}</textarea>
      </div>
      <div class="field people-box">
        <label>Persone coinvolte</label>
        <textarea rows="8" placeholder="Nome - ruolo o nota" data-chapter-field="people" data-chapter-id="${chapter.id}">${escapeHtml(chapter.people)}</textarea>
      </div>
    `;

    article.querySelectorAll("[data-chapter-field]").forEach((input) => {
      input.addEventListener("input", (event) => {
        const id = event.target.dataset.chapterId || event.target.dataset.chapterTitle;
        updateChapter(id, event.target.dataset.chapterField, event.target.value);
      });
    });

    article.querySelector("[data-remove-chapter]").addEventListener("click", () => {
      removeChapter(chapter.id);
    });

    chapters.append(article);
  });
}

function render() {
  const caseFile = getSelectedCase();
  renderCaseList();
  renderHeader(caseFile);
  renderEditor(caseFile);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("\n", " ");
}

newCaseBtn.addEventListener("click", createCase);
newChapterBtn.addEventListener("click", createChapter);
caseSearch.addEventListener("input", renderCaseList);

titleInput.addEventListener("input", (event) => updateSelectedCase("title", event.target.value));
numberInput.addEventListener("input", (event) => updateSelectedCase("number", event.target.value));
statusInput.addEventListener("change", (event) => updateSelectedCase("status", event.target.value));
leadInput.addEventListener("input", (event) => updateSelectedCase("lead", event.target.value));
summaryInput.addEventListener("input", (event) => updateSelectedCase("summary", event.target.value));

render();
