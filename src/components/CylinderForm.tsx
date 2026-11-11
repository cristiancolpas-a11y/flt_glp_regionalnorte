import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MachineRecord,
  OperatorRecord,
  FormData,
  CylinderRecord,
} from '../types';
import {
  Building2,
  Cpu,
  UserCheck,
  Clock3,
  Gauge,
  Tag,
  Scale,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Camera,
  Upload,
  Eye,
  Info,
  Edit3,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { HorometroScannerModal } from './HorometroScannerModal';

interface Props {
  machines: MachineRecord[];
  operators: OperatorRecord[];
  onSubmit: (record: CylinderRecord) => void;
  isSubmitting: boolean;
  currentUserEmail?: string;
  spreadsheetTitle?: string;
  lastSavedRecord?: CylinderRecord | null;
  presetData?: FormData | null;
  recentRecords?: CylinderRecord[];
}

const INITIAL_FORM: FormData = {
  cd: '',
  maquina: '',
  operador: '',
  turno: '',
  horometro: '',
  idCilindro: '',
  tara: '',
  pesoLleno: '',
  observaciones: '',
  horometroDetectadoIA: null,
  metodoCaptura: undefined,
  fotoEvidenciaUrl: '',
  fotoBase64: '',
  confianzaLectura: '',
  esLecturaDudosa: false,
};

export const CylinderForm: React.FC<Props> = ({
  machines,
  operators,
  onSubmit,
  isSubmitting,
  currentUserEmail = 'operaciones@empresa.com',
  spreadsheetTitle,
  lastSavedRecord,
  presetData,
  recentRecords = [],
}) => {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | 'general' | 'pesoDiff', string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});
  const [successBanner, setSuccessBanner] = useState<{
    show: boolean;
    lastRecord?: { idCilindro: string; cd: string; maquina: string; pesoNeto: number };
  }>({ show: false });

  // Horometer scanner modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [confirmLowerAcknowledgment, setConfirmLowerAcknowledgment] = useState(false);

  // Hidden direct triggers for quick photo/gallery
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Handle external preset (e.g. for testing steps)
  useEffect(() => {
    if (presetData) {
      setForm(presetData);
      setTouched({
        cd: !!presetData.cd,
        maquina: !!presetData.maquina,
        operador: !!presetData.operador,
        turno: !!presetData.turno,
        horometro: !!presetData.horometro,
        idCilindro: !!presetData.idCilindro,
        tara: !!presetData.tara,
        pesoLleno: !!presetData.pesoLleno,
      });
      setErrors({});
    }
  }, [presetData]);

  // Reset form and show banner when record is successfully saved
  useEffect(() => {
    if (lastSavedRecord) {
      setForm(INITIAL_FORM);
      setTouched({});
      setErrors({});
      setConfirmLowerAcknowledgment(false);
      setSuccessBanner({
        show: true,
        lastRecord: {
          idCilindro: lastSavedRecord.idCilindro,
          cd: lastSavedRecord.cd,
          maquina: lastSavedRecord.maquina,
          pesoNeto: lastSavedRecord.pesoNeto,
        },
      });
      try {
        confetti({
          particleCount: 40,
          spread: 55,
          origin: { y: 0.6 },
          colors: ['#24465A', '#B28B35', '#374151', '#252B33'],
        });
      } catch {
        // ignore
      }
    }
  }, [lastSavedRecord]);

  // 1. Extract Unique CDs from both machines and operators
  const uniqueCDs = useMemo(() => {
    const set = new Set<string>();
    machines.forEach((m) => {
      if (m.cd && m.cd.trim()) set.add(m.cd.trim());
    });
    operators.forEach((o) => {
      if (o.cd && o.cd.trim()) set.add(o.cd.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [machines, operators]);

  // 2. Filter Machines strictly by selected CD
  const filteredMachines = useMemo(() => {
    if (!form.cd) return [];
    return machines
      .filter((m) => m.cd.trim().toLowerCase() === form.cd.trim().toLowerCase())
      .map((m) => m.maquina)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [machines, form.cd]);

  // 3. Filter Operators strictly by selected CD
  const filteredOperators = useMemo(() => {
    if (!form.cd) return [];
    return operators
      .filter((o) => o.cd.trim().toLowerCase() === form.cd.trim().toLowerCase())
      .map((o) => o.operador)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => a.localeCompare(b));
  }, [operators, form.cd]);

  // When CD changes, IMMEDIATELY clear machine and operator selections
  const handleCdChange = (newCd: string) => {
    setForm((prev) => ({
      ...prev,
      cd: newCd,
      maquina: '', // Mandatory clear
      operador: '', // Mandatory clear
    }));
    setTouched((prev) => ({
      ...prev,
      cd: true,
      maquina: false,
      operador: false,
    }));
    setConfirmLowerAcknowledgment(false);
  };

  // Find latest recorded horometer for the selected machine
  const previousMachineRecord = useMemo(() => {
    if (!form.maquina || !recentRecords || recentRecords.length === 0) return null;
    return recentRecords.find((r) => r.maquina.trim().toLowerCase() === form.maquina.trim().toLowerCase()) || null;
  }, [form.maquina, recentRecords]);

  const currentHorometroNum = parseFloat(form.horometro);
  const isLowerThanPrevious = useMemo(() => {
    if (!previousMachineRecord || isNaN(currentHorometroNum)) return false;
    return currentHorometroNum < previousMachineRecord.horometro;
  }, [previousMachineRecord, currentHorometroNum]);

  // Calculations for Net Weight
  const taraNum = parseFloat(form.tara);
  const pesoLlenoNum = parseFloat(form.pesoLleno);

  const hasValidTara = !isNaN(taraNum) && taraNum > 0;
  const hasValidPesoLleno = !isNaN(pesoLlenoNum) && pesoLlenoNum > 0;

  const pesoNeto = useMemo(() => {
    if (hasValidTara && hasValidPesoLleno) {
      const net = pesoLlenoNum - taraNum;
      return Number(net.toFixed(2));
    }
    return null;
  }, [hasValidTara, hasValidPesoLleno, pesoLlenoNum, taraNum]);

  const isPesoNetoInvalid =
    hasValidTara && hasValidPesoLleno && pesoLlenoNum <= taraNum;

  // Validation function
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData | 'general' | 'pesoDiff', string>> = {};

    // 1. CD obligatorio
    if (!form.cd) {
      newErrors.cd = 'El Centro de Distribución es obligatorio.';
    }

    // 2. Máquina obligatoria y pertenencia al CD
    if (!form.maquina) {
      newErrors.maquina = 'Debe seleccionar una máquina.';
    } else if (
      !machines.some(
        (m) =>
          m.cd.trim().toLowerCase() === form.cd.trim().toLowerCase() &&
          m.maquina === form.maquina
      )
    ) {
      newErrors.maquina = 'La máquina seleccionada no pertenece al CD actual.';
    }

    // 3. Operador obligatorio y pertenencia al CD
    if (!form.operador) {
      newErrors.operador = 'Debe seleccionar un operador.';
    } else if (
      !operators.some(
        (o) =>
          o.cd.trim().toLowerCase() === form.cd.trim().toLowerCase() &&
          o.operador === form.operador
      )
    ) {
      newErrors.operador = 'El operador seleccionado no pertenece al CD actual.';
    }

    // 4. Turno obligatorio
    if (!form.turno) {
      newErrors.turno = 'Seleccione el turno (A, B o C).';
    }

    // 5. Horómetro obligatorio (número, >= 0, no letras)
    if (!form.horometro || form.horometro.trim() === '') {
      newErrors.horometro = 'El horómetro es obligatorio.';
    } else {
      const h = Number(form.horometro);
      if (isNaN(h)) {
        newErrors.horometro = 'El horómetro debe ser un valor numérico.';
      } else if (h < 0) {
        newErrors.horometro = 'El horómetro no puede ser negativo.';
      }
    }

    // Validación de lectura dudosa no autorizada
    if (form.esLecturaDudosa && form.metodoCaptura !== 'correccion_manual') {
      newErrors.horometro = 'La fotografía tiene lectura dudosa. Por favor vuelve a tomarla o realiza una corrección manual autorizada.';
    }

    // Advertencia de horómetro menor al anterior de la misma máquina
    if (isLowerThanPrevious && !confirmLowerAcknowledgment) {
      newErrors.horometro = `El horómetro ingresado (${currentHorometroNum} hrs) es menor al último registrado para la máquina ${form.maquina} (${previousMachineRecord?.horometro} hrs). Debe marcar la casilla de confirmación para guardar.`;
    }

    // 6. ID de cilindro obligatorio
    if (!form.idCilindro || form.idCilindro.trim() === '') {
      newErrors.idCilindro = 'El ID del cilindro lleno es obligatorio.';
    }

    // 7. Tara obligatoria (> 0)
    if (!form.tara || form.tara.trim() === '') {
      newErrors.tara = 'La tara es obligatoria.';
    } else {
      const t = Number(form.tara);
      if (isNaN(t) || t <= 0) {
        newErrors.tara = 'Ingrese un valor de tara válido mayor a 0 kg.';
      }
    }

    // 8. Peso obligatorio (> 0)
    if (!form.pesoLleno || form.pesoLleno.trim() === '') {
      newErrors.pesoLleno = 'El peso del cilindro lleno es obligatorio.';
    } else {
      const p = Number(form.pesoLleno);
      if (isNaN(p) || p <= 0) {
        newErrors.pesoLleno = 'Ingrese un peso lleno válido mayor a 0 kg.';
      }
    }

    // 9. Peso > Tara (OBLIGATORIO)
    if (hasValidTara && hasValidPesoLleno && pesoLlenoNum <= taraNum) {
      newErrors.pesoDiff = 'El peso del cilindro debe ser mayor que la tara.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleQuickFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setForm((prev) => ({
        ...prev,
        fotoBase64: base64,
      }));
      setIsScannerOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyHorometroFromScanner = (scanned: {
    horometro: number;
    horometroDetectadoIA: number | null;
    metodoCaptura: 'fotografia' | 'correccion_manual';
    fotoBase64: string;
    fotoEvidenciaUrl: string;
    confianzaLectura: string;
    esLecturaDudosa: boolean;
  }) => {
    setForm((prev) => ({
      ...prev,
      horometro: String(scanned.horometro),
      horometroDetectadoIA: scanned.horometroDetectadoIA,
      metodoCaptura: scanned.metodoCaptura,
      fotoBase64: scanned.fotoBase64,
      fotoEvidenciaUrl: scanned.fotoEvidenciaUrl,
      confianzaLectura: scanned.confianzaLectura,
      esLecturaDudosa: scanned.esLecturaDudosa,
    }));
    setTouched((prev) => ({ ...prev, horometro: true }));
    setErrors((prev) => ({ ...prev, horometro: undefined }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched: Partial<Record<keyof FormData, boolean>> = {};
    (Object.keys(form) as (keyof FormData)[]).forEach((k) => {
      allTouched[k] = true;
    });
    setTouched(allTouched);

    if (!validate()) {
      return;
    }

    const now = new Date();
    const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(now);
    const hora = now.toLocaleTimeString('en-GB', { timeZone: 'America/Bogota', hour12: false });

    const record: CylinderRecord = {
      fecha,
      hora,
      cd: form.cd,
      maquina: form.maquina,
      operador: form.operador,
      turno: form.turno as 'A' | 'B' | 'C',
      horometro: parseFloat(form.horometro),
      idCilindro: form.idCilindro.trim().toUpperCase(),
      tara: Number(taraNum.toFixed(2)),
      pesoLleno: Number(pesoLlenoNum.toFixed(2)),
      pesoNeto: pesoNeto !== null ? pesoNeto : 0,
      observaciones: form.observaciones.trim(),
      usuario: currentUserEmail,
      horometroDetectadoIA: form.horometroDetectadoIA !== undefined ? form.horometroDetectadoIA : null,
      horometroFinal: parseFloat(form.horometro),
      metodoCaptura: form.metodoCaptura || (form.fotoBase64 ? 'fotografia' : 'manual'),
      fotoEvidenciaUrl: form.fotoEvidenciaUrl || '',
      confianzaLectura: form.confianzaLectura || '',
      fotoBase64: form.fotoBase64 || undefined,
    };

    onSubmit(record);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Hidden File Inputs for Direct Capture */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleQuickFileChange}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleQuickFileChange}
        className="hidden"
      />

      {/* Horometer Scanner Modal */}
      <HorometroScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onApplyHorometro={handleApplyHorometroFromScanner}
        selectedMaquina={form.maquina}
        previousHorometro={previousMachineRecord?.horometro}
        previousDate={previousMachineRecord?.fecha}
      />

      {/* Success Notification Banner */}
      {successBanner.show && (
        <div className="p-4 sm:p-5 bg-white border border-emerald-300 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-start gap-3.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg shrink-0 border border-emerald-200">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm sm:text-base font-bold text-[#24465A] tracking-wide">
                ✓ REGISTRO GUARDADO CORRECTAMENTE
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                La información fue almacenada con evidencia fotográfica en la hoja{' '}
                <strong className="text-[#374151] font-semibold">Registro</strong> de Google Sheets.
              </p>
              {successBanner.lastRecord && (
                <div className="mt-2.5 flex flex-wrap gap-2 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded-md bg-[#E8EBEF] text-[#374151] border border-[#CBD5E1]">
                    Cilindro: <strong>{successBanner.lastRecord.idCilindro}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-[#E8EBEF] text-[#374151] border border-[#CBD5E1]">
                    CD: <strong>{successBanner.lastRecord.cd}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-[#E8EBEF] text-[#374151] border border-[#CBD5E1]">
                    Máq: <strong>{successBanner.lastRecord.maquina}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-[#24465A] text-white font-semibold">
                    Neto: {successBanner.lastRecord.pesoNeto} kg
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => setSuccessBanner({ show: false })}
              className="text-[#64748B] hover:text-[#374151] p-1 text-sm rounded-lg hover:bg-[#E8EBEF] transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: INFORMACIÓN OPERATIVA */}
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 sm:p-7 shadow-sm">
          <div className="flex items-center gap-3 mb-5 pb-3.5 border-b border-[#E2E8F0]">
            <div className="p-2 rounded-lg bg-[#E8EBEF] text-[#24465A] border border-[#CBD5E1]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#24465A] tracking-wide uppercase">
                1. Información Operativa y Horómetro
              </h2>
              <p className="text-xs text-[#64748B]">
                Selección jerárquica: Centro de Distribución → Máquinas y Operadores disponibles
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {/* Campo 1: Centro de Distribución (CD) */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-bold text-[#374151] uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  Centro de Distribución (CD) <span className="text-[#B28B35] font-black">*</span>
                </span>
                <span className="text-[11px] text-[#64748B] font-normal">{uniqueCDs.length} sedes</span>
              </label>

              <select
                value={form.cd}
                onChange={(e) => handleCdChange(e.target.value)}
                onBlur={() => handleBlur('cd')}
                className={`w-full bg-white border rounded-lg px-3.5 py-2.5 sm:py-3 text-sm text-[#374151] focus:outline-none transition-all cursor-pointer ${
                  errors.cd && touched.cd
                    ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:ring-1 focus:ring-rose-500'
                    : form.cd
                    ? 'border-[#24465A] font-semibold text-[#252B33] ring-1 ring-[#24465A]/15'
                    : 'border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#24465A] focus:ring-2 focus:ring-[#24465A]/15'
                }`}
              >
                <option value="" disabled className="text-[#94A3B8]">
                  -- Seleccione Centro de Distribución --
                </option>
                {uniqueCDs.map((c) => (
                  <option key={c} value={c} className="text-[#374151]">
                    {c}
                  </option>
                ))}
              </select>

              {errors.cd && touched.cd && (
                <p className="text-rose-600 text-xs flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {errors.cd}
                </p>
              )}
            </div>

            {/* Campo 2: Máquina (Depende de CD) */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-bold text-[#374151] uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  Máquina (Montacargas) <span className="text-[#B28B35] font-black">*</span>
                </span>
                {form.cd && (
                  <span className="text-[11px] text-[#24465A] font-medium">
                    {filteredMachines.length} máq. en {form.cd}
                  </span>
                )}
              </label>

              <select
                value={form.maquina}
                onChange={(e) => {
                  setForm({ ...form, maquina: e.target.value });
                  setConfirmLowerAcknowledgment(false);
                }}
                onBlur={() => handleBlur('maquina')}
                disabled={!form.cd}
                className={`w-full bg-white border rounded-lg px-3.5 py-2.5 sm:py-3 text-sm text-[#374151] focus:outline-none transition-all ${
                  !form.cd
                    ? 'opacity-50 cursor-not-allowed bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8]'
                    : errors.maquina && touched.maquina
                    ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:ring-1 focus:ring-rose-500 cursor-pointer'
                    : form.maquina
                    ? 'border-[#24465A] font-semibold text-[#252B33] ring-1 ring-[#24465A]/15 cursor-pointer font-mono'
                    : 'border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#24465A] focus:ring-2 focus:ring-[#24465A]/15 cursor-pointer'
                }`}
              >
                <option value="" disabled className="text-[#94A3B8]">
                  {form.cd ? `-- Seleccione Máquina de ${form.cd} --` : '← Seleccione primero un CD'}
                </option>
                {filteredMachines.map((m) => (
                  <option key={m} value={m} className="text-[#374151] font-mono">
                    Máquina {m}
                  </option>
                ))}
              </select>

              {errors.maquina && touched.maquina && (
                <p className="text-rose-600 text-xs flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {errors.maquina}
                </p>
              )}
            </div>

            {/* Campo 3: Operador (Depende de CD) */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-bold text-[#374151] uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  Operador <span className="text-[#B28B35] font-black">*</span>
                </span>
                {form.cd && (
                  <span className="text-[11px] text-[#24465A] font-medium">
                    {filteredOperators.length} op. en {form.cd}
                  </span>
                )}
              </label>

              <select
                value={form.operador}
                onChange={(e) => setForm({ ...form, operador: e.target.value })}
                onBlur={() => handleBlur('operador')}
                disabled={!form.cd}
                className={`w-full bg-white border rounded-lg px-3.5 py-2.5 sm:py-3 text-sm text-[#374151] focus:outline-none transition-all ${
                  !form.cd
                    ? 'opacity-50 cursor-not-allowed bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8]'
                    : errors.operador && touched.operador
                    ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:ring-1 focus:ring-rose-500 cursor-pointer'
                    : form.operador
                    ? 'border-[#24465A] font-semibold text-[#252B33] ring-1 ring-[#24465A]/15 cursor-pointer'
                    : 'border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#24465A] focus:ring-2 focus:ring-[#24465A]/15 cursor-pointer'
                }`}
              >
                <option value="" disabled className="text-[#94A3B8]">
                  {form.cd ? `-- Seleccione Operador de ${form.cd} --` : '← Seleccione primero un CD'}
                </option>
                {filteredOperators.map((o) => (
                  <option key={o} value={o} className="text-[#374151]">
                    {o}
                  </option>
                ))}
              </select>

              {errors.operador && touched.operador && (
                <p className="text-rose-600 text-xs flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {errors.operador}
                </p>
              )}
            </div>

            {/* Campo 4: Turno (A, B, C) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#374151] uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  Turno <span className="text-[#B28B35] font-black">*</span>
                </span>
              </label>

              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {(['A', 'B', 'C'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setForm({ ...form, turno: t });
                      setTouched((prev) => ({ ...prev, turno: true }));
                    }}
                    className={`py-2.5 px-3 rounded-lg font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                      form.turno === t
                        ? 'bg-[#24465A] text-white border-[#24465A] shadow-sm'
                        : 'bg-white text-[#374151] border-[#CBD5E1] hover:bg-[#F8FAFC] hover:border-[#94A3B8]'
                    }`}
                  >
                    <span>Turno {t}</span>
                  </button>
                ))}
              </div>

              {errors.turno && touched.turno && (
                <p className="text-rose-600 text-xs flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {errors.turno}
                </p>
              )}
            </div>

            {/* Campo 5: Horómetro con Captura Inteligente por Foto IA / OCR */}
            <div className="space-y-2 md:col-span-2 pt-2 border-t border-[#E2E8F0]">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#374151] uppercase tracking-wider">
                  <Gauge className="w-4 h-4 text-[#24465A]" />
                  <span>Horómetro de Operación</span> <span className="text-[#B28B35] font-black">*</span>
                </label>

                {/* Botón Principal: CAPTURAR HORÓMETRO */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="px-3.5 py-2 bg-[#24465A] hover:bg-[#1C3646] active:bg-[#152B37] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#B28B35]" />
                    <span>CAPTURAR HORÓMETRO</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    title="Tomar foto con la cámara del celular/tablet"
                    className="px-3 py-2 bg-white hover:bg-[#E8EBEF] text-[#252B33] border border-[#CBD5E1] rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#24465A]" />
                    <span className="hidden sm:inline">Tomar Foto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    title="Cargar fotografía desde la galería"
                    className="px-3 py-2 bg-white hover:bg-[#E8EBEF] text-[#252B33] border border-[#CBD5E1] rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#64748B]" />
                    <span className="hidden sm:inline">Galería</span>
                  </button>
                </div>
              </div>

              {/* Input Numérico del Horómetro */}
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.horometro}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || (!val.includes('-') && !isNaN(Number(val)))) {
                      setForm((prev) => ({
                        ...prev,
                        horometro: val,
                        metodoCaptura:
                          prev.horometroDetectadoIA !== null && String(prev.horometroDetectadoIA) !== val
                            ? 'correccion_manual'
                            : prev.metodoCaptura || 'manual',
                      }));
                    }
                  }}
                  onBlur={() => handleBlur('horometro')}
                  placeholder="Ej: 16522.2 (o pulsa CAPTURAR HORÓMETRO)"
                  className={`w-full bg-white border rounded-lg pl-3.5 pr-14 py-2.5 sm:py-3 text-sm text-[#374151] font-mono focus:outline-none transition-all ${
                    errors.horometro && touched.horometro
                      ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:ring-1 focus:ring-rose-500'
                      : form.horometro
                      ? 'border-[#24465A] ring-1 ring-[#24465A]/15 font-bold text-[#252B33] text-base'
                      : 'border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#24465A] focus:ring-2 focus:ring-[#24465A]/15'
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#E8EBEF] border border-[#CBD5E1] rounded text-[#475569] font-mono text-xs font-bold pointer-events-none">
                  HRS
                </div>
              </div>

              {/* Tarjeta de Evidencia Fotográfica y Auditoría */}
              {form.fotoBase64 && (
                <div className="p-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <img
                      src={form.fotoBase64}
                      alt="Evidencia horómetro"
                      className="w-14 h-14 object-cover rounded-lg border border-[#CBD5E1] shadow-2xs shrink-0"
                    />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#24465A]">
                          Horómetro detectado: {form.horometroDetectadoIA !== null ? `${form.horometroDetectadoIA} horas` : 'Manual'}
                        </span>
                        {form.confianzaLectura && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded font-bold text-[10px]">
                            {form.confianzaLectura}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#64748B]">
                        Método:{' '}
                        <strong className="text-[#374151]">
                          {form.metodoCaptura === 'fotografia'
                            ? 'Fotografía con IA / OCR'
                            : 'Corrección manual autorizada'}
                        </strong>
                      </p>
                      {form.metodoCaptura === 'correccion_manual' && form.horometroDetectadoIA !== null && (
                        <p className="text-[10px] text-[#8F6C20] italic">
                          * Valor detectado originalmente por IA: {form.horometroDetectadoIA} hrs (se guardará para auditoría).
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="px-3 py-1.5 bg-white hover:bg-[#E8EBEF] text-[#24465A] border border-[#CBD5E1] rounded-lg font-semibold text-xs cursor-pointer shadow-2xs"
                  >
                    Cambiar Foto / Validar
                  </button>
                </div>
              )}

              {/* Comparación con el último registro de la misma máquina */}
              {previousMachineRecord && (
                <div className="text-[11px] text-[#64748B] flex flex-wrap items-center justify-between gap-1 pt-1 px-1">
                  <span>
                    Último horómetro registrado de la <strong>Máquina {form.maquina}</strong>:{' '}
                    <strong className="font-mono text-[#24465A]">
                      {previousMachineRecord.horometro.toLocaleString('es-CO', { minimumFractionDigits: 1 })} hrs
                    </strong>{' '}
                    ({previousMachineRecord.fecha})
                  </span>
                  {isLowerThanPrevious && (
                    <span className="text-amber-800 font-bold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Valor inferior al anterior
                    </span>
                  )}
                </div>
              )}

              {/* Advertencia y confirmación si el nuevo horómetro es menor */}
              {isLowerThanPrevious && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs text-amber-900">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Advertencia de Horómetro Inferior</span>
                      <p className="text-amber-800 text-[11px] mt-0.5">
                        El valor ingresado ({form.horometro} hrs) es menor al último registro ({previousMachineRecord?.horometro} hrs). Esto puede deberse a un reemplazo de horómetro, reseteo del tablero o error en la lectura.
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 pt-1 cursor-pointer font-semibold text-[#252B33]">
                    <input
                      type="checkbox"
                      checked={confirmLowerAcknowledgment}
                      onChange={(e) => setConfirmLowerAcknowledgment(e.target.checked)}
                      className="rounded border-[#CBD5E1] text-[#24465A] focus:ring-[#24465A] h-4 w-4"
                    />
                    <span>Confirmo que esta cifra es la correcta para este montacargas.</span>
                  </label>
                </div>
              )}

              {errors.horometro && touched.horometro && (
                <p className="text-rose-600 text-xs flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {errors.horometro}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: INFORMACIÓN DEL CILINDRO */}
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 sm:p-7 shadow-sm">
          <div className="flex items-center gap-3 mb-5 pb-3.5 border-b border-[#E2E8F0]">
            <div className="p-2 rounded-lg bg-[#E8EBEF] text-[#24465A] border border-[#CBD5E1]">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#24465A] tracking-wide uppercase">
                2. Información del Cilindro y Pesaje
              </h2>
              <p className="text-xs text-[#64748B]">
                Control de tara y peso lleno con cálculo de peso neto e inhibición automática si Peso ≤ Tara
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {/* Campo 6: ID de cilindro lleno */}
            <div className="space-y-1.5 md:col-span-3">
              <label className="flex items-center justify-between text-xs font-bold text-[#374151] uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  ID Cilindro Lleno <span className="text-[#B28B35] font-black">*</span>
                </span>
                <span className="text-[11px] text-[#64748B] font-normal">Identificador único</span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={form.idCilindro}
                  onChange={(e) => setForm({ ...form, idCilindro: e.target.value.toUpperCase() })}
                  onBlur={() => handleBlur('idCilindro')}
                  placeholder="Ej: CIL-0941 o GLP-452"
                  className={`w-full bg-white border rounded-lg px-3.5 py-2.5 sm:py-3 text-sm text-[#374151] font-mono uppercase focus:outline-none transition-all ${
                    errors.idCilindro && touched.idCilindro
                      ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:ring-1 focus:ring-rose-500'
                      : form.idCilindro
                      ? 'border-[#24465A] ring-1 ring-[#24465A]/15 font-semibold text-[#252B33]'
                      : 'border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#24465A] focus:ring-2 focus:ring-[#24465A]/15'
                  }`}
                />
              </div>

              {errors.idCilindro && touched.idCilindro && (
                <p className="text-rose-600 text-xs flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {errors.idCilindro}
                </p>
              )}
            </div>

            {/* Campo 7: Tara cilindro lleno (kg) */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-bold text-[#374151] uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  Tara Cilindro <span className="text-[#B28B35] font-black">*</span>
                </span>
                <span className="text-[11px] text-[#64748B] font-normal">Peso vacío</span>
              </label>

              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={form.tara}
                  onChange={(e) => setForm({ ...form, tara: e.target.value })}
                  onBlur={() => handleBlur('tara')}
                  placeholder="Ej: 16.5"
                  className={`w-full bg-white border rounded-lg pl-3.5 pr-12 py-2.5 sm:py-3 text-sm text-[#374151] font-mono focus:outline-none transition-all ${
                    errors.tara && touched.tara
                      ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:ring-1 focus:ring-rose-500'
                      : form.tara
                      ? 'border-[#24465A] ring-1 ring-[#24465A]/15 font-semibold text-[#252B33]'
                      : 'border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#24465A] focus:ring-2 focus:ring-[#24465A]/15'
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-[#E8EBEF] border border-[#CBD5E1] rounded text-[#475569] font-mono text-xs font-semibold pointer-events-none">
                  kg
                </div>
              </div>

              {errors.tara && touched.tara && (
                <p className="text-rose-600 text-xs flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {errors.tara}
                </p>
              )}
            </div>

            {/* Campo 8: Peso cilindro lleno (kg) */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-bold text-[#374151] uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  Peso Lleno <span className="text-[#B28B35] font-black">*</span>
                </span>
                <span className="text-[11px] text-[#64748B] font-normal">Tara + Gas</span>
              </label>

              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={form.pesoLleno}
                  onChange={(e) => setForm({ ...form, pesoLleno: e.target.value })}
                  onBlur={() => handleBlur('pesoLleno')}
                  placeholder="Ej: 33.8"
                  className={`w-full bg-white border rounded-lg pl-3.5 pr-12 py-2.5 sm:py-3 text-sm text-[#374151] font-mono focus:outline-none transition-all ${
                    errors.pesoLleno && touched.pesoLleno
                      ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:ring-1 focus:ring-rose-500'
                      : isPesoNetoInvalid
                      ? 'border-rose-500 bg-rose-50/30'
                      : form.pesoLleno
                      ? 'border-[#24465A] ring-1 ring-[#24465A]/15 font-semibold text-[#252B33]'
                      : 'border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#24465A] focus:ring-2 focus:ring-[#24465A]/15'
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-[#E8EBEF] border border-[#CBD5E1] rounded text-[#475569] font-mono text-xs font-semibold pointer-events-none">
                  kg
                </div>
              </div>

              {errors.pesoLleno && touched.pesoLleno && (
                <p className="text-rose-600 text-xs flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {errors.pesoLleno}
                </p>
              )}
            </div>

            {/* Campo 9: Peso neto (Calculado automáticamente, no editable) */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-bold text-[#374151] uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  Peso Neto (GLP)
                </span>
                <span className="text-[10px] text-[#B28B35] font-semibold">Automático</span>
              </label>

              <div
                className={`w-full rounded-lg pl-3.5 pr-12 py-2.5 sm:py-3 border flex items-center justify-between transition-all ${
                  isPesoNetoInvalid
                    ? 'bg-rose-50 border-rose-400 text-rose-700'
                    : pesoNeto !== null
                    ? 'bg-[#E8EBEF] border-[#24465A]/40 text-[#24465A] ring-1 ring-[#24465A]/15'
                    : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#94A3B8]'
                }`}
              >
                <span className="font-mono text-base font-bold">
                  {pesoNeto !== null ? `${pesoNeto.toFixed(2)}` : '0.00'}
                </span>
                <span className="px-2 py-0.5 bg-white border border-[#CBD5E1] rounded text-[#24465A] font-mono text-xs font-bold shadow-2xs">
                  kg
                </span>
              </div>

              <p className="text-[11px] text-[#64748B]">
                Cálculo: <strong>Peso Lleno - Tara</strong>
              </p>
            </div>
          </div>

          {/* Bloqueo Estricto si Peso Lleno <= Tara */}
          {isPesoNetoInvalid && (
            <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-3 animate-in fade-in duration-200">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-rose-950 uppercase tracking-wide">
                  Error de Pesaje: El peso del cilindro debe ser mayor que la tara
                </h4>
                <p className="text-rose-800 leading-relaxed">
                  El peso lleno ({pesoLlenoNum} kg) no puede ser igual o menor a la tara ({taraNum} kg). El peso neto resultante sería negativo o cero ({pesoNeto} kg). Corrija las cifras de la báscula para habilitar el guardado.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: OBSERVACIONES Y METADATOS */}
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 sm:p-7 shadow-sm">
          <div className="flex items-center gap-3 mb-5 pb-3.5 border-b border-[#E2E8F0]">
            <div className="p-2 rounded-lg bg-[#E8EBEF] text-[#24465A] border border-[#CBD5E1]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#24465A] tracking-wide uppercase">
                3. Observaciones y Usuario Responsable
              </h2>
              <p className="text-xs text-[#64748B]">
                Detalles del cambio de cilindro, estado del equipo y trazabilidad de usuario
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Campo 10: Observaciones */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-bold text-[#374151] uppercase tracking-wider">
                <span>Observaciones Operativas (Opcional)</span>
                <span className="text-[11px] text-[#64748B] font-normal">Máx 250 caracteres</span>
              </label>

              <textarea
                rows={2}
                maxLength={250}
                value={form.observaciones}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                placeholder="Ej: Cambio de cilindro por fin de turno. Fuga descartada, horómetro fotografiado."
                className="w-full bg-white border border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#24465A] focus:ring-2 focus:ring-[#24465A]/15 rounded-lg px-3.5 py-2.5 text-sm text-[#374151] placeholder:text-[#94A3B8] focus:outline-none transition-all"
              />
            </div>

            {/* Campo 11: Usuario (Automático) */}
            <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#374151] uppercase tracking-wider">Usuario Responsable:</span>
                <span className="font-mono text-[#24465A] font-semibold">{currentUserEmail}</span>
              </div>
              <span className="text-[11px] text-[#64748B]">
                Hoja destino: <strong>Registro</strong> ({spreadsheetTitle || 'Google Sheets'})
              </span>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {Object.keys(errors).length > 0 && (
          <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-950">Por favor corrige los siguientes campos:</p>
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                {Object.values(errors).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Action Button: Guardar Registro */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || Boolean(isPesoNetoInvalid)}
            className={`w-full py-4 px-6 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all cursor-pointer shadow-md ${
              isPesoNetoInvalid || isSubmitting
                ? 'bg-[#94A3B8] text-white cursor-not-allowed opacity-60'
                : 'bg-[#24465A] hover:bg-[#1C3646] active:bg-[#152B37] text-white shadow-[#24465A]/20 hover:shadow-lg'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Procesando y Guardando Registro...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-[#B28B35]" />
                <span>Guardar Registro en Google Sheets</span>
                <ArrowRight className="w-4 h-4 text-[#B28B35]" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
