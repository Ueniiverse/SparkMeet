export async function POST(request: Request): Promise<Response> {
  try {
    const { answers } = (await request.json()) as {
      answers: Array<{ question: string; answer: string }>;
    };

    const aiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    const aiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

    if (!aiBaseUrl || !aiKey) {
      return Response.json({ error: 'AI not configured' }, { status: 500 });
    }

    const prompt = answers
      .map((a, i) => `Frage ${i + 1}: ${a.question}\nAntwort: ${a.answer}`)
      .join('\n\n');

    const res = await fetch(`${aiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        max_tokens: 200,
        messages: [
          {
            role: 'system',
            content:
              'Du bist ein einfühlsamer Persönlichkeitsanalyst für eine Dating-App. ' +
              'Erstelle eine warmherzige, authentische Persönlichkeitsbeschreibung in 2-3 Sätzen (maximal 180 Zeichen). ' +
              'Schreibe in der dritten Person, natürlich und positiv. Beginne nicht mit "Er/Sie ist...".',
          },
          {
            role: 'user',
            content: `Persönlichkeitsfragen und Antworten:\n\n${prompt}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: err }, { status: 502 });
    }

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const summary = data.choices?.[0]?.message?.content?.trim() ?? '';
    return Response.json({ summary });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
    return Response.json({ error: msg }, { status: 500 });
  }
}
