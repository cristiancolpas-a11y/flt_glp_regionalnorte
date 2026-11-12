import React from 'react';
import { User } from 'firebase/auth';
import {
  History,
  LogOut,
  Truck,
} from 'lucide-react';

interface Props {
  user: User | null;
  onLogout: () => void;
  onOpenRecentRecords: () => void;
  recordsCount: number;
}

export const Header: React.FC<Props> = ({
  user,
  onLogout,
  onOpenRecentRecords,
  recordsCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#252B33] text-white border-b border-[#1E232A] shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#24465A] border border-[#B28B35]/40 flex items-center justify-center text-[#B28B35] shadow-sm font-bold">
            <Truck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Rendimiento GLP Regional Norte
              </h1>
            </div>
            <p className="text-[11px] text-[#94A3B8] font-normal hidden md:block">
              Control de pesaje y cambio de cilindros de montacargas
            </p>
          </div>
        </div>

        {/* Actions / Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Recent Records button */}
          <button
            type="button"
            onClick={onOpenRecentRecords}
            title="Ver registros guardados en hoja Registro"
            className="px-3.5 py-2 bg-[#1E232A] hover:bg-[#2F3742] text-[#E2E8F0] border border-[#3E4754] rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all hover:border-[#4B5565]"
          >
            <History className="w-4 h-4 text-[#B28B35]" />
            <span className="hidden sm:inline">Historial Registro</span>
            {recordsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-[#B28B35] text-[#252B33] font-bold rounded-full text-[10px]">
                {recordsCount}
              </span>
            )}
          </button>

          {/* User profile (only if signed in, without showing login button) */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-[#3E4754]">
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1E232A] rounded-lg border border-[#3E4754]">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Usuario'}
                    className="w-6 h-6 rounded-full border border-[#B28B35]/60"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#B28B35] text-[#252B33] font-bold text-xs flex items-center justify-center">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-xs text-[#E2E8F0] font-medium hidden md:inline max-w-[120px] truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                title="Cerrar sesión"
                className="p-2 text-[#94A3B8] hover:text-rose-400 hover:bg-[#1E232A] rounded-lg border border-transparent hover:border-rose-900/40 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
