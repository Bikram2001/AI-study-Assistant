import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

function validateStudySet(data) {
  if (!data || typeof data !== "object") return "The AI response was not an object.";
  if (typeof data.title !== "string" || !data.title.trim()) return "The response is missing a title.";
  if (!Array.isArray(data.flashcards) || data.flashcards.length < 2) return "The response must contain at least two flashcards.";
  if (!Array.isArray(data.quiz) || data.quiz.length < 2) return "The response must contain at least two quiz questions.";

  const cardsValid = data.flashcards.every(
    (card) => card && typeof card.front === "string" && card.front.trim() &&
      typeof card.back === "string" && card.back.trim()
  );
  if (!cardsValid) return "One or more flashcards have an invalid shape.";

  const quizValid = data.quiz.every(
    (q) => q && typeof q.question === "string" && q.question.trim() &&
      Array.isArray(q.options) && q.options.length >= 2 &&
      q.options.every((option) => typeof option === "string") &&
      Number.isInteger(q.answerIndex) && q.answerIndex >= 0 &&
      q.answerIndex < q.options.length && typeof q.explanation === "string"
  );
  if (!quizValid) return "One or more quiz questions have an invalid shape.";
  return null;
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/study-set", async (req, res) => {
  const topic = typeof req.body?.topic === "string" ? req.body.topic.trim() : "";
  if (!topic) return res.status(400).json({ error: "Please enter some notes or a topic." });
  if (topic.length > 12000) return res.status(400).json({ error: "Please keep your input under 12,000 characters." });
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "The server has no GROQ_API_KEY. Add it to your .env file and restart the server." });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You create clear study materials. Return ONLY a valid JSON object with this exact structure:
{
  "title": "short study set title",
  "flashcards": [{"front":"question or key term","back":"concise answer"}],
  "quiz": [{"question":"multiple-choice question","options":["A","B","C","D"],"answerIndex":0,"explanation":"why this answer is correct"}]
}
Create 8 flashcards and 5 quiz questions. Each quiz answerIndex must be the zero-based index of the correct option. Keep facts faithful to the supplied notes; if the input is a broad topic, use standard introductory-level facts. Do not add markdown fences or extra keys.`
          },
          { role: "user", content: `Create study materials from these notes/topic:\n\n${topic}` }
        ]
      })
    });

    const raw = await response.text();
    if (!response.ok) {
      let detail = "";
      try { detail = JSON.parse(raw)?.error?.message || ""; } catch {}
      return res.status(response.status).json({ error: detail || "The AI provider could not complete the request. Please try again." });
    }

    let payload;
    try { payload = JSON.parse(raw); } catch {
      return res.status(502).json({ error: "The AI provider returned an unreadable response. Please retry." });
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return res.status(502).json({ error: "The AI returned an empty response. Please retry." });
    }

    let studySet;
    try { studySet = JSON.parse(content); } catch {
      return res.status(502).json({ error: "The AI response was not valid JSON. Please retry." });
    }

    const validationError = validateStudySet(studySet);
    if (validationError) return res.status(502).json({ error: `The AI returned incomplete study data: ${validationError}` });

    return res.json(studySet);
  } catch (error) {
    if (error.name === "AbortError") {
      return res.status(504).json({ error: "The AI request took too long. Please try again." });
    }
    console.error("Study set error:", error);
    return res.status(500).json({ error: "Something went wrong on the server. Please try again." });
  } finally {
    clearTimeout(timeout);
  }
});

app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));
