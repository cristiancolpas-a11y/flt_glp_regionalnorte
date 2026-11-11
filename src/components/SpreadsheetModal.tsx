import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Wrench,
  X,
  Code2,
  Copy,
  Check,
} from 'lucide-react';
import { extractSpreadsheetId, fetchSpreadsheetInfo, initializeSheetsStructure } from '../services/sheetsService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  spreadsheetId: string;
  onSaveSpreadsheetId: (id: string) => void;
  onSyncData: () => Promise<void>;
  accessToken: string | null;
}

const APPS_SCRIPT_SNIPPET = `/**
 * RENDIMIENTO GLP REGIONAL NORTE - CONTROL Y REGISTRO DE CILINDROS
 * Código backend para Google Apps Script
 */

const SHEETS = {
  MAQUINAS: 'Máquinas por CD',
  OPERADORES: 'Operadores por CD',
  REGISTRO: 'Registro'
};

const HEADERS_REGISTRO = [
  'Fecha', 'Hora', 'CD', 'Máquina', 'Operador', 'Turno',
  'Horómetro', 'ID cilindro lleno', 'Tara cilindro lleno',
  'Peso cilindro lleno', 'Peso neto', 'Observaciones', 'Usuario',
  'Horómetro detectado IA', 'Horómetro final', 'Método captura', 'URL evidencia foto'
];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('⛽ Control Cilindros')
    .addItem('⚙️ Inicializar / Verificar Hojas Maestras', 'inicializarEstructuraHojas')
    .addToUi();
}

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetMaquinas = ss.getSheetByName(SHEETS.MAQUINAS);
  const dataMaquinas = [];
  if (sheetMaquinas && sheetMaquinas.getLastRow() > 1) {
    const rows = sheetMaquinas.getRange(2, 1, sheetMaquinas.getLastRow() - 1, 2).getValues();
    rows.forEach(r => { if (r[0] && r[1]) dataMaquinas.push({ maquina: String(r[0]), cd: String(r[1]) }); });
  }

  const sheetOperadores = ss.getSheetByName(SHEETS.OPERADORES);
  const dataOperadores = [];
  if (sheetOperadores && sheetOperadores.getLastRow() > 1) {
    const rows = sheetOperadores.getRange(2, 1, sheetOperadores.getLastRow() - 1, 2).getValues();
    rows.forEach(r => { if (r[0] && r[1]) dataOperadores.push({ operador: String(r[0]), cd: String(r[1]) }); });
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    maquinas: dataMaquinas,
    operadores: dataOperadores
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const data = JSON.parse(e.postData.contents);
    const tara = Number(data.tara);
    const pesoLleno = Number(data.pesoLleno);

    if (pesoLleno <= tara) throw new Error('El peso del cilindro debe ser mayor que la tara.');
    const pesoNeto = Number((pesoLleno - tara).toFixed(2));

    const now = new Date();
    const tz = Session.getScriptTimeZone() || 'America/Bogota';
    const fecha = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
    const hora = Utilities.formatDate(now, tz, 'HH:mm:ss');

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEETS.REGISTRO);
    if (!sheet) {
      sheet = ss.insertSheet(SHEETS.REGISTRO);
      sheet.appendRow(HEADERS_REGISTRO);
    }

    sheet.appendRow([
      fecha, hora, data.cd, data.maquina, data.operador, data.turno,
      Number(data.horometro), String(data.idCilindro).toUpperCase(),
      tara, pesoLleno, pesoNeto, data.observaciones || '', data.usuario || ''
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: '✓ Registro guardado correctamente'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;

export const SpreadsheetModal: React.FC<Props> = ({
  isOpen,
  onClose,
  spreadsheetId,
  onSaveSpreadsheetId,
  onSyncData,
  accessToken,
}) => {
  const [activeTab, setActiveTab] = useState<'sheet' | 'appsScript'>('sheet');
  const [inputVal, setInputVal] = useState(spreadsheetId);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [sheetDetails, setSheetDetails] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async (idToTest?: string) => {
    const raw = idToTest !== undefined ? idToTest : inputVal;
    const cleanId = extractSpreadsheetId(raw);
    if (!cleanId) {
      setStatusMsg({ type: 'error', text: 'Por favor ingresa un enlace o ID de Google Sheets válido.' });
      return;
    }

    if (!accessToken) {
      setStatusMsg({ type: 'error', text: 'Debes iniciar sesión con Google primero para verificar el documento.' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    try {
      const info = await fetchSpreadsheetInfo(accessToken, cleanId);
      setSheetDetails(info);
      onSaveSpreadsheetId(cleanId);
      setInputVal(cleanId);
      await onSyncData();
      setStatusMsg({
        type: 'success',
        text: `¡Conexión exitosa con "${info.title}"! Se han sincronizado las máquinas y operadores.`,
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Error al conectar con la hoja de Google Sheets. Verifica los permisos de acceso.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeSheets = async () => {
    const cleanId = extractSpreadsheetId(inputVal);
    if (!cleanId || !accessToken) return;

    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await initializeSheetsStructure(accessToken, cleanId);
      setStatusMsg({ type: 'success', text: res.message });
      await handleTestConnection(cleanId);
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Error al crear la estructura de hojas.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const cleanId = extractSpreadsheetId(inputVal);
  const googleSheetsLink = cleanId ? `https://docs.google.com/spreadsheets/d/${cleanId}/edit` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252B33]/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="bg-white border border-[#CBD5E1] rounded-xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header en Gris Grafito */}
        <div className="px-6 py-4 bg-[#252B33] text-white flex items-center justify-between border-b border-[#1E232A]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#24465A] border border-[#B28B35]/40 rounded-lg text-[#B28B35]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Conexión con Google Sheets
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Base de datos principal para lectura de maestros y almacenamiento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#94A3B8] hover:text-white p-1 rounded-lg hover:bg-[#1E232A] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('sheet')}
            className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'sheet'
                ? 'border-[#24465A] text-[#24465A]'
                : 'border-transparent text-[#64748B] hover:text-[#374151]'
            }`}
          >
            Enlace / ID Google Sheets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('appsScript')}
            className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'appsScript'
                ? 'border-[#24465A] text-[#24465A]'
                : 'border-transparent text-[#64748B] hover:text-[#374151]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Código Google Apps Script</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto bg-white flex-1">
          {activeTab === 'sheet' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-[#374151] uppercase tracking-wider mb-1.5">
                  Enlace o ID del Archivo Google Sheets
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder="Pega la URL del archivo (https://docs.google.com/spreadsheets/d/...) o su ID"
                    className="flex-1 bg-white border border-[#CBD5E1] focus:border-[#24465A] focus:ring-2 focus:ring-[#24465A]/15 rounded-lg px-3.5 py-2.5 text-sm text-[#374151] placeholder:text-[#94A3B8] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleTestConnection()}
                    disabled={loading || !accessToken}
                    className="px-4 py-2.5 bg-[#24465A] hover:bg-[#1C3646] active:bg-[#152B37] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Conectar
                  </button>
                </div>
                <p className="text-[11px] text-[#64748B] mt-1.5">
                  El formulario leerá dinámicamente las hojas <strong>"Máquinas por CD"</strong> y <strong>"Operadores por CD"</strong>, y guardará los registros en <strong>"Registro"</strong>.
                </p>
              </div>

              {/* Direct link if valid ID */}
              {googleSheetsLink && (
                <div className="flex items-center justify-between p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs">
                  <span className="text-[#374151] font-medium">Abrir hoja en Google Sheets:</span>
                  <a
                    href={googleSheetsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[#24465A] hover:text-[#1C3646] font-semibold underline"
                  >
                    <span>Ver documento</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Status Message */}
              {statusMsg && (
                <div
                  className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                    statusMsg.type === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : statusMsg.type === 'error'
                      ? 'bg-rose-50 border-rose-300 text-rose-800'
                      : 'bg-blue-50 border-blue-300 text-blue-800'
                  }`}
                >
                  {statusMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{statusMsg.text}</span>
                </div>
              )}

              {/* Sheets Structure Verification */}
              {sheetDetails && (
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 space-y-3">
                  <h4 className="text-xs font-bold text-[#252B33] uppercase tracking-wider">
                    Verificación de Hojas Requeridas
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-md bg-white border border-[#E2E8F0]">
                      <span className="text-[#374151] font-medium">Máquinas por CD:</span>
                      {sheetDetails.hasMachinesSheet ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Detectada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#B28B35] font-semibold text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5" /> No encontrada
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-md bg-white border border-[#E2E8F0]">
                      <span className="text-[#374151] font-medium">Operadores por CD:</span>
                      {sheetDetails.hasOperatorsSheet ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Detectada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#B28B35] font-semibold text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5" /> No encontrada
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-md bg-white border border-[#E2E8F0]">
                      <span className="text-[#374151] font-medium">Registro:</span>
                      {sheetDetails.hasRegistroSheet ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Detectada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#B28B35] font-semibold text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5" /> No encontrada
                        </span>
                      )}
                    </div>
                  </div>

                  {(!sheetDetails.hasMachinesSheet ||
                    !sheetDetails.hasOperatorsSheet ||
                    !sheetDetails.hasRegistroSheet) && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleInitializeSheets}
                        disabled={loading || !accessToken}
                        className="w-full py-2.5 px-3 bg-[#24465A] hover:bg-[#1C3646] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                      >
                        <Wrench className="w-4 h-4 text-[#B28B35]" />
                        <span>Crear / Inicializar pestañas faltantes en mi Google Sheets</span>
                      </button>
                      <p className="text-[11px] text-[#64748B] text-center mt-1">
                        Creará las 3 pestañas con sus columnas maestras y datos base automáticamente.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#24465A] uppercase tracking-wider">
                    Código Google Apps Script (Código.gs)
                  </h4>
                  <p className="text-[11px] text-[#64748B]">
                    Guarda este código en <strong>Extensiones &gt; Apps Script</strong> en tu Google Sheets
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="px-3 py-1.5 bg-[#24465A] hover:bg-[#1C3646] text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? '¡Copiado!' : 'Copiar Código'}</span>
                </button>
              </div>

              <div className="bg-[#1E232A] text-[#E2E8F0] p-3.5 rounded-lg font-mono text-[11px] max-h-60 overflow-y-auto leading-relaxed border border-[#3E4754]">
                <pre>{APPS_SCRIPT_SNIPPET}</pre>
              </div>

              <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#374151] space-y-1.5">
                <span className="font-bold text-[#252B33] block">Pasos de instalación rápida:</span>
                <ol className="list-decimal pl-4 space-y-1 text-[11px] text-[#64748B]">
                  <li>Abre tu archivo Google Sheets y ve al menú <strong>Extensiones &gt; Apps Script</strong>.</li>
                  <li>Borra el código que aparezca y pega este script.</li>
                  <li>Guarda y haz clic en <strong>Implementar &gt; Nueva implementación</strong>.</li>
                  <li>Selecciona tipo: <strong>Aplicación web</strong>, acceso: <em>Cualquier usuario</em>.</li>
                  <li>¡Listo! El script gestionará la lectura y registro de cilindros automáticamente.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-[#374151] bg-white hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
