// Función de Vercel: lectura del horómetro con Gemini (equivale a /api/analyze-horometro de server.ts).
// Requiere la variable de entorno GEMINI_API_KEY en Vercel. Sin ella, la app pide escribir el valor a mano.
import { GoogleGenAI } from '@google/genai';

const PROMPT = `Analiza esta fotografía del tablero o display de un montacargas industrial (forklift) e identifica el valor del HORÓMETRO (contador de horas de operación).
Suele verse en un display LCD, de 7 segmentos o mecánico, a veces con un reloj de arena, "HRS", "HOURS" o "H". Puede tener décimas (ej. 16522.2).
Reglas: no inventes dígitos; ignora velocidad, batería, temperatura o códigos de error.
Si la lectura es clara usa confianza "Alta" (90-100). Con dudas menores "Media" (70-89). Si es ilegible o faltan dígitos usa "Baja" o "Dudosa", esLecturaDudosa=true y horometro=null.
Responde SOLO JSON: {"horometro": number|null, "rawText": string, "confidence": "Alta"|"Media"|"Baja"|"Dudosa", "confidencePercentage": number, "esLecturaDudosa": boolean, "motivoDuda": string, "detalles": string}`;

export const config = { maxDuration: 30 };

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'La lectura automática no está configurada. Escribe el horómetro manualmente.' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const imageBase64: string = body.imageBase64 || '';
    const m = imageBase64.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (!m) return res.status(400).json({ error: 'Se requiere una imagen JPEG, PNG o WEBP' });
    if (m[2].length > 4_000_000) return res.status(413).json({ error: 'La imagen es demasiado grande' });

    const ai = new GoogleGenAI({ apiKey });
    const r = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: PROMPT }, { inlineData: { mimeType: m[1], data: m[2] } }] }],
      config: { responseMimeType: 'application/json' },
    });
    const p = JSON.parse(r.text || '{}');
    const horometro = p.horometro === null || p.horometro === undefined || isNaN(Number(p.horometro)) ? null : Number(p.horometro);
    return res.status(200).json({
      horometro,
      rawText: String(p.rawText ?? horometro ?? ''),
      confidence: ['Alta', 'Media', 'Baja', 'Dudosa'].includes(p.confidence) ? p.confidence : 'Media',
      confidencePercentage: Number(p.confidencePercentage) || 0,
      esLecturaDudosa: Boolean(p.esLecturaDudosa) || horometro === null,
      motivoDuda: String(p.motivoDuda || ''),
      metodo: 'gemini',
      detalles: String(p.detalles || 'Lectura con visión artificial (Gemini)'),
      photoEvidenceUrl: '',
    });
  } catch (err: any) {
    return res.status(502).json({ error: 'No fue posible leer el horómetro automáticamente. Escríbelo manualmente.', detalle: err?.message });
  }
}
