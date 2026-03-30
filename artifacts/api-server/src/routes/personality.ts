import { Router, type Request, type Response } from "express";

const router = Router();

interface AnswerItem {
  question: string;
  answer: string;
}

router.post("/personality", async (req: Request, res: Response): Promise<void> => {
  try {
    const { answers } = req.body as { answers: AnswerItem[] };

    if (!Array.isArray(answers) || answers.length === 0) {
      res.status(400).json({ error: "Antworten fehlen" });
      return;
    }

    const aiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    const aiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

    if (!aiBaseUrl || !aiKey) {
      res.status(500).json({ error: "AI nicht konfiguriert" });
      return;
    }

    const prompt = answers
      .map((a, i) => `Frage ${i + 1}: ${a.question}\nAntwort: ${a.answer}`)
      .join("\n\n");

    const aiRes = await fetch(`${aiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        max_tokens: 200,
        messages: [
          {
            role: "system",
            content:
              "Du bist ein einfühlsamer Persönlichkeitsanalyst für eine Dating-App. " +
              "Erstelle eine warmherzige, authentische Persönlichkeitsbeschreibung in 2-3 Sätzen (maximal 180 Zeichen). " +
              "Schreibe in der dritten Person, natürlich und positiv. Beginne nicht mit Er/Sie ist.",
          },
          {
            role: "user",
            content: `Persönlichkeitsfragen und Antworten:\n\n${prompt}`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      res.status(502).json({ error: errText });
      return;
    }

    const data = (await aiRes.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const summary = data.choices?.[0]?.message?.content?.trim() ?? "";
    res.json({ summary });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    res.status(500).json({ error: msg });
  }
});

export default router;
