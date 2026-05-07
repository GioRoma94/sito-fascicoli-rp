const express = require("express");
const { anthropicApiKey, anthropicModel } = require("../config");
const { formatCaseContext, getCaseContext } = require("../caseContext");

const router = express.Router();

router.post("/ai/questions", async (req, res) => {
  try {
    if (!anthropicApiKey) {
      res.status(503).json({
        error: "ANTHROPIC_API_KEY not configured.",
        message: "Configura ANTHROPIC_API_KEY nelle variabili ambiente per attivare Claude."
      });
      return;
    }

    const caseId = String(req.body.caseId || "");
    const question = String(req.body.question || "");
    if (!caseId || !question.trim()) {
      res.status(400).json({ error: "Case and question are required." });
      return;
    }

    const caseFile = await getCaseContext(caseId);
    if (!caseFile) {
      res.status(404).json({ error: "Case not found." });
      return;
    }

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: anthropicModel,
        max_tokens: 900,
        temperature: 0.4,
        system:
          "Sei un assistente per fascicoli investigativi RP. Rispondi in italiano, con tono operativo da terminale investigativo. Usa solo il contesto fornito: se manca un dato, dillo chiaramente. Puoi proporre domande RP, piste, riassunti e contraddizioni, ma distingui sempre fatti registrati da ipotesi.",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `CONTESTO FASCICOLO\n${formatCaseContext(caseFile)}\n\nDOMANDA UTENTE\n${question}`
              }
            ]
          }
        ]
      })
    });

    if (!claudeResponse.ok) {
      const errorBody = await claudeResponse.text();
      console.error("Claude API error:", errorBody);
      res.status(502).json({ error: "Claude API request failed." });
      return;
    }

    const payload = await claudeResponse.json();
    const answer = payload.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    res.json({
      status: "ok",
      model: anthropicModel,
      message: answer || "Claude non ha restituito testo."
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to ask Claude." });
  }
});

module.exports = router;
