const { pool } = require("./db");
const { developmentCases, developmentPeople } = require("./demoData");
const { formatChapterPeople, normalizeChapter, normalizePerson } = require("./payloads");

async function getCaseContext(caseId) {
  if (!pool) {
    const caseFile = developmentCases.find((item) => item.id === caseId);
    if (!caseFile) {
      return null;
    }

    return {
      ...caseFile,
      linkedPeople: developmentPeople.filter((person) => person.caseId === caseId)
    };
  }

  const caseResult = await pool.query(
    "SELECT id, title, number, status, lead, summary FROM cases WHERE id = $1",
    [caseId]
  );
  const caseFile = caseResult.rows[0];
  if (!caseFile) {
    return null;
  }

  const chaptersResult = await pool.query(
    `
      SELECT id, title, narrative, people
      FROM chapters
      WHERE case_id = $1
      ORDER BY created_at ASC
    `,
    [caseId]
  );
  const peopleResult = await pool.query(
    `
      SELECT id, name, birth_date, phone, bank_account, case_id
      FROM people
      WHERE case_id = $1
      ORDER BY created_at ASC
    `,
    [caseId]
  );

  return {
    id: caseFile.id,
    title: caseFile.title,
    number: caseFile.number,
    status: caseFile.status,
    lead: caseFile.lead,
    summary: caseFile.summary,
    chapters: chaptersResult.rows.map((row) => ({
      ...normalizeChapter(row)
    })),
    linkedPeople: peopleResult.rows.map(normalizePerson)
  };
}

function formatCaseContext(caseFile) {
  const chapters = caseFile.chapters?.length
    ? caseFile.chapters
        .map(
          (chapter, index) =>
            `${index + 1}. ${chapter.title}\nNarrativa: ${chapter.narrative || "N/D"}\nPersone citate: ${formatChapterPeople(chapter.involvedPeople || chapter.people) || "N/D"}`
        )
        .join("\n\n")
    : "Nessun capitolo registrato.";

  const linkedPeople = caseFile.linkedPeople?.length
    ? caseFile.linkedPeople
        .map(
          (person) =>
            `- ${person.name}; nascita: ${person.birthDate || "N/D"}; telefono: ${person.phone || "N/D"}; conto: ${person.bankAccount || "N/D"}`
        )
        .join("\n")
    : "Nessuna persona collegata.";

  return `
Fascicolo: ${caseFile.number} - ${caseFile.title}
Stato: ${caseFile.status}
Agente responsabile: ${caseFile.lead || "N/D"}
Sintesi: ${caseFile.summary || "N/D"}

Capitoli:
${chapters}

Persone registrate:
${linkedPeople}
  `.trim();
}

module.exports = { formatCaseContext, getCaseContext };
