
import { Type } from "@google/genai";
import { Job } from '../types';

/**
 * IMPORTANT:
 * We do NOT call Gemini directly from the browser (API key leak / 403).
 * Instead we call our Vercel Serverless Function: POST /api/gemini
 * Server env var: GEMINI_API_KEY
 */
const GEMINI_TIMEOUT_MS = 120_000;
// Vercel's request payload has a limit; Base64 is larger than the original file.
const MAX_GEMINI_REQUEST_BYTES = 4_000_000;

const callGemini = async (payload: { model: string; contents: any; config?: any }) => {
  const body = JSON.stringify(payload);
  if (new Blob([body]).size > MAX_GEMINI_REQUEST_BYTES) {
    throw new Error('حجم الملفات بعد التحويل أكبر من الحد المسموح. يرجى ضغط السيرة الذاتية والاستمارة ثم إعادة المحاولة.');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({} as any));
    if (!res.ok) {
      const message = typeof data?.error === 'string' ? data.error : 'Gemini request failed (' + res.status + ')';
      throw new Error(message);
    }
    if (typeof data?.text !== 'string' || !data.text.trim()) {
      throw new Error('لم تستجب خدمة الذكاء الاصطناعي بنتيجة صالحة. حاول مرة أخرى.');
    }
    return data as { text: string };
  } catch (error: any) {
    if (controller.signal.aborted) {
      throw new Error('انتهت مهلة تحليل الملف (دقيقتان). يمكنك إعادة المحاولة دون إعادة رفع الملفات.');
    }
    if (error instanceof TypeError) {
      throw new Error('تعذر الاتصال بخدمة تحليل الملفات. يرجى مراجعة الاتصال وإعادة المحاولة.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};


// Helper to convert File to Base64
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string' || !result.includes(',')) {
        reject(new Error('تعذر قراءة الملف المرفوع.'));
        return;
      }
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const mimeTypes: Record<string, string> = {
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        txt: 'text/plain',
      };
      resolve({
        inlineData: {
          data: result.split(',')[1],
          mimeType: file.type || mimeTypes[extension] || 'application/octet-stream',
        },
      });
    };
    reader.onerror = () => reject(new Error('تعذر قراءة الملف المرفوع.'));
    reader.onabort = () => reject(new Error('تم إلغاء قراءة الملف.'));
    reader.readAsDataURL(file);
  });
};

// 1. Analyze CV
export const analyzeCV = async (cvFile: File | null, appFormFile: File | null, jobContext: string | Job[]) => {
  try {
    if (!cvFile && !appFormFile) {
      throw new Error("No files provided for analysis.");
    }
    // Keep the Base64 request below Vercel's request-size limit.
    const combinedBytes = (cvFile?.size || 0) + (appFormFile?.size || 0);
    if (combinedBytes > 2_800_000) {
      throw new Error('حجم السيرة الذاتية والاستمارة كبير جدًا للتحليل المباشر. يرجى تقليل الحجم الإجمالي إلى أقل من 2.8 ميجابايت.');
    }

    const parts = [];

    if (cvFile) {
      const cvPart = await fileToGenerativePart(cvFile);
      parts.push(cvPart);
    }

    if (appFormFile) {
      const appFormPart = await fileToGenerativePart(appFormFile);
      parts.push(appFormPart);
    }

    let promptJobContext = "";
    
    if (Array.isArray(jobContext)) {
      promptJobContext = `
      **CONTEXT - OPEN JOBS LIST:**
      ${JSON.stringify(jobContext.map(j => ({ id: j.id, title: j.title, requirements: j.requirements })), null, 2)}
      `;
    } else {
      promptJobContext = `
      **CONTEXT - JOB DESCRIPTION:**
      ${jobContext}
      `;
    }

    // Stable Schema with ARABIC Enums
    const schema = {
      type: Type.OBJECT,
      properties: {
        isCvOrApplication: { type: Type.BOOLEAN },
        candidateName: { type: Type.STRING },
        bestFitJobId: { type: Type.STRING },
        suitableField: { type: Type.STRING, description: "The most suitable professional field or specialization for the candidate based on their skills (Arabic)." },
        contactInfo: {
          type: Type.OBJECT,
          properties: {
            email: { type: Type.STRING },
            phone: { type: Type.STRING }
          }
        },
        currentLocation: { type: Type.STRING },
        educationLevel: { type: Type.STRING },
        matchScore: { type: Type.INTEGER },
        summary: { type: Type.STRING },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
        recommendation: { 
          type: Type.STRING, 
          // ENUM is in Arabic to ensure output is Arabic
          enum: ['موصى به بشدة', 'موصى به', 'يستحق النظر', 'غير موصى به']
        },
        interviewQuestions: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        identityMismatch: { type: Type.BOOLEAN },
        identityMismatchReason: { type: Type.STRING }
      },
      required: ["candidateName", "matchScore", "summary", "strengths", "weaknesses", "recommendation", "interviewQuestions", "suitableField"],
    };

    const promptText = `
      Act as a strict and critical Senior HR Recruiter.
      Analyze the uploaded documents (CV and/or Application Form).
      
      ${promptJobContext}

      **Tasks & SCORING RULES:**
      1. Extract candidate info (Name, Contact, Location, Education).
      2. If multiple jobs are provided, find the best fit Job ID.
      3. **Evaluate match score (0-100) strictly:**
         - Start at 0. Add points based on matched requirements.
         - **CRITICAL:** If the candidate lacks "Professional Certifications" (like CIPD, SHRM, PMP, SOCPA) and the role typically benefits from them, DEDUCT points. Do NOT give > 90% unless they have RELEVANT certifications and exact experience matches.
         - If experience is general (e.g., "Admin") but job is specific (e.g., "Specialized HR"), the score should not exceed 75%.
         - Be realistic. 95% is for perfect candidates only.
      4. Write a professional summary in Arabic.
      5. List Strengths & Weaknesses in Arabic.
      6. Suggest 5 interview questions in Arabic.
      7. Check for Identity Mismatch if both CV and Form are present (different names).
      8. Determine the single most suitable professional field or specialization in Arabic.

      Return response in JSON format matching the schema.
    `;

    parts.push({ text: promptText });

    const response = await callGemini({
      model: 'gemini-2.5-flash',
      contents: { parts: parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error("No response from AI");

  } catch (error) {
    console.error("Error analyzing CV:", error);
    throw error;
  }
};

export const runOperationsAgent = async (prompt: string, contextData: string, type: 'excel' | 'report' | 'doc', file?: File) => {
  try {
    let systemInstruction = "";
    const parts: any[] = [];
    
    if (file) {
      const f = await fileToGenerativePart(file);
      parts.push(f);
    }

    if (type === 'excel') {
      systemInstruction = `
        You are an Expert Excel Developer. Generate "XML Spreadsheet 2003" format.
        **REQUIREMENTS:**
        1. Valid XML only. Start with <?xml version="1.0"?>.
        2. Use ss:Formula for dynamic cells.
        3. Define Styles (Header, Input, Result).
        4. Arabic text.
        5. RETURN ONLY XML CODE.
      `;
    } else if (type === 'report') {
      systemInstruction = `Senior HR Consultant. Generate strategic report in Arabic Markdown.`;
    } else {
      systemInstruction = `Professional HR Document Writer. Create/Improve documents in Arabic Markdown.`;
    }

    parts.push({ text: `Request: ${prompt}\nContext: ${contextData}` });

    const response = await callGemini({
      model: 'gemini-2.5-flash',
      contents: { parts: parts },
      config: { systemInstruction: systemInstruction }
    });

    let finalText = response.text || "";

    if (type === 'excel') {
      const xmlStart = finalText.indexOf('<?xml');
      if (xmlStart !== -1) finalText = finalText.substring(xmlStart);
      finalText = finalText.replace(/```/g, '').trim();
    }

    return finalText;

  } catch (error) {
    console.error("Error in Operations Agent:", error);
    throw error;
  }
};

export const analyzeAttendance = async (file: File) => {
  try {
    const filePart = await fileToGenerativePart(file);

    const schema = {
      type: Type.OBJECT,
      properties: {
        summary: {
          type: Type.OBJECT,
          properties: {
            totalLateDuration: { type: Type.STRING },
            totalEarlyLeaveDuration: { type: Type.STRING },
            grandTotalDuration: { type: Type.STRING }
          }
        },
        records: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              checkIn: { type: Type.STRING },
              checkOut: { type: Type.STRING },
              lateDuration: { type: Type.STRING },
              earlyDuration: { type: Type.STRING },
              status: { type: Type.STRING },
              severity: { type: Type.STRING, enum: ['red', 'yellow', 'green'] },
              action: { type: Type.STRING }
            }
          }
        }
      }
    };

    const promptText = `
      HR Attendance Processor.
      Rules: Start 07:30 AM (Late > 07:45). End 03:30 PM (15:30).
      Output JSON with calc details in Arabic.
    `;

    const response = await callGemini({
      model: 'gemini-2.5-flash',
      contents: { parts: [filePart, { text: promptText }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    if (response.text) return JSON.parse(response.text);
    throw new Error("No response");

  } catch (error) {
    console.error("Error analyzing attendance:", error);
    throw error;
  }
};

export const chatWithNader = async (
  history: { role: string; parts: { text: string }[] }[],
  newMessage: string
) => {
  // We simulate "chat" by sending the full history as a structured prompt.
  const historyText = (history || [])
    .map((m) => `${m.role?.toUpperCase?.() || "USER"}: ${(m.parts || [])
      .map((p) => p.text)
      .join(" ")}`)
    .join("\n");

  const prompt = `أنت "نادر الذكي"، مساعد موارد بشرية.\n\n${historyText}\nUSER: ${newMessage}`;

  const response = await callGemini({
    model: "gemini-2.5-flash",
    contents: { parts: [{ text: prompt }] },
    config: { systemInstruction: `أنت "نادر الذكي"، مساعد موارد بشرية.` },
  });

  return response.text;
};
