const express = require("express");
const { pool } = require("../db");
const { developmentCases } = require("../demoData");
const {
  normalizeCase,
  validateCasePayload,
  validateChapterPayload
} = require("../payloads");

const router = express.Router();

router.get("/cases", async (req, res) => {
  try {
    if (!pool) {
      res.json(developmentCases);
      return;
    }

    const result = await pool.query(`
      SELECT
        c.id,
        c.title,
        c.number,
        c.status,
        c.lead,
        c.summary,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ch.id,
              'title', ch.title,
              'narrative', ch.narrative,
              'people', ch.people
            )
            ORDER BY ch.created_at ASC
          ) FILTER (WHERE ch.id IS NOT NULL),
          '[]'
        ) AS chapters
      FROM cases c
      LEFT JOIN chapters ch ON ch.case_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC;
    `);

    res.json(result.rows.map(normalizeCase));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to load cases." });
  }
});

router.post("/cases", async (req, res) => {
  try {
    const caseFile = validateCasePayload(req.body);
    if (!pool) {
      const createdCase = { ...caseFile, chapters: [] };
      developmentCases.unshift(createdCase);
      res.status(201).json(createdCase);
      return;
    }

    await pool.query(
      `
        INSERT INTO cases (id, title, number, status, lead, summary)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [caseFile.id, caseFile.title, caseFile.number, caseFile.status, caseFile.lead, caseFile.summary]
    );

    res.status(201).json({ ...caseFile, chapters: [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create case." });
  }
});

router.patch("/cases/:id", async (req, res) => {
  try {
    const caseFile = validateCasePayload({ ...req.body, id: req.params.id });
    if (!pool) {
      const existingCase = developmentCases.find((item) => item.id === req.params.id);
      if (!existingCase) {
        res.status(404).json({ error: "Case not found." });
        return;
      }

      Object.assign(existingCase, caseFile);
      res.json(caseFile);
      return;
    }

    await pool.query(
      `
        UPDATE cases
        SET title = $2, number = $3, status = $4, lead = $5, summary = $6, updated_at = NOW()
        WHERE id = $1
      `,
      [caseFile.id, caseFile.title, caseFile.number, caseFile.status, caseFile.lead, caseFile.summary]
    );

    res.json(caseFile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update case." });
  }
});

router.post("/cases/:caseId/chapters", async (req, res) => {
  try {
    const chapter = validateChapterPayload(req.body);
    if (!pool) {
      const caseFile = developmentCases.find((item) => item.id === req.params.caseId);
      if (!caseFile) {
        res.status(404).json({ error: "Case not found." });
        return;
      }

      caseFile.chapters.push(chapter);
      res.status(201).json(chapter);
      return;
    }

    await pool.query(
      `
        INSERT INTO chapters (id, case_id, title, narrative, people)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [chapter.id, req.params.caseId, chapter.title, chapter.narrative, chapter.people]
    );

    res.status(201).json(chapter);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create chapter." });
  }
});

router.patch("/chapters/:id", async (req, res) => {
  try {
    const chapter = validateChapterPayload({ ...req.body, id: req.params.id });
    if (!pool) {
      const existingChapter = developmentCases
        .flatMap((caseFile) => caseFile.chapters)
        .find((item) => item.id === req.params.id);

      if (!existingChapter) {
        res.status(404).json({ error: "Chapter not found." });
        return;
      }

      Object.assign(existingChapter, chapter);
      res.json(chapter);
      return;
    }

    await pool.query(
      `
        UPDATE chapters
        SET title = $2, narrative = $3, people = $4, updated_at = NOW()
        WHERE id = $1
      `,
      [chapter.id, chapter.title, chapter.narrative, chapter.people]
    );

    res.json(chapter);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update chapter." });
  }
});

router.delete("/chapters/:id", async (req, res) => {
  try {
    if (!pool) {
      const caseFile = developmentCases.find((item) =>
        item.chapters.some((chapter) => chapter.id === req.params.id)
      );

      if (caseFile) {
        caseFile.chapters = caseFile.chapters.filter((chapter) => chapter.id !== req.params.id);
      }

      res.status(204).end();
      return;
    }

    await pool.query("DELETE FROM chapters WHERE id = $1", [req.params.id]);
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete chapter." });
  }
});

module.exports = router;
