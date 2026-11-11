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
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Increase payload limit for high-resolution images
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Ensure uploads directory exists for persistent photographic evidence
  const uploadsDir = path.resolve(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Initialize Gemini AI
  const ai = new GoogleGenAI();

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
   * Fallback: OCR engine using Tesseract + regex extraction
   */
  const analyzeWithTesseract = async (imageBuffer: Buffer) => {
    try {
      const { data } = await Tesseract.recognize(imageBuffer, 'eng', {
        logger: () => {},
      });

      const fullText = data.text || '';
      const lines = fullText.split('\n');

      // Search for numbers typically on forklift hour meters: e.g. 16522.2, 1450.5, 8432, 1205.1
      // Match patterns with 3-6 digits, optional decimal comma or period
      const patterns = [
        /(?:HRS?|HOURS?|HORAS?|⏳)?\s*(\d{1,6}[.,]\d)\b/i,
        /\b(\d{3,6}[.,]\d)\b/,
        /\b(\d{3,6})\b/,
      ];

      let detectedNum: number | null = null;
      let matchedRaw = '';

      for (const pattern of patterns) {
        const match = fullText.match(pattern);
        if (match && match[1]) {
          const cleanStr = match[1].replace(',', '.');
          const val = parseFloat(cleanStr);
          if (!isNaN(val) && val > 0 && val < 100000) {
            detectedNum = val;
            matchedRaw = match[1];
            break;
          }
        }
      }

      // Check confidence based on Tesseract confidence score and clarity
      const ocrConfidence = data.confidence || 0;
      let confidenceLevel: 'Alta' | 'Media' | 'Baja' | 'Dudosa' = 'Baja';
      let esDudosa = false;
      let motivoDuda = '';

      if (!detectedNum) {
        confidenceLevel = 'Dudosa';
        esDudosa = true;
        motivoDuda = 'No se detectó ningún valor numérico claro en el tablero del montacargas.';
      } else if (ocrConfidence >= 75) {
        confidenceLevel = 'Alta';
      } else if (ocrConfidence >= 55) {
        confidenceLevel = 'Media';
      } else {
        confidenceLevel = 'Dudosa';
        esDudosa = true;
        motivoDuda = 'La lectura no es totalmente nítida (pantalla borrosa o con reflejos). Se recomienda verificar.';
      }

      return {
        horometro: detectedNum,
        rawText: matchedRaw || fullText.trim().slice(0, 30),
        confidence: confidenceLevel,
        confidencePercentage: Math.round(ocrConfidence),
        esLecturaDudosa: esDudosa,
        motivoDuda,
        metodo: 'ocr' as const,
        detalles: `Procesado mediante OCR local. Confianza calculada: ${Math.round(ocrConfidence)}%.`,
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

      // 2. Attempt Gemini AI Vision analysis
      try {
        const prompt = `Analiza detalladamente esta fotografía tomada al tablero o display de un montacargas industrial (forklift).
Tu objetivo es identificar el valor numérico del HORÓMETRO (contador de horas de operación del montacargas).
Normalmente se visualiza en una pantalla digital LCD, display de 7 segmentos o contador mecánico con dígitos y a veces un símbolo de reloj de arena (⏳), "HRS", "HOURS" o "H".
Muchos montacargas registran décimas de hora con un punto decimal o un dígito de diferente color (por ejemplo 16522.2 o 1450.5 o 8920).

REGLAS CRÍTICAS DE PRECISIÓN:
1. No inventes dígitos si la pantalla está borrosa, cortada, con reflejos o parcialmente oculta.
2. Si la lectura es clara e inequívoca, asigna confianza 'Alta' (90-100%).
3. Si hay reflejos leves o dudas menores, asigna 'Media' (70-89%).
4. Si la pantalla es ilegible, no muestra el horómetro, está demasiado borrosa o faltan dígitos, asigna 'Dudosa' o 'Baja', marca esLecturaDudosa=true, pon horometro=null y describe el motivo de la duda.
5. Ignora velocidades (km/h), porcentaje de batería, temperatura o códigos de error si aparecen en la misma pantalla.

Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
{
  "horometro": 16522.2, // número float con decimal si existe, o null si es dudosa
  "rawText": "16522.2", // texto exacto observado
  "confidence": "Alta", // "Alta" | "Media" | "Baja" | "Dudosa"
  "confidencePercentage": 95, // 0 a 100
  "esLecturaDudosa": false, // true si no se puede leer con certeza total
  "motivoDuda": "", // explicación clara si esLecturaDudosa es true
  "detalles": "Pantalla digital LCD nítida con 5 dígitos enteros y 1 decimal"
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
        };
      } catch (geminiError: any) {
        console.warn('Gemini vision not available or failed, falling back to OCR:', geminiError?.message || geminiError);
        // Fallback to local high-performance OCR
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
      server: { middlewareMode: true },
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
