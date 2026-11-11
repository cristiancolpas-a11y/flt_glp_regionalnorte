import React, { useState } from 'react';
import { CylinderRecord } from '../types';
import {
  FileText,
  RefreshCw,
  X,
  Search,
  Clock,
  Calendar,
  User,
  Scale,
  Gauge,
  ExternalLink,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  records: CylinderRecord[];
  onRefresh: () => Promise<void>;
  loading: boolean;
}

export const RecentRecordsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  records,
  onRefresh,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cdFilter, setCdFilter] = useState('');

  if (!isOpen) return null;

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      searchTerm === '' ||
      r.idCilindro.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.maquina.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.operador.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.observaciones && r.observaciones.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCd = cdFilter === '' || r.cd === cdFilter;
    return matchesSearch && matchesCd;
  });

  const uniqueCds = Array.from(new Set(records.map((r) => r.cd))).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#252B33]/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="bg-white border border-[#CBD5E1] rounded-xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        {/* Header en Gris Grafito */}
        <div className="px-6 py-4 bg-[#252B33] text-white flex items-center justify-between border-b border-[#1E232A]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#24465A] border border-[#B28B35]/40 rounded-lg text-[#B28B35]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Registros en Google Sheets
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Historial de operaciones almacenadas en la hoja <span className="text-[#D8B15D] font-semibold">Registro</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRefresh()}
              disabled={loading}
              title="Actualizar datos desde Google Sheets"
              className="p-2 text-[#E2E8F0] hover:text-white bg-[#1E232A] hover:bg-[#2F3742] border border-[#3E4754] rounded-lg transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-[#B28B35] ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#94A3B8] hover:text-white hover:bg-[#1E232A] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ID cilindro, máquina, operador..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#374151] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#24465A]"
            />
          </div>
          {uniqueCds.length > 0 && (
            <select
              value={cdFilter}
              onChange={(e) => setCdFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#374151] focus:outline-none focus:border-[#24465A]"
            >
              <option value="">Todos los CD ({records.length})</option>
              {uniqueCds.map((cd) => (
                <option key={cd} value={cd}>
                  {cd}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Record List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-[#E8EBEF]/40">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-xl border border-[#CBD5E1]">
              <div className="w-12 h-12 rounded-xl bg-[#E8EBEF] border border-[#CBD5E1] flex items-center justify-center mx-auto mb-3 text-[#24465A]">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-[#252B33]">No se encontraron registros</p>
              <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
                Los registros guardados en la hoja "Registro" de Google Sheets se sincronizarán aquí.
              </p>
            </div>
          ) : (
            filteredRecords.map((r, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-white border border-[#CBD5E1] hover:border-[#94A3B8] shadow-xs transition-all space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#B28B35]/15 text-[#8F6C20] border border-[#B28B35]/40">
                      CD {r.cd}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#E8EBEF] text-[#24465A]">
                      Máq: {r.maquina}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
                      Turno {r.turno}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#64748B]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {r.fecha}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {r.hora}
                    </span>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[#64748B] text-[10px] uppercase font-bold block">Operador</span>
                    <span className="font-semibold text-[#252B33] flex items-center gap-1 mt-0.5">
                      <User className="w-3.5 h-3.5 text-[#94A3B8]" /> {r.operador}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] text-[10px] uppercase font-bold block">Horómetro</span>
                    <span className="font-mono font-semibold text-[#374151] flex items-center gap-1 mt-0.5">
                      <Gauge className="w-3.5 h-3.5 text-[#B28B35]" /> {r.horometro} hrs
                    </span>
                    {r.metodoCaptura && (
                      <span className="text-[10px] text-[#24465A] font-semibold block mt-0.5">
                        {r.metodoCaptura === 'fotografia' ? '📷 Foto IA' : '✏️ Corrección manual'}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[#64748B] text-[10px] uppercase font-bold block">ID Cilindro</span>
                    <span className="font-mono font-bold text-[#24465A] mt-0.5 block">
                      {r.idCilindro}
                    </span>
                    {r.fotoEvidenciaUrl && (
                      <a
                        href={r.fotoEvidenciaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[#24465A] hover:underline font-semibold mt-0.5"
                      >
                        <ExternalLink className="w-3 h-3 text-[#B28B35]" />
                        <span>Ver Foto</span>
                      </a>
                    )}
                  </div>
                  <div>
                    <span className="text-[#64748B] text-[10px] uppercase font-bold block">Pesos (kg)</span>
                    <div className="text-[11px] font-mono mt-0.5 text-[#374151]">
                      <span>Tara: {r.tara}</span> | <span>Lleno: {r.pesoLleno}</span>
                      <p className="text-[#24465A] font-bold flex items-center gap-1">
                        <Scale className="w-3 h-3 text-[#B28B35]" /> Neto: {r.pesoNeto} kg
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes & User */}
                {(r.observaciones || r.usuario) && (
                  <div className="pt-2 border-t border-[#E2E8F0] text-[11px] text-[#64748B] flex flex-wrap justify-between items-center gap-2">
                    {r.observaciones ? (
                      <span className="italic text-[#374151]">"{r.observaciones}"</span>
                    ) : (
                      <span className="text-[#94A3B8]">Sin observaciones</span>
                    )}
                    {r.usuario && (
                      <span className="text-[10px] text-[#64748B]">
                        Por: {r.usuario}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
          <span>Mostrando {filteredRecords.length} registro(s)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-[#F1F5F9] text-[#374151] border border-[#CBD5E1] rounded-lg cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
