import { CylinderRecord, MachineRecord, OperatorRecord } from '../types';
import { DEFAULT_MACHINES, DEFAULT_OPERATORS } from '../data/defaultMasterData';

export interface SheetInfo {
  id: string;
  title: string;
  sheets: string[];
  hasMachinesSheet: boolean;
  hasOperatorsSheet: boolean;
  hasRegistroSheet: boolean;
}

export const extractSpreadsheetId = (input: string): string => {
  if (!input) return '';
  const trimmed = input.trim();
  // Check for full Google Sheets URL
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Otherwise treat trimmed string as ID
  return trimmed;
};

// Normalize sheet names for matching (handling accents/case)
const normalizeSheetName = (name: string): string => {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

export const fetchSpreadsheetInfo = async (
  accessToken: string,
  spreadsheetId: string
): Promise<SheetInfo> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.error?.message || `Error al acceder al Google Sheet (${res.status})`;
    throw new Error(message);
  }

  const data = await res.json();
  const sheets: string[] = (data.sheets || []).map(
    (s: { properties?: { title?: string } }) => s.properties?.title || ''
  );

  const hasMachinesSheet = sheets.some((s) => {
    const n = normalizeSheetName(s);
    return n.includes('maquina') && n.includes('cd');
  });

  const hasOperatorsSheet = sheets.some((s) => {
    const n = normalizeSheetName(s);
    return n.includes('operador') && n.includes('cd');
  });

  const hasRegistroSheet = sheets.some((s) => {
    const n = normalizeSheetName(s);
    return n === 'registro';
  });

  return {
    id: spreadsheetId,
    title: data.properties?.title || 'Google Sheet',
    sheets,
    hasMachinesSheet,
    hasOperatorsSheet,
    hasRegistroSheet,
  };
};

export const fetchMachinesFromSheet = async (
  accessToken: string,
  spreadsheetId: string,
  actualSheetName: string = 'Máquinas por CD'
): Promise<MachineRecord[]> => {
  const range = encodeURIComponent(`'${actualSheetName}'!A:B`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    console.warn(`No se pudo leer la hoja ${actualSheetName}, usando datos por defecto`);
    return DEFAULT_MACHINES;
  }

  const data = await res.json();
  const rows: string[][] = data.values || [];

  if (rows.length === 0) {
    return DEFAULT_MACHINES;
  }

  const machines: MachineRecord[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;
    const col0 = String(row[0] || '').trim();
    const col1 = String(row[1] || '').trim();

    // Skip header row
    const normCol0 = normalizeSheetName(col0);
    const normCol1 = normalizeSheetName(col1);
    if (normCol0.includes('maquina') || normCol1.includes('cd')) {
      continue;
    }

    if (col0 && col1) {
      machines.push({
        maquina: col0,
        cd: col1,
      });
    }
  }

  return machines.length > 0 ? machines : DEFAULT_MACHINES;
};

export const fetchOperatorsFromSheet = async (
  accessToken: string,
  spreadsheetId: string,
  actualSheetName: string = 'Operadores por CD'
): Promise<OperatorRecord[]> => {
  const range = encodeURIComponent(`'${actualSheetName}'!A:B`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    console.warn(`No se pudo leer la hoja ${actualSheetName}, usando datos por defecto`);
    return DEFAULT_OPERATORS;
  }

  const data = await res.json();
  const rows: string[][] = data.values || [];

  if (rows.length === 0) {
    return DEFAULT_OPERATORS;
  }

  const operators: OperatorRecord[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;
    const col0 = String(row[0] || '').trim();
    const col1 = String(row[1] || '').trim();

    // Skip header row
    const normCol0 = normalizeSheetName(col0);
    const normCol1 = normalizeSheetName(col1);
    if (normCol0.includes('operador') || normCol1.includes('cd')) {
      continue;
    }

    if (col0 && col1) {
      operators.push({
        operador: col0,
        cd: col1,
      });
    }
  }

  return operators.length > 0 ? operators : DEFAULT_OPERATORS;
};

export const appendCylinderRecord = async (
  accessToken: string,
  spreadsheetId: string,
  record: CylinderRecord,
  actualRegistroSheetName: string = 'Registro'
): Promise<void> => {
  const range = encodeURIComponent(`'${actualRegistroSheetName}'!A:Q`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const values = [
    [
      record.fecha,
      record.hora,
      record.cd,
      record.maquina,
      record.operador,
      record.turno,
      record.horometro,
      record.idCilindro,
      record.tara,
      record.pesoLleno,
      record.pesoNeto,
      record.observaciones || '',
      record.usuario,
      record.horometroDetectadoIA !== undefined && record.horometroDetectadoIA !== null ? record.horometroDetectadoIA : '',
      record.horometro,
      record.metodoCaptura || 'fotografia',
      record.fotoEvidenciaUrl || '',
    ],
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message ||
        `Error al guardar en la hoja ${actualRegistroSheetName} (${res.status})`
    );
  }
};

export const fetchRecentRecords = async (
  accessToken: string,
  spreadsheetId: string,
  actualRegistroSheetName: string = 'Registro',
  limit: number = 25
): Promise<CylinderRecord[]> => {
  const range = encodeURIComponent(`'${actualRegistroSheetName}'!A:Q`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  const rows: (string | number)[][] = data.values || [];
  if (rows.length <= 1) return [];

  // Exclude header row if present
  const dataRows = rows.slice(1);
  const recent = dataRows.slice(-limit).reverse();

  return recent.map((row) => ({
    fecha: String(row[0] || ''),
    hora: String(row[1] || ''),
    cd: String(row[2] || ''),
    maquina: String(row[3] || ''),
    operador: String(row[4] || ''),
    turno: (['A', 'B', 'C'].includes(String(row[5])) ? String(row[5]) : 'A') as 'A' | 'B' | 'C',
    horometro: parseFloat(String(row[6])) || 0,
    idCilindro: String(row[7] || ''),
    tara: parseFloat(String(row[8])) || 0,
    pesoLleno: parseFloat(String(row[9])) || 0,
    pesoNeto: parseFloat(String(row[10])) || 0,
    observaciones: String(row[11] || ''),
    usuario: String(row[12] || ''),
    horometroDetectadoIA: row[13] !== undefined && row[13] !== '' ? parseFloat(String(row[13])) : null,
    horometroFinal: row[14] !== undefined && row[14] !== '' ? parseFloat(String(row[14])) : parseFloat(String(row[6])) || 0,
    metodoCaptura: (row[15] as any) || 'fotografia',
    fotoEvidenciaUrl: String(row[16] || ''),
  }));
};

export const initializeSheetsStructure = async (
  accessToken: string,
  spreadsheetId: string
): Promise<{ success: boolean; message: string }> => {
  // First, get existing sheets
  const info = await fetchSpreadsheetInfo(accessToken, spreadsheetId);
  const requests: any[] = [];

  const existingNormalized = info.sheets.map(normalizeSheetName);

  if (!existingNormalized.includes('maquinas por cd')) {
    requests.push({
      addSheet: {
        properties: { title: 'Máquinas por CD' },
      },
    });
  }

  if (!existingNormalized.includes('operadores por cd')) {
    requests.push({
      addSheet: {
        properties: { title: 'Operadores por CD' },
      },
    });
  }

  if (!existingNormalized.includes('registro')) {
    requests.push({
      addSheet: {
        properties: { title: 'Registro' },
      },
    });
  }

  if (requests.length > 0) {
    const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const batchRes = await fetch(batchUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });

    if (!batchRes.ok) {
      const err = await batchRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Error al crear las pestañas en el documento');
    }
  }

  // Now populate header rows and initial master data
  const dataToUpdate: { range: string; values: any[][] }[] = [];

  // Check or initialize 'Registro' headers
  dataToUpdate.push({
    range: `'Registro'!A1:Q1`,
    values: [
      [
        'Fecha',
        'Hora',
        'CD',
        'Máquina',
        'Operador',
        'Turno',
        'Horómetro',
        'ID cilindro lleno',
        'Tara cilindro lleno',
        'Peso cilindro lleno',
        'Peso neto',
        'Observaciones',
        'Usuario',
        'Horómetro detectado IA',
        'Horómetro final',
        'Método captura',
        'URL evidencia foto',
      ],
    ],
  });

  // Populate 'Máquinas por CD' with header + machines if not populated
  const machineRows = [
    ['MÁQUINA', 'CD'],
    ...DEFAULT_MACHINES.map((m) => [m.maquina, m.cd]),
  ];
  dataToUpdate.push({
    range: `'Máquinas por CD'!A1:B${machineRows.length}`,
    values: machineRows,
  });

  // Populate 'Operadores por CD' with header + operators
  const operatorRows = [
    ['OPERADOR', 'CD'],
    ...DEFAULT_OPERATORS.map((o) => [o.operador, o.cd]),
  ];
  dataToUpdate.push({
    range: `'Operadores por CD'!A1:B${operatorRows.length}`,
    values: operatorRows,
  });

  const valueBatchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const valRes = await fetch(valueBatchUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: dataToUpdate,
    }),
  });

  if (!valRes.ok) {
    const err = await valRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Error al configurar encabezados en las hojas');
  }

  return {
    success: true,
    message: 'Estructura de hojas inicializada con éxito con las listas maestras y la hoja Registro.',
  };
};

// =========================================================================================
// GOOGLE APPS SCRIPT WEB APP INTEGRATION (DEPLOYMENT: AKfycbzx4ajtTWfYr1qsmgUbGT34i-VK0uuIShMPPsqcL7KSP6EYZX-iGz_3oOklXxfPHHvs)
// =========================================================================================

export const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzx4ajtTWfYr1qsmgUbGT34i-VK0uuIShMPPsqcL7KSP6EYZX-iGz_3oOklXxfPHHvs/exec';

export interface AppsScriptResponse {
  success: boolean;
  title?: string;
  maquinas?: { maquina: string; cd: string }[];
  operadores?: { operador: string; cd: string }[];
  registrosRecientes?: CylinderRecord[];
  error?: string;
  message?: string;
}

export const fetchFromAppsScript = async (
  scriptUrl: string = DEFAULT_APPS_SCRIPT_URL
): Promise<AppsScriptResponse> => {
  const url = `${scriptUrl}?action=all&t=${Date.now()}`;
  const res = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`Error al consultar Google Apps Script (${res.status})`);
  }

  const data = await res.json();
  return data;
};

export const appendViaAppsScript = async (
  record: CylinderRecord,
  scriptUrl: string = DEFAULT_APPS_SCRIPT_URL
): Promise<{ success: boolean; message: string; data?: any }> => {
  const res = await fetch(scriptUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(record),
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`Error en Google Apps Script (${res.status})`);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Error reportado por Google Apps Script');
  }

  return data;
};

