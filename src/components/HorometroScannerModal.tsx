import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Eye,
  ShieldAlert,
  Edit3,
  Sparkles,
  Info,
  Maximize2
} from 'lucide-react';
import { HorometroAnalysisResult } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApplyHorometro: (data: {
    horometro: number;
    horometroDetectadoIA: number | null;
    metodoCaptura: 'fotografia' | 'correccion_manual';
    fotoBase64: string;
    fotoEvidenciaUrl: string;
    confianzaLectura: string;
    esLecturaDudosa: boolean;
  }) => void;
  selectedMaquina?: string;
  previousHorometro?: number | null;
  previousDate?: string;
}

export const HorometroScannerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onApplyHorometro,
  selectedMaquina,
  previousHorometro,
  previousDate,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<(HorometroAnalysisResult & { photoEvidenceUrl?: string }) | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual correction mode
  const [isManualCorrection, setIsManualCorrection] = useState(false);
  const [manualValue, setManualValue] = useState<string>('');
  const [manualReason, setManualReason] = useState<string>('');

  // Lower horometer acknowledgment checkbox
  const [confirmLowerHorometer, setConfirmLowerHorometer] = useState(false);

  // Hidden inputs for camera and gallery
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setImagePreview(null);
      setAnalysisResult(null);
      setErrorMessage(null);
      setIsManualCorrection(false);
      setManualValue('');
      setManualReason('');
      setConfirmLowerHorometer(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Process selected file (compress if large, read as Base64, and call backend)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be reselected
    e.target.value = '';

    // Se reduce la foto (máx. 1600 px, JPEG) para que el envío sea rápido y no supere el límite del servidor
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const reducir = (max: number, calidad: number) => {
        const escala = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', calidad);
      };
      // Foto de evidencia (1600 px) y una copia liviana (960 px) solo para la lectura, que así responde más rápido
      const base64 = reducir(1600, 0.82);
      const ligera = reducir(960, 0.85);
      URL.revokeObjectURL(url);
      setImagePreview(base64);
      analyzePhoto(base64, ligera);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setErrorMessage('No se pudo abrir la imagen. Intenta con otra foto.');
    };
    img.src = url;
  };

  const analyzePhoto = async (base64Image: string, imagenLectura: string = base64Image) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setAnalysisResult(null);
    setIsManualCorrection(false);
    setConfirmLowerHorometer(false);

    try {
      const response = await fetch('/api/analyze-horometro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: imagenLectura,
          maquina: selectedMaquina,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${response.status} al procesar la imagen`);
      }

      const data = await response.json();
      setAnalysisResult(data);

      if (data.horometro !== null) {
        setManualValue(String(data.horometro));
      } else {
        setManualValue('');
      }
    } catch (err: any) {
      console.error('Error analizando horómetro:', err);
      setErrorMessage(err.message || 'No fue posible analizar la imagen. Por favor reintenta con otra foto.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Determine effective value to apply
  const effectiveHorometro = isManualCorrection
    ? parseFloat(manualValue)
    : analysisResult?.horometro !== null && analysisResult?.horometro !== undefined
    ? analysisResult.horometro
    : null;

  const isLowerThanPrevious =
    previousHorometro !== undefined &&
    previousHorometro !== null &&
    effectiveHorometro !== null &&
    !isNaN(effectiveHorometro) &&
    effectiveHorometro < previousHorometro;

  const canApply =
    effectiveHorometro !== null &&
    !isNaN(effectiveHorometro) &&
    effectiveHorometro > 0 &&
    (!isLowerThanPrevious || confirmLowerHorometer) &&
    (!analysisResult?.esLecturaDudosa || isManualCorrection);

  const handleApply = () => {
    if (!canApply || effectiveHorometro === null || !imagePreview) return;

    onApplyHorometro({
      horometro: effectiveHorometro,
      horometroDetectadoIA: analysisResult?.horometro || null,
      metodoCaptura: isManualCorrection ? 'correccion_manual' : 'fotografia',
      fotoBase64: imagePreview,
      fotoEvidenciaUrl: analysisResult?.photoEvidenceUrl || '',
      confianzaLectura: analysisResult?.confidence || 'Alta',
      esLecturaDudosa: Boolean(analysisResult?.esLecturaDudosa),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#252B33]/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header en Gris Grafito #252B33 */}
        <div className="px-5 sm:px-6 py-4 bg-[#252B33] text-white flex items-center justify-between border-b border-[#1E232A]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#24465A] border border-[#B28B35]/40 rounded-xl text-[#B28B35] shadow-xs">
              <Camera className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>Captura Inteligente de Horómetro</span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#B28B35]/20 text-[#D8B15D] border border-[#B28B35]/40">
                  <Sparkles className="w-3 h-3 text-[#B28B35]" /> IA / OCR
                </span>
              </h3>
              <p className="text-xs text-[#94A3B8]">
                {selectedMaquina ? `Montacargas Máquina ${selectedMaquina}` : 'Tablero de control de montacargas'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#94A3B8] hover:text-white p-1.5 rounded-lg hover:bg-[#1E232A] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden File Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto bg-[#F8FAFC] flex-1">
          {/* Previous record reference if exists */}
          {previousHorometro !== undefined && previousHorometro !== null && (
            <div className="p-3 bg-white border border-[#CBD5E1] rounded-xl flex items-center justify-between text-xs text-[#374151]">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#24465A] shrink-0" />
                <span>
                  Último horómetro registrado para <strong>Máquina {selectedMaquina}</strong>:
                </span>
              </div>
              <span className="font-mono font-bold text-[#24465A] bg-[#E8EBEF] px-2.5 py-1 rounded-md text-xs">
                {previousHorometro.toLocaleString('es-CO', { minimumFractionDigits: 1 })} hrs
              </span>
            </div>
          )}

          {/* Initial State: Choose Camera or Gallery */}
          {!imagePreview && (
            <div className="bg-white border-2 border-dashed border-[#CBD5E1] hover:border-[#24465A] transition-colors rounded-2xl p-8 text-center space-y-6">
              <div className="max-w-md mx-auto space-y-2">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-[#E8EBEF] border border-[#CBD5E1] text-[#24465A] flex items-center justify-center">
                  <Camera className="w-8 h-8 stroke-[1.8]" />
                </div>
                <h4 className="text-base font-bold text-[#252B33]">
                  Fotografía el tablero del montacargas
                </h4>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Apunta directamente a la pantalla digital o contador del horómetro. Asegúrate de evitar reflejos intensos para máxima precisión.
                </p>
              </div>

              {/* Two clear buttons: TOMAR FOTO and SELECCIONAR DE GALERÍA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-md mx-auto pt-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full py-3.5 px-4 bg-[#24465A] hover:bg-[#1C3646] active:bg-[#152B37] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-[#B28B35]" />
                  <span>Tomar Foto (Cámara)</span>
                </button>

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-full py-3.5 px-4 bg-white hover:bg-[#E8EBEF] active:bg-[#CBD5E1] text-[#252B33] border border-[#CBD5E1] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-[#24465A]" />
                  <span>Seleccionar de Galería</span>
                </button>
              </div>

              <div className="text-[11px] text-[#94A3B8] max-w-sm mx-auto">
                Compatible con celulares, tablets y computadores. El valor numérico será extraído automáticamente.
              </div>
            </div>
          )}

          {/* Image loaded and being analyzed or analyzed */}
          {imagePreview && (
            <div className="space-y-4">
              {/* Photo Preview and Status */}
              <div className="bg-white border border-[#CBD5E1] rounded-2xl overflow-hidden shadow-xs">
                <div className="relative bg-[#1E232A] flex items-center justify-center max-h-72 overflow-hidden group">
                  <img
                    src={imagePreview}
                    alt="Evidencia horómetro"
                    className="max-h-72 w-auto object-contain mx-auto transition-transform duration-200 group-hover:scale-105"
                  />
                  {/* Overlay scanning line during analysis */}
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-[#24465A]/40 backdrop-blur-[1px] flex flex-col items-center justify-center text-white gap-3 p-4">
                      <RefreshCw className="w-8 h-8 animate-spin text-[#B28B35]" />
                      <div className="text-center space-y-1">
                        <span className="text-sm font-bold tracking-wide">
                          Analizando fotografía con IA / OCR...
                        </span>
                        <p className="text-xs text-[#CBD5E1]">
                          Identificando dígitos del horómetro y validando nitidez
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions overlay on top-right of image */}
                  {!isAnalyzing && (
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        title="Tomar otra foto"
                        className="p-2 bg-[#252B33]/85 hover:bg-[#252B33] text-white rounded-lg text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#B28B35]" />
                        <span className="hidden sm:inline">Nueva Foto</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        title="Cargar de galería"
                        className="p-2 bg-[#252B33]/85 hover:bg-[#252B33] text-white rounded-lg text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#CBD5E1]" />
                        <span className="hidden sm:inline">Galería</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Analysis Result Card */}
                {analysisResult && !isAnalyzing && (
                  <div className="p-5 space-y-4">
                    {/* Detected Value Block */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1]">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                            Horómetro Detectado:
                          </span>
                          {/* Confidence Badge */}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 border ${
                              analysisResult.confidence === 'Alta'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : analysisResult.confidence === 'Media'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}
                          >
                            {analysisResult.confidence === 'Alta' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            {analysisResult.confidence === 'Media' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                            {(analysisResult.confidence === 'Baja' || analysisResult.confidence === 'Dudosa') && (
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                            )}
                            <span>
                              Confianza {analysisResult.confidence} ({analysisResult.confidencePercentage}%)
                            </span>
                          </span>
                        </div>

                        {analysisResult.horometro !== null ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-mono font-extrabold text-[#24465A] tracking-tight">
                              {analysisResult.horometro.toLocaleString('es-CO', { minimumFractionDigits: 1 })}
                            </span>
                            <span className="text-sm font-bold text-[#64748B] uppercase">Horas</span>
                          </div>
                        ) : (
                          <div className="text-rose-700 font-bold text-sm">
                            No fue posible identificar una cifra con suficiente certeza
                          </div>
                        )}

                        {analysisResult.detalles && (
                          <p className="text-[11px] text-[#64748B] mt-1">
                            {analysisResult.detalles}
                          </p>
                        )}
                      </div>

                      {/* Manual correction toggle */}
                      {!isManualCorrection && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsManualCorrection(true);
                            setManualValue(analysisResult.horometro ? String(analysisResult.horometro) : '');
                          }}
                          className="px-3 py-2 bg-white hover:bg-[#E8EBEF] text-[#374151] border border-[#CBD5E1] rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#24465A]" />
                          <span>Corregir manualmente</span>
                        </button>
                      )}
                    </div>

                    {/* Warning: Doubtful or unclear reading */}
                    {analysisResult.esLecturaDudosa && (
                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-900">
                        <div className="flex items-start gap-2.5 font-bold">
                          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span>Lectura poco clara, borrosa o incompleta</span>
                            <p className="font-normal text-rose-800 text-[11px] mt-0.5">
                              {analysisResult.motivoDuda ||
                                'La IA no puede determinar el valor con suficiente certeza. Para evitar errores, no se inventan dígitos.'}
                            </p>
                          </div>
                        </div>
                        <div className="pt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Tomar otra foto más nítida</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsManualCorrection(true);
                              setManualValue('');
                            }}
                            className="px-3.5 py-2 bg-white text-rose-800 border border-rose-300 hover:bg-rose-100 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Validación manual autorizada</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Manual Correction Form if enabled */}
                    {isManualCorrection && (
                      <div className="p-4 bg-[#F8FAFC] border border-[#B28B35]/40 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#252B33] uppercase tracking-wider flex items-center gap-1.5">
                            <Edit3 className="w-3.5 h-3.5 text-[#B28B35]" />
                            <span>Corrección Manual de Horómetro</span>
                          </span>
                          <span className="text-[11px] font-semibold text-[#8F6C20] bg-[#B28B35]/15 px-2 py-0.5 rounded border border-[#B28B35]/30">
                            Quedará constancia en auditoría
                          </span>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#374151] mb-1">
                            Valor verificado por el operador (Horas):
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={manualValue}
                              onChange={(e) => setManualValue(e.target.value)}
                              placeholder="Ej: 16522.2"
                              className="w-full bg-white border border-[#CBD5E1] focus:border-[#24465A] focus:ring-2 focus:ring-[#24465A]/20 rounded-lg px-3.5 py-2.5 text-base font-mono font-bold text-[#24465A]"
                            />
                            <span className="absolute right-3.5 top-3 text-xs font-bold text-[#94A3B8]">
                              HRS
                            </span>
                          </div>
                        </div>

                        {analysisResult.horometro !== null && (
                          <p className="text-[11px] text-[#64748B]">
                            * Valor detectado originalmente por IA: <strong>{analysisResult.horometro} hrs</strong>. Se conservará en la hoja Registro como auditoría.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Warning: Value lower than previous machine record */}
                    {isLowerThanPrevious && (
                      <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2.5 text-xs text-amber-900">
                        <div className="flex items-start gap-2.5 font-bold">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span>Advertencia: Horómetro inferior al último registro</span>
                            <p className="font-normal text-amber-800 text-[11px] mt-0.5">
                              El valor a registrar (<strong>{effectiveHorometro} hrs</strong>) es menor al último registro guardado para la máquina {selectedMaquina} (<strong>{previousHorometro} hrs</strong>).
                            </p>
                          </div>
                        </div>
                        <label className="flex items-center gap-2 pt-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={confirmLowerHorometer}
                            onChange={(e) => setConfirmLowerHorometer(e.target.checked)}
                            className="rounded border-[#CBD5E1] text-[#24465A] focus:ring-[#24465A] h-4 w-4"
                          />
                          <span className="text-xs font-semibold text-[#252B33]">
                            Confirmo que esta lectura es correcta (ej. reemplazo/reseteo de horómetro o tablero).
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* Error message */}
                {errorMessage && (
                  <div className="p-4 bg-rose-50 border-t border-rose-200 flex items-start gap-2 text-xs text-rose-800">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold">Error en la lectura</span>
                      <p>{errorMessage}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 sm:px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#64748B] hover:text-[#252B33] bg-white hover:bg-[#E8EBEF] border border-[#CBD5E1] rounded-xl cursor-pointer transition-colors"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            {imagePreview && (
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-4 py-2.5 bg-white hover:bg-[#E8EBEF] text-[#374151] border border-[#CBD5E1] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                <Camera className="w-4 h-4 text-[#24465A]" />
                <span className="hidden sm:inline">Repetir Foto</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleApply}
              disabled={!canApply || isAnalyzing}
              className="px-6 py-2.5 bg-[#24465A] hover:bg-[#1C3646] active:bg-[#152B37] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4 text-[#B28B35]" />
              <span>Cargar en Formulario</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
