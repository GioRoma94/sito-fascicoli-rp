const crypto = require("crypto");
const {
  authPassword,
  authSecret,
  authUser,
  isSecureCookie,
  sessionMaxAgeMs
} = require("./config");

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
  res.cookie("case_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie,
    maxAge: sessionMaxAgeMs
  });
}

function clearSessionCookie(res) {
  res.clearCookie("case_session", {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie
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

function credentialsAreValid(username, password) {
  return safeCompare(username, authUser) && safeCompare(password, authPassword);
}

module.exports = {
  clearSessionCookie,
  createSessionToken,
  credentialsAreValid,
  getSessionUser,
  requireAuth,
  setSessionCookie
};
