const express = require("express");
const {
  clearSessionCookie,
  createSessionToken,
  credentialsAreValid,
  getSessionUser,
  setSessionCookie
} = require("../auth");

const router = express.Router();

router.get("/me", (req, res) => {
  const username = getSessionUser(req);
  res.json({ authenticated: Boolean(username), username });
});

router.post("/login", (req, res) => {
  const username = String(req.body.username || "");
  const password = String(req.body.password || "");

  if (!credentialsAreValid(username, password)) {
    res.status(401).json({ error: "Invalid credentials." });
    return;
  }

  setSessionCookie(res, createSessionToken(username));
  res.json({ authenticated: true, username });
});

router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

module.exports = router;
