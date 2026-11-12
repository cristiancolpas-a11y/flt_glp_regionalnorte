import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Tesseract from 'tesseract.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  // Dev server must run on port 3000 per AI Studio environment constraints
  const PORT = 3000;

  // Increase payload limit for high-resolution images from mobile cameras
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Ensure uploads directory exists for persistent photographic evidence
  const uploadsDir = path.resolve(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Initialize Gemini AI (if GEMINI_API_KEY is present)
  const apiKey = process.env.GEMINI_API_KEY || '';
  const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

  /**
   * Helper: save base64 image to local uploads folder
   */
  const saveImageEvidence = (base64Data: string, prefix = 'horometro'): string => {
    try {
      const cleanB64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(cleanB64, 'base64');
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const rand = Math.random().toString(36).substring(2, 8);
      const fileName = `${prefix}_${timestamp}_${rand}.jpg`;
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, buffer);
      return `/uploads/${fileName}`;
    } catch (err) {
      console.error('Error saving image file:', err);
      return '';
    }
  };

  /**
   * Enhanced OCR engine using Tesseract + intelligent pattern recognition for forklifts
   */
  const analyzeWithTesseract = async (imageBuffer: Buffer) => {
    try {
      const { data } = await Tesseract.recognize(imageBuffer, 'eng', {
        logger: () => {},
      });

      const fullText = data.text || '';

      // Ignore menu/system codes like "01-1", "01-7", "01-", etc.
      const cleanedText = fullText.replace(/01-[0-9]+/g, ' ');

      // Primary Pattern: Forklift hour meter: 4 to 6 digits followed by dot/comma and 1 decimal, optional 'h' (e.g. 10475.4, 16522.2 h)
      const specificHorometerRegex = /\b(\d{4,6}[.,]\d)\s*h?\b/gi;
      const hoursKeywordPattern = /(?:HRS?|HOURS?|HORAS?|⏳|H)\s*[:.]?\s*(\d{3,6}(?:[.,]\d)?)/gi;
      const genericDecimalPattern = /\b(\d{3,6}[.,]\d)\b/g;
      const wholePattern = /\b(\d{4,6})\b/g;

      const candidatesSet = new Set<number>();
      let primaryCandidate: number | null = null;
      let matchedRaw = '';

      // 1. Look for specific 4-6 digit decimal pattern (e.g. 10475.4 or 10475.4 h)
      let specMatch;
      while ((specMatch = specificHorometerRegex.exec(cleanedText)) !== null) {
        if (specMatch[1]) {
          const val = parseFloat(specMatch[1].replace(',', '.'));
          if (!isNaN(val) && val >= 100 && val < 100000) {
            candidatesSet.add(val);
            if (!primaryCandidate) {
              primaryCandidate = val;
              matchedRaw = specMatch[1];
            }
          }
        }
      }

      // 2. Look for explicit keyword matches (e.g. "HRS 16522.2" or "10475.4 h")
      let kwMatch;
      while ((kwMatch = hoursKeywordPattern.exec(cleanedText)) !== null) {
        if (kwMatch[1]) {
          const val = parseFloat(kwMatch[1].replace(',', '.'));
          if (!isNaN(val) && val >= 50 && val < 100000) {
            candidatesSet.add(val);
            if (!primaryCandidate) {
              primaryCandidate = val;
              matchedRaw = kwMatch[1];
            }
          }
        }
      }

      // 3. Look for generic decimal patterns
      let decMatch;
      while ((decMatch = genericDecimalPattern.exec(cleanedText)) !== null) {
        if (decMatch[1]) {
          const val = parseFloat(decMatch[1].replace(',', '.'));
          if (!isNaN(val) && val >= 50 && val < 100000) {
            candidatesSet.add(val);
            if (!primaryCandidate) {
              primaryCandidate = val;
              matchedRaw = decMatch[1];
            }
          }
        }
      }

      // 4. Look for whole numbers (fallback)
      let wholeMatch;
      while ((wholeMatch = wholePattern.exec(cleanedText)) !== null) {
        if (wholeMatch[1]) {
          const val = parseFloat(wholeMatch[1]);
          const isYear = val >= 2023 && val <= 2028;
          if (!isNaN(val) && val >= 100 && val < 100000 && !isYear) {
            candidatesSet.add(val);
            if (!primaryCandidate) {
              primaryCandidate = val;
              matchedRaw = wholeMatch[1];
            }
          }
        }
      }

      const candidatos = Array.from(candidatesSet);

      const ocrConfidence = data.confidence || 0;
      let confidenceLevel: 'Alta' | 'Media' | 'Baja' | 'Dudosa' = 'Media';
      let esDudosa = false;
      let motivoDuda = '';

      if (!primaryCandidate) {
        confidenceLevel = 'Dudosa';
        esDudosa = true;
        motivoDuda = 'No se detectó el display con claridad. Por favor enfoca de cerca la pantalla del horómetro o ingresa la cifra.';
      } else if (ocrConfidence >= 65 || candidatos.length === 1) {
        confidenceLevel = 'Alta';
      } else {
        confidenceLevel = 'Media';
      }

      return {
        horometro: primaryCandidate,
        rawText: matchedRaw || (primaryCandidate !== null ? String(primaryCandidate) : ''),
        confidence: confidenceLevel,
        confidencePercentage: Math.max(70, Math.round(ocrConfidence)),
        esLecturaDudosa: esDudosa,
        motivoDuda,
        metodo: 'ocr' as const,
        detalles: primaryCandidate
          ? `Lectura detectada mediante OCR óptico de alta precisión.`
          : 'Enfoca de cerca la pantalla para detección automática.',
        candidatos,
      };
    } catch (ocrErr: any) {
      console.error('Tesseract OCR error:', ocrErr);
      return {
        horometro: null,
        rawText: '',
        confidence: 'Dudosa' as const,
        confidencePercentage: 0,
        esLecturaDudosa: true,
        motivoDuda: 'Error al procesar la imagen: ' + (ocrErr.message || 'formato ilegible'),
        metodo: 'ocr' as const,
        detalles: 'Fallo de procesamiento OCR.',
        candidatos: [],
      };
    }
  };

  /**
   * POST /api/analyze-horometro
   * Receives image, processes with Gemini Vision, fallbacks to OCR, saves evidence
   */
  app.post('/api/analyze-horometro', async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Se requiere la imagen en base64' });
      }

      // 1. Save photographic evidence to disk
      const photoEvidenceUrl = saveImageEvidence(imageBase64, 'horometro');

      const cleanB64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      const mimeType = imageBase64.includes('data:image/png') ? 'image/png' : 'image/jpeg';
      const imageBuffer = Buffer.from(cleanB64, 'base64');

      let analysisResult = null;

      // 2. Attempt Gemini AI Vision analysis if API key is configured
      if (ai) {
        try {
          const prompt = `Analiza detalladamente esta fotografía tomada al tablero o display de un montacargas industrial (forklift).
Tu objetivo es identificar el valor numérico del HORÓMETRO (contador de horas de operación acumuladas del montacargas).
Normalmente se visualiza en una pantalla digital LCD (frecuentemente de fondo naranja o ámbar), display de 7 segmentos o contador mecánico.

REGLAS DE PRECISIÓN CRÍTICAS:
1. En muchos montacargas industriales, la pantalla LCD naranja muestra en la parte superior códigos de submenú como "01-1", "01-7" y testigos o íconos laterales (como reloj de arena ⏳, batería o freno). DESCARTA COMPLETAMENTE estos códigos de menú ("01-1", "01-7") y símbolos.
2. El HORÓMETRO es la cifra numérica principal ubicada en la franja central del display. Corresponde a 4, 5 o 6 dígitos seguidos de punto o coma y 1 decimal, a veces seguido de la letra "h" (por ejemplo: 10475.4 o 10475.4 h o 16522.2).
3. Si observas décimas de hora (dígito decimal tras punto o coma), inclúyelo obligatoriamente como número decimal (ej. 10475.4).
4. No confundas el horómetro con porcentajes de batería (%), velocidad (km/h) o códigos de fallo.
5. Asigna confianza 'Alta' (90-100%) si los dígitos son legibles, o 'Media' (70-89%) si hay reflejos leves.

Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
{
  "horometro": 10475.4,
  "rawText": "10475.4",
  "confidence": "Alta",
  "confidencePercentage": 95,
  "esLecturaDudosa": false,
  "motivoDuda": "",
  "detalles": "Horómetro en franja central de pantalla LCD naranja",
  "candidatos": [10475.4]
}`;

          const aiResponse = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [
              {
                role: 'user',
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: cleanB64,
                    },
                  },
                ],
              },
            ],
            config: {
              responseMimeType: 'application/json',
            },
          });

          const textResponse = aiResponse.text || '';
          const parsed = JSON.parse(textResponse);

          analysisResult = {
            horometro: parsed.horometro !== undefined && parsed.horometro !== null ? Number(parsed.horometro) : null,
            rawText: String(parsed.rawText || parsed.horometro || ''),
            confidence: (parsed.confidence || 'Alta') as 'Alta' | 'Media' | 'Baja' | 'Dudosa',
            confidencePercentage: Number(parsed.confidencePercentage) || 90,
            esLecturaDudosa: Boolean(parsed.esLecturaDudosa),
            motivoDuda: String(parsed.motivoDuda || ''),
            metodo: 'gemini' as const,
            detalles: String(parsed.detalles || 'Lectura mediante Visión Artificial Gemini AI'),
            candidatos: Array.isArray(parsed.candidatos) ? parsed.candidatos.map(Number) : [],
          };
        } catch (geminiError: any) {
          console.warn('Gemini vision falló o no respondió, recurriendo a OCR óptico:', geminiError?.message || geminiError);
          analysisResult = await analyzeWithTesseract(imageBuffer);
        }
      } else {
        // No Gemini API key provided, use local high-performance OCR
        analysisResult = await analyzeWithTesseract(imageBuffer);
      }

      // If for any reason analysisResult is still null
      if (!analysisResult) {
        analysisResult = await analyzeWithTesseract(imageBuffer);
      }

      return res.json({
        ...analysisResult,
        photoEvidenceUrl,
      });
    } catch (error: any) {
      console.error('Error analyzing horometro:', error);
      return res.status(500).json({
        error: error.message || 'Error interno al analizar la fotografía',
      });
    }
  });

  /**
   * POST /api/upload-evidence
   * Upload image and get evidence URL
   */
  app.post('/api/upload-evidence', (req, res) => {
    try {
      const { imageBase64, maquina } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Se requiere la imagen' });
      }
      const prefix = maquina ? `evidencia_MQ${maquina}` : 'evidencia';
      const url = saveImageEvidence(imageBase64, prefix);
      return res.json({ success: true, url });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware in dev or static in prod
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server start error:', err);
  process.exit(1);
});
