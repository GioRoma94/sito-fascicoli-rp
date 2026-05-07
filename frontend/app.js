let cases = [];
let people = [];
let selectedCaseId = null;
let activeView = "cases";
const saveTimers = new Map();

const loginScreen = document.querySelector("#loginScreen");
const appShell = document.querySelector("#appShell");
const loginForm = document.querySelector("#loginForm");
const loginError = document.querySelector("#loginError");
const bootLog = document.querySelector("#bootLog");
const usernameInput = document.querySelector("#usernameInput");
const passwordInput = document.querySelector("#passwordInput");
const caseList = document.querySelector("#caseList");
const caseSearch = document.querySelector("#caseSearch");
const newCaseBtn = document.querySelector("#newCaseBtn");
const logoutBtn = document.querySelector("#logoutBtn");
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
const mainTabs = document.querySelectorAll("[data-view]");
const peoplePanel = document.querySelector("#peoplePanel");
const peopleGrid = document.querySelector("#peopleGrid");
const newPersonBtn = document.querySelector("#newPersonBtn");
const aiPanel = document.querySelector("#aiPanel");
const aiCaseSelect = document.querySelector("#aiCaseSelect");
const aiOutput = document.querySelector("#aiOutput");
const aiForm = document.querySelector("#aiForm");
const aiQuestionInput = document.querySelector("#aiQuestionInput");
const questionSuggestions = document.querySelector("#questionSuggestions");
const bootLines = [
  "Import-Module FederalCaseVault",
  "Mount-IntelDrive -Name FBI_FIELD_ARCHIVE",
  "Loading file: warrants.dbx",
  "Loading file: suspects.index",
  "Loading file: classified_audio_manifest.sec",
  "Loading file: surveillance_nodes.map",
  "Handshake CIA_LIAISON_CHANNEL ........ OK",
  "Decrypting bureau case folders ....... OK",
  "Session gate ready. Insert credentials."
];
let bootTimers = [];

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (!response.ok) {
    if (response.status === 401 && !url.includes("/api/auth/")) {
      showLogin();
    }

    throw new Error(`Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function checkSession() {
  const session = await requestJson("/api/auth/me");
  if (session.authenticated) {
    showApp();
    await loadCases();
    return;
  }

  showLogin();
}

async function login(event) {
  event.preventDefault();
  loginError.hidden = true;

  try {
    await requestJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: usernameInput.value,
        password: passwordInput.value
      })
    });

    passwordInput.value = "";
    showApp();
    await loadCases();
  } catch (error) {
    loginError.hidden = false;
    passwordInput.select();
  }
}

async function logout() {
  try {
    await requestJson("/api/auth/logout", { method: "POST" });
  } finally {
    saveTimers.forEach((timer) => clearTimeout(timer));
    saveTimers.clear();
    cases = [];
    people = [];
    selectedCaseId = null;
    activeView = "cases";
    render();
    showLogin();
  }
}

function showLogin() {
  loginScreen.hidden = false;
  appShell.hidden = true;
  runBootLog();
  usernameInput.focus();
}

function showApp() {
  loginScreen.hidden = true;
  appShell.hidden = false;
  clearBootLogTimers();
}

function runBootLog() {
  clearBootLogTimers();
  bootLog.innerHTML = "";

  bootLines.forEach((line, index) => {
    const timer = setTimeout(() => {
      const row = document.createElement("p");
      row.className = "boot-line";
      row.textContent = line;
      bootLog.append(row);
    }, index * 170);
    bootTimers.push(timer);
  });
}

function clearBootLogTimers() {
  bootTimers.forEach((timer) => clearTimeout(timer));
  bootTimers = [];
}

async function loadCases() {
  cases = await requestJson("/api/cases");
  people = await requestJson("/api/people");
  selectedCaseId = cases[0]?.id || null;
  render();
}

function getSelectedCase() {
  return cases.find((caseFile) => caseFile.id === selectedCaseId);
}

async function createCase() {
  const caseFile = {
    id: crypto.randomUUID(),
    title: "Nuovo fascicolo",
    number: `CID-${new Date().getFullYear()}-${String(cases.length + 1).padStart(3, "0")}`,
    status: "APERTO",
    lead: "",
    summary: ""
  };

  try {
    const createdCase = await requestJson("/api/cases", {
      method: "POST",
      body: JSON.stringify(caseFile)
    });

    cases.unshift(createdCase);
    selectedCaseId = createdCase.id;
    render();
    titleInput.focus();
  } catch (error) {
    showError("Non riesco a creare il fascicolo nel database.");
  }
}

async function createChapter() {
  const caseFile = getSelectedCase();
  if (!caseFile) {
    return;
  }

  const chapter = {
    id: crypto.randomUUID(),
    title: `Capitolo ${caseFile.chapters.length + 1}`,
    narrative: "",
    people: ""
  };

  try {
    const createdChapter = await requestJson(`/api/cases/${encodeURIComponent(caseFile.id)}/chapters`, {
      method: "POST",
      body: JSON.stringify(chapter)
    });

    caseFile.chapters.push(createdChapter);
    render();
    document.querySelector(`[data-chapter-title="${createdChapter.id}"]`)?.focus();
  } catch (error) {
    showError("Non riesco a creare il capitolo nel database.");
  }
}

async function createPerson() {
  const person = {
    id: crypto.randomUUID(),
    name: "Nuova persona",
    birthDate: "",
    phone: "",
    bankAccount: "",
    caseId: selectedCaseId || cases[0]?.id || ""
  };

  try {
    const createdPerson = await requestJson("/api/people", {
      method: "POST",
      body: JSON.stringify(person)
    });

    people.unshift(createdPerson);
    activeView = "people";
    render();
    document.querySelector(`[data-person-name="${createdPerson.id}"]`)?.focus();
  } catch (error) {
    showError("Non riesco a creare la persona nel database.");
  }
}

function scheduleCaseSave(caseFile) {
  const timerKey = `case:${caseFile.id}`;
  clearTimeout(saveTimers.get(timerKey));
  saveTimers.set(timerKey, setTimeout(async () => {
    try {
      await requestJson(`/api/cases/${encodeURIComponent(caseFile.id)}`, {
        method: "PATCH",
        body: JSON.stringify(caseFile)
      });
    } catch (error) {
      showError("Non riesco a salvare il fascicolo nel database.");
    }
  }, 300));
}

function scheduleChapterSave(chapter) {
  const timerKey = `chapter:${chapter.id}`;
  clearTimeout(saveTimers.get(timerKey));
  saveTimers.set(timerKey, setTimeout(async () => {
    try {
      await requestJson(`/api/chapters/${encodeURIComponent(chapter.id)}`, {
        method: "PATCH",
        body: JSON.stringify(chapter)
      });
    } catch (error) {
      showError("Non riesco a salvare il capitolo nel database.");
    }
  }, 300));
}

function schedulePersonSave(person) {
  const timerKey = `person:${person.id}`;
  clearTimeout(saveTimers.get(timerKey));
  saveTimers.set(timerKey, setTimeout(async () => {
    try {
      await requestJson(`/api/people/${encodeURIComponent(person.id)}`, {
        method: "PATCH",
        body: JSON.stringify(person)
      });
    } catch (error) {
      showError("Non riesco a salvare la persona nel database.");
    }
  }, 300));
}

function updateSelectedCase(field, value) {
  const caseFile = getSelectedCase();
  if (!caseFile) {
    return;
  }

  caseFile[field] = value;
  renderCaseList();
  renderHeader(caseFile);
  scheduleCaseSave(caseFile);
}

function updateChapter(chapterId, field, value) {
  const caseFile = getSelectedCase();
  const chapter = caseFile?.chapters.find((item) => item.id === chapterId);
  if (!chapter) {
    return;
  }

  chapter[field] = value;
  scheduleChapterSave(chapter);
}

async function removeChapter(chapterId) {
  const caseFile = getSelectedCase();
  if (!caseFile) {
    return;
  }

  try {
    await requestJson(`/api/chapters/${encodeURIComponent(chapterId)}`, { method: "DELETE" });
    caseFile.chapters = caseFile.chapters.filter((chapter) => chapter.id !== chapterId);
    render();
  } catch (error) {
    showError("Non riesco a rimuovere il capitolo dal database.");
  }
}

function updatePerson(personId, field, value) {
  const person = people.find((item) => item.id === personId);
  if (!person) {
    return;
  }

  person[field] = value;
  schedulePersonSave(person);
  if (field === "caseId") {
    renderCaseList();
  }
}

async function removePerson(personId) {
  try {
    await requestJson(`/api/people/${encodeURIComponent(personId)}`, { method: "DELETE" });
    people = people.filter((person) => person.id !== personId);
    renderPeople();
  } catch (error) {
    showError("Non riesco a rimuovere la persona dal database.");
  }
}

function setActiveView(view) {
  activeView = view;
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
    const linkedPeople = people.filter((person) => person.caseId === caseFile.id).length;
    button.innerHTML = `<strong>${escapeHtml(caseFile.title)}</strong><span>${escapeHtml(caseFile.number)} | ${escapeHtml(caseFile.status)} | ${linkedPeople} persone</span>`;
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
        <button class="remove-chapter" type="button" data-remove-chapter="${chapter.id}">Elimina capitolo</button>
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

function renderPeople() {
  peopleGrid.innerHTML = "";

  if (people.length === 0) {
    peopleGrid.innerHTML = `
      <div class="empty-state inline-empty">
        <p class="badge">NO PEOPLE</p>
        <h2>Nessuna persona registrata</h2>
        <p>Aggiungi una persona e collegala a un fascicolo.</p>
      </div>
    `;
    return;
  }

  people.forEach((person) => {
    const article = document.createElement("article");
    article.className = "person-card";
    article.innerHTML = `
      <div class="person-card-head">
        <div class="field">
          <label>Nome</label>
          <input type="text" value="${escapeAttribute(person.name)}" data-person-name="${person.id}" data-person-field="name" />
        </div>
        <button class="remove-chapter" type="button" data-remove-person="${person.id}">Elimina</button>
      </div>
      <div class="field">
        <label>Data di nascita</label>
        <input type="date" value="${escapeAttribute(person.birthDate)}" data-person-field="birthDate" data-person-id="${person.id}" />
      </div>
      <div class="field">
        <label>Telefono</label>
        <input type="tel" value="${escapeAttribute(person.phone)}" data-person-field="phone" data-person-id="${person.id}" />
      </div>
      <div class="field">
        <label>Conto bancario</label>
        <input type="text" value="${escapeAttribute(person.bankAccount)}" data-person-field="bankAccount" data-person-id="${person.id}" />
      </div>
      <div class="field">
        <label>Fascicolo collegato</label>
        <select data-person-field="caseId" data-person-id="${person.id}">
          <option value="">Non collegato</option>
          ${cases.map((caseFile) => `<option value="${escapeAttribute(caseFile.id)}"${caseFile.id === person.caseId ? " selected" : ""}>${escapeHtml(caseFile.number)} - ${escapeHtml(caseFile.title)}</option>`).join("")}
        </select>
      </div>
    `;

    article.querySelectorAll("[data-person-field]").forEach((input) => {
      input.addEventListener("input", (event) => {
        const id = event.target.dataset.personId || event.target.dataset.personName;
        updatePerson(id, event.target.dataset.personField, event.target.value);
      });
      input.addEventListener("change", (event) => {
        const id = event.target.dataset.personId || event.target.dataset.personName;
        updatePerson(id, event.target.dataset.personField, event.target.value);
      });
    });

    article.querySelector("[data-remove-person]").addEventListener("click", () => {
      removePerson(person.id);
    });

    peopleGrid.append(article);
  });
}

function renderAiTerminal() {
  aiCaseSelect.innerHTML = cases
    .map((caseFile) => `<option value="${escapeAttribute(caseFile.id)}"${caseFile.id === selectedCaseId ? " selected" : ""}>${escapeHtml(caseFile.number)} - ${escapeHtml(caseFile.title)}</option>`)
    .join("");

  const caseFile = getSelectedCase();
  const suggestions = [
    "Quali persone sono piu rilevanti per questo fascicolo?",
    "Quali contraddizioni emergono dai capitoli?",
    "Prepara tre domande RP per interrogatorio.",
    "Riassumi piste investigative e prossime azioni."
  ];

  if (!aiOutput.dataset.ready) {
    aiOutput.innerHTML = `
      <p><span>system</span> Terminale API predisposto.</p>
      <p><span>case</span> Seleziona un fascicolo, invia una domanda o usa un suggerimento.</p>
    `;
    aiOutput.dataset.ready = "true";
  }

  questionSuggestions.innerHTML = suggestions
    .map((suggestion) => `<button type="button" data-suggestion="${escapeAttribute(suggestion)}">${escapeHtml(suggestion)}</button>`)
    .join("");

  questionSuggestions.querySelectorAll("[data-suggestion]").forEach((button) => {
    button.addEventListener("click", () => {
      aiQuestionInput.value = button.dataset.suggestion;
      aiQuestionInput.focus();
    });
  });

  if (caseFile) {
    aiQuestionInput.placeholder = `Domanda su ${caseFile.number}...`;
  }
}

async function submitAiQuestion(event) {
  event.preventDefault();
  const question = aiQuestionInput.value.trim();
  const caseId = aiCaseSelect.value || selectedCaseId;
  if (!question || !caseId) {
    return;
  }

  const caseFile = cases.find((item) => item.id === caseId);
  appendTerminalLine("user", question);
  aiQuestionInput.value = "";

  try {
    const response = await requestJson("/api/ai/questions", {
      method: "POST",
      body: JSON.stringify({ caseId, question })
    });
    appendTerminalLine("claude", response.message || "Nessuna risposta ricevuta.");
  } catch (error) {
    appendTerminalLine("error", "Claude non e configurato o non e raggiungibile. Controlla ANTHROPIC_API_KEY sul server.");
  }

  if (caseFile) {
    selectedCaseId = caseFile.id;
    renderHeader(caseFile);
  }
}

function appendTerminalLine(label, text) {
  const row = document.createElement("p");
  row.innerHTML = `<span>${escapeHtml(label)}</span> ${escapeHtml(text)}`;
  aiOutput.append(row);
  aiOutput.scrollTop = aiOutput.scrollHeight;
}

function render() {
  const caseFile = getSelectedCase();
  mainTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === activeView);
  });
  caseEditor.hidden = activeView !== "cases" || !caseFile;
  emptyState.hidden = activeView !== "cases" || Boolean(caseFile);
  peoplePanel.hidden = activeView !== "people";
  aiPanel.hidden = activeView !== "terminal";
  renderCaseList();
  renderHeader(caseFile);
  if (activeView === "cases") {
    renderEditor(caseFile);
  }
  if (activeView === "people") {
    renderPeople();
  }
  if (activeView === "terminal") {
    renderAiTerminal();
  }
}

function showError(message) {
  console.error(message);
  window.alert(message);
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
newPersonBtn.addEventListener("click", createPerson);
loginForm.addEventListener("submit", login);
logoutBtn.addEventListener("click", logout);
caseSearch.addEventListener("input", renderCaseList);
aiForm.addEventListener("submit", submitAiQuestion);
aiCaseSelect.addEventListener("change", (event) => {
  selectedCaseId = event.target.value;
  renderHeader(getSelectedCase());
});
mainTabs.forEach((tab) => {
  tab.addEventListener("click", () => setActiveView(tab.dataset.view));
});

titleInput.addEventListener("input", (event) => updateSelectedCase("title", event.target.value));
numberInput.addEventListener("input", (event) => updateSelectedCase("number", event.target.value));
statusInput.addEventListener("change", (event) => updateSelectedCase("status", event.target.value));
leadInput.addEventListener("input", (event) => updateSelectedCase("lead", event.target.value));
summaryInput.addEventListener("input", (event) => updateSelectedCase("summary", event.target.value));

checkSession().catch(() => {
  showError("Non riesco a caricare i fascicoli dal database.");
});
