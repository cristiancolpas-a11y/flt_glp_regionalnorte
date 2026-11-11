import React from 'react';
import { CylinderRecord } from '../types';
import { AlertCircle, FileSpreadsheet, X, Camera, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  record: CylinderRecord | null;
  spreadsheetTitle?: string;
  isSubmitting: boolean;
  isConnectedToSheets?: boolean;
  onConnectGoogle?: () => void;
}

export const ConfirmModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  record,
  spreadsheetTitle = 'Google Sheets',
  isSubmitting,
  isConnectedToSheets = true,
  onConnectGoogle,
}) => {
  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252B33]/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="bg-white border border-[#CBD5E1] rounded-xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header en Gris Grafito */}
        <div className="px-6 py-4 bg-[#252B33] text-white flex items-center justify-between border-b border-[#1E232A]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#24465A] border border-[#B28B35]/40 rounded-lg text-[#B28B35]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Confirmar Registro Operativo
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Se guardará una nueva fila en la hoja <span className="text-[#D8B15D] font-semibold">Registro</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-[#94A3B8] hover:text-white transition-colors p-1 rounded-lg hover:bg-[#1E232A] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto bg-white">
          {isConnectedToSheets ? (
            <div className="p-3.5 bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg text-[#374151] text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#24465A] shrink-0 mt-0.5" />
              <span>
                Por favor revisa que todos los datos operativos y pesajes del cilindro sean correctos antes de confirmar la escritura en el archivo <strong>{spreadsheetTitle}</strong>.
              </span>
            </div>
          ) : (
            <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-[#92400E] text-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#B28B35] shrink-0 mt-0.5" />
                <span>
                  <strong>Atención:</strong> Aún no has conectado tu cuenta de Google Sheets. El registro se guardará en tu historial de sesión local para pruebas.
                </span>
              </div>
              {onConnectGoogle && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onConnectGoogle();
                  }}
                  className="w-full py-1.5 px-3 bg-[#24465A] hover:bg-[#1C3646] text-white font-bold rounded text-xs tracking-wide transition-colors cursor-pointer"
                >
                  Conectar Google Sheets Ahora
                </button>
              )}
            </div>
          )}

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg divide-y divide-[#E2E8F0] text-sm">
            {/* Operational Info */}
            <div className="p-4 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B28B35]">
                Información Operativa
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#64748B]">Centro de Dist.:</span>
                  <p className="font-semibold text-[#252B33]">{record.cd}</p>
                </div>
                <div>
                  <span className="text-[#64748B]">Máquina:</span>
                  <p className="font-semibold text-[#24465A] font-mono text-sm">{record.maquina}</p>
                </div>
                <div>
                  <span className="text-[#64748B]">Operador:</span>
                  <p className="font-semibold text-[#252B33]">{record.operador}</p>
                </div>
                <div>
                  <span className="text-[#64748B]">Turno:</span>
                  <p className="font-semibold text-[#252B33]">Turno {record.turno}</p>
                </div>
                <div className="col-span-2 p-2.5 bg-white border border-[#CBD5E1] rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Horómetro Final:</span>
                    <span className="font-mono font-bold text-base text-[#24465A]">
                      {record.horometro.toFixed(1)} hrs
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                    <span>Método de captura:</span>
                    <span className="font-semibold text-[#252B33] capitalize">
                      {record.metodoCaptura === 'fotografia' ? 'Fotografía con IA / OCR' : record.metodoCaptura === 'correccion_manual' ? 'Corrección manual autorizada' : 'Manual'}
                    </span>
                  </div>
                  {record.horometroDetectadoIA !== undefined && record.horometroDetectadoIA !== null && (
                    <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                      <span>Detectado originalmente por IA:</span>
                      <span className="font-mono">{record.horometroDetectadoIA} hrs</span>
                    </div>
                  )}
                  {record.fotoEvidenciaUrl && (
                    <div className="pt-1.5 flex items-center gap-2 text-[11px] text-emerald-800">
                      <Camera className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Evidencia fotográfica adjunta</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cylinder Info */}
            <div className="p-4 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B28B35]">
                Pesaje y Cilindro
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#64748B]">ID Cilindro:</span>
                  <p className="font-semibold text-[#24465A] font-mono">{record.idCilindro}</p>
                </div>
                <div>
                  <span className="text-[#64748B]">Tara (vacío):</span>
                  <p className="font-semibold text-[#374151] font-mono">{record.tara.toFixed(2)} kg</p>
                </div>
                <div>
                  <span className="text-[#64748B]">Peso Cilindro Lleno:</span>
                  <p className="font-semibold text-[#374151] font-mono">{record.pesoLleno.toFixed(2)} kg</p>
                </div>
                <div className="p-2 bg-[#E8EBEF] border border-[#CBD5E1] rounded-lg">
                  <span className="text-[#24465A] text-[10px] font-bold uppercase">Peso Neto Calculado:</span>
                  <p className="font-bold text-[#24465A] font-mono text-base">
                    {record.pesoNeto.toFixed(2)} kg
                  </p>
                </div>
              </div>
            </div>

            {/* Observations & User */}
            <div className="p-4 space-y-2 text-xs">
              <div>
                <span className="text-[#64748B]">Observaciones:</span>
                <p className="text-[#374151] italic mt-0.5">
                  {record.observaciones ? `"${record.observaciones}"` : 'Ninguna'}
                </p>
              </div>
              <div className="pt-2 border-t border-[#E2E8F0] flex justify-between text-[11px] text-[#64748B]">
                <span>Usuario: <strong className="text-[#374151]">{record.usuario}</strong></span>
                <span>{record.fecha} {record.hora}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#F1F5F9] rounded-lg transition-colors cursor-pointer border border-[#CBD5E1]"
          >
            Cancelar / Corregir
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-[#24465A] hover:bg-[#1C3646] active:bg-[#152B37] text-white font-bold text-sm tracking-wide rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Guardando en Google Sheets...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#B28B35]" />
                <span>Confirmar y Guardar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
