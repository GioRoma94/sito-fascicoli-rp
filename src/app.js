const express = require("express");
const path = require("path");
const { frontendPath } = require("./config");
const { requireAuth } = require("./auth");
const aiRoutes = require("./routes/aiRoutes");
const authRoutes = require("./routes/authRoutes");
const caseRoutes = require("./routes/caseRoutes");
const peopleRoutes = require("./routes/peopleRoutes");

function createApp() {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use(express.static(frontendPath));

  app.use("/api/auth", authRoutes);
  app.use("/api", requireAuth);
  app.use("/api", caseRoutes);
  app.use("/api", peopleRoutes);
  app.use("/api", aiRoutes);

  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });

  return app;
}

module.exports = { createApp };
