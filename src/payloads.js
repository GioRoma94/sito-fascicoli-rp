function normalizeCase(row) {
  return {
    id: row.id,
    title: row.title,
    number: row.number,
    status: row.status,
    lead: row.lead,
    summary: row.summary,
    chapters: row.chapters || []
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
  return {
    id: String(body.id || ""),
    title: String(body.title || "Nuovo capitolo"),
    narrative: String(body.narrative || ""),
    people: String(body.people || "")
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
  normalizeCase,
  validateCasePayload,
  validateChapterPayload,
  normalizePerson,
  validatePersonPayload
};
