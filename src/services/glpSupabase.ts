import { supabase, FOTOS_BUCKET } from '../lib/supabase';
import { CylinderRecord, MachineRecord, OperatorRecord } from '../types';

/**
 * Supabase es la fuente principal del módulo GLP:
 * máquinas y operadores por CD, registros de cambio de cilindro y fotos del horómetro.
 */

export async function cargarMaestros(): Promise<{ maquinas: MachineRecord[]; operadores: OperatorRecord[] }> {
  const [m, o] = await Promise.all([
    supabase.from('glp_maquinas').select('maquina,cd').order('cd').order('maquina'),
    supabase.from('glp_operadores').select('operador,cd').order('cd').order('operador'),
  ]);
  if (m.error) throw m.error;
  if (o.error) throw o.error;
  return { maquinas: m.data || [], operadores: o.data || [] };
}

export async function cargarRecientes(limite = 50): Promise<CylinderRecord[]> {
  const { data, error } = await supabase.rpc('listar_glp_recientes', { p_limite: limite });
  if (error) throw error;
  return (data || []).map((r: any) => ({
    ...r,
    horometro: Number(r.horometro),
    tara: Number(r.tara),
    pesoLleno: Number(r.pesoLleno),
    pesoNeto: Number(r.pesoNeto),
    horometroDetectadoIA: r.horometroDetectadoIA == null ? null : Number(r.horometroDetectadoIA),
    horometroFinal: Number(r.horometroFinal),
  }));
}

async function comprimir(dataUrl: string, max = 1280, calidad = 0.75): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((ok, fail) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = fail;
    i.src = dataUrl;
  });
  const escala = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * escala);
  canvas.height = Math.round(img.height * escala);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((ok, fail) =>
    canvas.toBlob((b) => (b ? ok(b) : fail(new Error('No se pudo procesar la foto'))), 'image/jpeg', calidad)
  );
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
    (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16)
  );
}

export interface ResultadoGuardado {
  id: string;
  pesoNeto: number;
  horasDesdeAnterior: number | null;
  horometroRegresivo: boolean;
}

export async function guardarCambio(record: CylinderRecord, fotoBase64?: string): Promise<ResultadoGuardado> {
  const id = uuid();
  let foto: string | undefined;
  if (fotoBase64 && fotoBase64.startsWith('data:')) {
    try {
      const ruta = `${id}/horometro.jpg`;
      const { error } = await supabase.storage
        .from(FOTOS_BUCKET)
        .upload(ruta, await comprimir(fotoBase64), { contentType: 'image/jpeg', upsert: false });
      if (!error) foto = ruta;
      else console.warn('No se pudo subir la foto del horómetro:', error.message);
    } catch (e) {
      console.warn('No se pudo procesar la foto del horómetro:', e);
    }
  }

  const { data, error } = await supabase.rpc('registrar_cambio_glp', {
    p: {
      id,
      cd: record.cd,
      maquina: record.maquina,
      operador: record.operador,
      turno: record.turno,
      horometro: record.horometro,
      idCilindro: record.idCilindro,
      tara: record.tara,
      pesoLleno: record.pesoLleno,
      observaciones: record.observaciones,
      usuario: record.usuario,
      horometroDetectadoIA: record.horometroDetectadoIA,
      metodoCaptura: record.metodoCaptura,
      confianzaLectura: record.confianzaLectura,
      foto,
    },
  });
  if (error) {
    const sinRed = /Failed to fetch|NetworkError|Load failed/i.test(error.message || '');
    throw new Error(sinRed ? 'Sin conexión. Revise la señal e intente de nuevo.' : error.message);
  }
  return data as ResultadoGuardado;
}
