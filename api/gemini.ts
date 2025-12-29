import { GoogleGenAI } from "@google/genai";

/**
 * Server-side Gemini proxy.
 * Keeps the API key on the server (Vercel env: GEMINI_API_KEY).
 *
 * POST /api/gemini
 * body: { model: string, contents: any, config?: any }
 */
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY; // fallback if you already used API_KEY
  if (!apiKey) {
    res.status(500).json({ error: "Missing GEMINI_API_KEY in server environment variables" });
    return;
  }

  try {
    const { model, contents, config } = (req.body || {}) as {
      model?: string;
      contents?: any;
      config?: any;
    };

    if (!model || !contents) {
      res.status(400).json({ error: "Missing model or contents" });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model,
      contents,
      config,
    });

    // Return a minimal payload (front-end expects .text)
    res.status(200).json({
      text: response.text ?? "",
      raw: response, // keep for debugging if needed
    });
  } catch (e: any) {
    const message = e?.message || String(e);
    res.status(500).json({ error: message });
  }
}
