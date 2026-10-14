import { GoogleGenAI } from "@google/genai";

/**
 * Server-only Gemini proxy. Never return the API key or the raw model response.
 * Client payload: { model, contents, config }. No candidate details are logged.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "خدمة التحليل غير مهيأة؛ مفتاح Gemini غير موجود على الخادم." });
    return;
  }

  try {
    const { model, contents, config } = req.body || {};
    if (!model || !contents) {
      res.status(400).json({ error: "بيانات طلب التحليل غير مكتملة." });
      return;
    }
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({ model, contents, config });
    res.status(200).json({ text: response.text ?? "" });
  } catch (error: any) {
    const rawStatus = Number(error?.status || error?.code || 0);
    const status = [400, 401, 403, 413, 429, 503, 504].includes(rawStatus)
      ? rawStatus : 502;
    const description = status === 429
      ? 'تم تجاوز حصة استخدام Gemini. يرجى الانتظار ثم إعادة المحاولة.'
      : status === 401 || status === 403
        ? 'تعذر الاتصال بخدمة Gemini بسبب صلاحية المفتاح. راجع إعدادات المفتاح.'
        : status === 413
          ? 'حجم الملفات أكبر من الحد المسموح.'
          : status === 400
            ? 'لم تتمكن خدمة Gemini من معالجة نوع الملف أو صيغة الطلب.'
            : 'تعذر إكمال تحليل الملفات. يرجى إعادة المحاولة لاحقًا.';
    // Do not log provider responses or applicant data.
    console.error("Gemini analysis request failed", { status });
    res.status(status).json({ error: description });
  }
}
