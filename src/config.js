const path = require("path");

const databaseUrl = process.env.DATABASE_URL;

module.exports = {
  port: process.env.PORT || 3000,
  frontendPath: path.join(__dirname, "..", "frontend"),
  databaseUrl,
  authUser: process.env.AUTH_USER || "admin",
  authPassword: process.env.AUTH_PASSWORD || "admin",
  authSecret: process.env.AUTH_SECRET || "development-secret-change-me",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
  sessionMaxAgeMs: 1000 * 60 * 60 * 8,
  isSecureCookie: process.env.NODE_ENV === "production" || process.env.RENDER === "true"
};
