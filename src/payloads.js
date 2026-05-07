const defaultChapterRole = "Persona informata sui fatti";
const supportedChapterRoles = [
  "Vittima",
  "Complice",
  "Persona informata sui fatti",
  "Esecutore"
];

function createInvolvedPerson(entry = {}) {
  return {
    id: String(entry.id || ""),
    role: supportedChapterRoles.includes(entry.role) ? entry.role : defaultChapterRole,
    name: String(entry.name || ""),
    note: String(entry.note || "")
  };
}

function parseLegacyPeopleText(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [roleCandidate, rest] = line.split(/:\s+(.+)/s);
      const role = supportedChapterRoles.includes(roleCandidate) ? roleCandidate : defaultChapterRole;
      const content = supportedChapterRoles.includes(roleCandidate) ? rest || "" : line;
      const [name, note] = content.split(/\s+-\s+(.+)/s);
      return createInvolvedPerson({
        id: `legacy-${index + 1}`,
        role,
        name: String(name || content || "").trim(),
        note: String(note || "").trim()
      });
    });
}

function parseChapterPeople(value) {
  if (Array.isArray(value)) {
    return value.map(createInvolvedPerson).filter((entry) => entry.name || entry.note);
  }

  const raw = String(value || "").trim();
  if (!raw) {
    return [];
  }

  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(createInvolvedPerson).filter((entry) => entry.name || entry.note);
      }
    } catch (error) {
      return parseLegacyPeopleText(raw);
    }
  }

  return parseLegacyPeopleText(raw);
}

function serializeChapterPeople(entries) {
  return JSON.stringify(parseChapterPeople(entries));
}

function formatChapterPeople(entries) {
  const normalizedEntries = parseChapterPeople(entries);
  if (normalizedEntries.length === 0) {
    return "";
  }

  return normalizedEntries
    .map((entry) => `${entry.role}: ${entry.name}${entry.note ? ` - ${entry.note}` : ""}`)
    .join("\n");
}

function normalizeChapter(row) {
  const involvedPeople = parseChapterPeople(row.involvedPeople || row.people);
  return {
    id: row.id,
    title: row.title,
    narrative: row.narrative,
    people: formatChapterPeople(involvedPeople),
    involvedPeople
  };
}

function normalizeCase(row) {
  return {
    id: row.id,
    title: row.title,
    number: row.number,
    status: row.status,
    lead: row.lead,
    summary: row.summary,
    chapters: (row.chapters || []).map(normalizeChapter)
  };
}

function validateCasePayload(body) {
  return {
    id: String(body.id || ""),
    title: String(body.title || "Nuovo fascicolo"),
    number: String(body.number || ""),
    status: String(body.status || "APERTO"),
    lead: String(body.lead || ""),
    summary: String(body.summary || "")
  };
}

function validateChapterPayload(body) {
  const involvedPeople = parseChapterPeople(body.involvedPeople || body.people);
  return {
    id: String(body.id || ""),
    title: String(body.title || "Nuovo capitolo"),
    narrative: String(body.narrative || ""),
    people: serializeChapterPeople(involvedPeople),
    involvedPeople
  };
}

function normalizePerson(row) {
  return {
    id: row.id,
    name: row.name,
    birthDate: row.birth_date,
    phone: row.phone,
    bankAccount: row.bank_account,
    caseId: row.case_id || ""
  };
}

function validatePersonPayload(body) {
  return {
    id: String(body.id || ""),
    name: String(body.name || "Nuova persona"),
    birthDate: String(body.birthDate || body.birth_date || ""),
    phone: String(body.phone || ""),
    bankAccount: String(body.bankAccount || body.bank_account || ""),
    caseId: String(body.caseId || body.case_id || "")
  };
}

module.exports = {
  formatChapterPeople,
  normalizeChapter,
  normalizeCase,
  parseChapterPeople,
  serializeChapterPeople,
  supportedChapterRoles,
  validateCasePayload,
  validateChapterPayload,
  normalizePerson,
  validatePersonPayload
};
