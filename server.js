const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;
const frontendPath = path.join(__dirname, "frontend");
const databaseUrl = process.env.DATABASE_URL;
const authUser = process.env.AUTH_USER || "admin";
const authPassword = process.env.AUTH_PASSWORD || "admin";
const authSecret = process.env.AUTH_SECRET || "development-secret-change-me";
const sessionMaxAgeMs = 1000 * 60 * 60 * 8;
const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false }
    })
  : null;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(frontendPath));

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)])
  );
}

function sign(value) {
  return crypto.createHmac("sha256", authSecret).update(value).digest("base64url");
}

function createSessionToken(username) {
  const expiresAt = Date.now() + sessionMaxAgeMs;
  const payload = `${username}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

function verifySessionToken(token) {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [username, expiresAt, signature] = parts;
  const payload = `${username}.${expiresAt}`;
  const expectedSignature = sign(payload);
  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(signature);

  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return null;
  }

  if (Number(expiresAt) < Date.now()) {
    return null;
  }

  return username;
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === "production" || process.env.RENDER === "true";
  res.cookie("case_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: sessionMaxAgeMs
  });
}

function clearSessionCookie(res) {
  res.clearCookie("case_session", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" || process.env.RENDER === "true"
  });
}

function getSessionUser(req) {
  const cookies = parseCookies(req.headers.cookie);
  return verifySessionToken(cookies.case_session);
}

function requireAuth(req, res, next) {
  const username = getSessionUser(req);
  if (!username) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  req.user = { username };
  next();
}

function safeCompare(value, expectedValue) {
  const received = Buffer.from(String(value));
  const expected = Buffer.from(String(expectedValue));
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

async function initDatabase() {
  if (!pool) {
    console.warn("DATABASE_URL not set. API will use in-memory development data.");
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      number TEXT NOT NULL,
      status TEXT NOT NULL,
      lead TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      narrative TEXT NOT NULL DEFAULT '',
      people TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

const developmentCases = [
  {
    id: "demo-case",
    title: "Operazione Red Harbor",
    number: "CID-2049-17",
    status: "APERTO",
    lead: "Det. M. Reynolds",
    summary: "Indagine su una rete di ricettazione legata al porto e a veicoli rubati.",
    chapters: [
      {
        id: "demo-chapter",
        title: "Primo rapporto sul deposito",
        narrative:
          "Alle 22:40 una pattuglia ha segnalato movimenti sospetti presso un magazzino dismesso. Sono stati rilevati tre veicoli senza targhe e comunicazioni radio non autorizzate.",
        people: "Jack Moretti - sospetto principale\nElena Vargas - testimone\nUnita 12-Adam - primo intervento"
      }
    ]
  }
];

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

app.get("/api/auth/me", (req, res) => {
  const username = getSessionUser(req);
  res.json({ authenticated: Boolean(username), username });
});

app.post("/api/auth/login", (req, res) => {
  const username = String(req.body.username || "");
  const password = String(req.body.password || "");

  if (!safeCompare(username, authUser) || !safeCompare(password, authPassword)) {
    res.status(401).json({ error: "Invalid credentials." });
    return;
  }

  setSessionCookie(res, createSessionToken(username));
  res.json({ authenticated: true, username });
});

app.post("/api/auth/logout", (req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

app.use("/api", requireAuth);

app.get("/api/cases", async (req, res) => {
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

app.post("/api/cases", async (req, res) => {
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

app.patch("/api/cases/:id", async (req, res) => {
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

app.post("/api/cases/:caseId/chapters", async (req, res) => {
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

app.patch("/api/chapters/:id", async (req, res) => {
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

app.delete("/api/chapters/:id", async (req, res) => {
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

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

initDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Investigation files app running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Unable to initialize database.", error);
    process.exit(1);
  });
