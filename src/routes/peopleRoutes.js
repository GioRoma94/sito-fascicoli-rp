const express = require("express");
const { pool } = require("../db");
const { developmentPeople } = require("../demoData");
const { normalizePerson, validatePersonPayload } = require("../payloads");

const router = express.Router();

router.get("/people", async (req, res) => {
  try {
    if (!pool) {
      res.json(developmentPeople);
      return;
    }

    const result = await pool.query(`
      SELECT id, name, birth_date, phone, bank_account, case_id
      FROM people
      ORDER BY created_at DESC;
    `);
    res.json(result.rows.map(normalizePerson));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to load people." });
  }
});

router.post("/people", async (req, res) => {
  try {
    const person = validatePersonPayload(req.body);
    if (!pool) {
      developmentPeople.unshift(person);
      res.status(201).json(person);
      return;
    }

    await pool.query(
      `
        INSERT INTO people (id, name, birth_date, phone, bank_account, case_id)
        VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''))
      `,
      [person.id, person.name, person.birthDate, person.phone, person.bankAccount, person.caseId]
    );

    res.status(201).json(person);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create person." });
  }
});

router.patch("/people/:id", async (req, res) => {
  try {
    const person = validatePersonPayload({ ...req.body, id: req.params.id });
    if (!pool) {
      const existingPerson = developmentPeople.find((item) => item.id === req.params.id);
      if (!existingPerson) {
        res.status(404).json({ error: "Person not found." });
        return;
      }

      Object.assign(existingPerson, person);
      res.json(person);
      return;
    }

    await pool.query(
      `
        UPDATE people
        SET name = $2, birth_date = $3, phone = $4, bank_account = $5, case_id = NULLIF($6, ''), updated_at = NOW()
        WHERE id = $1
      `,
      [person.id, person.name, person.birthDate, person.phone, person.bankAccount, person.caseId]
    );

    res.json(person);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update person." });
  }
});

router.delete("/people/:id", async (req, res) => {
  try {
    if (!pool) {
      const index = developmentPeople.findIndex((item) => item.id === req.params.id);
      if (index >= 0) {
        developmentPeople.splice(index, 1);
      }

      res.status(204).end();
      return;
    }

    await pool.query("DELETE FROM people WHERE id = $1", [req.params.id]);
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete person." });
  }
});

module.exports = router;
