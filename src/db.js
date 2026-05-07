const { Pool } = require("pg");
const { databaseUrl } = require("./config");

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false }
    })
  : null;

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

    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      birth_date TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      bank_account TEXT NOT NULL DEFAULT '',
      case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

module.exports = { pool, initDatabase };
