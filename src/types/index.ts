export interface MachineRecord {
  maquina: string;
  cd: string;
}

export interface OperatorRecord {
  operador: string;
  cd: string;
}

export interface CylinderRecord {
  fecha: string;
  hora: string;
  cd: string;
  maquina: string;
  operador: string;
  turno: 'A' | 'B' | 'C';
  horometro: number;
  idCilindro: string;
  tara: number;
  pesoLleno: number;
  pesoNeto: number;
  observaciones: string;
  usuario: string;
  // Campos de evidencia inteligente del horómetro
  horometroDetectadoIA?: number | null;
  horometroFinal?: number;
  metodoCaptura?: 'fotografia' | 'correccion_manual' | 'manual';
  fotoEvidenciaUrl?: string;
  confianzaLectura?: string;
  fotoBase64?: string; // Solo en memoria: se sube al almacenamiento y no se guarda en el registro
}

export interface FormData {
  cd: string;
  maquina: string;
  operador: string;
  turno: 'A' | 'B' | 'C' | '';
  horometro: string;
  idCilindro: string;
  tara: string;
  pesoLleno: string;
  observaciones: string;
  // Auditoría y captura inteligente
  horometroDetectadoIA?: number | null;
  metodoCaptura?: 'fotografia' | 'correccion_manual' | 'manual';
  fotoEvidenciaUrl?: string;
  fotoBase64?: string;
  confianzaLectura?: string;
  esLecturaDudosa?: boolean;
}

export interface SheetConfig {
  spreadsheetId: string;
  spreadsheetTitle?: string;
  spreadsheetUrl?: string;
  connectedAt?: string;
}

export interface HorometroAnalysisResult {
  horometro: number | null;
  rawText: string;
  confidence: 'Alta' | 'Media' | 'Baja' | 'Dudosa';
  confidencePercentage: number;
  esLecturaDudosa: boolean;
  motivoDuda?: string;
  metodo: 'gemini' | 'ocr';
  detalles?: string;
  candidatos?: number[];
}
