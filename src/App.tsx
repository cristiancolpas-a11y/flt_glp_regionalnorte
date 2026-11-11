import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
} from './lib/firebase';
import {
  MachineRecord,
  OperatorRecord,
  CylinderRecord,
  FormData,
} from './types';
import { DEFAULT_MACHINES, DEFAULT_OPERATORS } from './data/defaultMasterData';
import {
  fetchMachinesFromSheet,
  fetchOperatorsFromSheet,
  fetchRecentRecords,
  appendCylinderRecord,
  fetchSpreadsheetInfo,
  DEFAULT_APPS_SCRIPT_URL,
  fetchFromAppsScript,
  appendViaAppsScript,
} from './services/sheetsService';
import { cargarMaestros, cargarRecientes, guardarCambio } from './services/glpSupabase';
import { Header } from './components/Header';
import { CylinderForm } from './components/CylinderForm';
import { ConfirmModal } from './components/ConfirmModal';
import { SpreadsheetModal } from './components/SpreadsheetModal';
import { RecentRecordsModal } from './components/RecentRecordsModal';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

const STORAGE_SHEET_KEY = 'MONTA_CYLINDER_SHEET_ID';
const STORAGE_APPS_SCRIPT_KEY = 'MONTA_APPS_SCRIPT_URL';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);


  // Google Apps Script Web App URL
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(() => {
    return localStorage.getItem(STORAGE_APPS_SCRIPT_KEY) || DEFAULT_APPS_SCRIPT_URL;
  });

  // Spreadsheet configuration (for direct OAuth if needed)
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_SHEET_KEY) || '';
  });
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>('FLT');

  // Master lists (Machines and Operators)
  const [machines, setMachines] = useState<MachineRecord[]>(DEFAULT_MACHINES);
  const [operators, setOperators] = useState<OperatorRecord[]>(DEFAULT_OPERATORS);
  const [isSyncingMasterData, setIsSyncingMasterData] = useState(false);
  const [dataSource, setDataSource] = useState<'sheets' | 'local'>('sheets');

  // Registered Records in "Registro"
  const [records, setRecords] = useState<CylinderRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Form submission and confirmation modal
  const [pendingRecord, setPendingRecord] = useState<CylinderRecord | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedRecord, setLastSavedRecord] = useState<CylinderRecord | null>(null);

  // Modals
  const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState(false);
  const [isRecentRecordsModalOpen, setIsRecentRecordsModalOpen] = useState(false);


  // Toast notifications
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // 1. Sync data via Google Apps Script Web App
  const syncAppsScriptData = useCallback(
    async (urlToUse?: string) => {
      const targetUrl = urlToUse || appsScriptUrl || DEFAULT_APPS_SCRIPT_URL;
      if (!targetUrl) return;

      setIsSyncingMasterData(true);
      try {
        const res = await fetchFromAppsScript(targetUrl);
        if (res.success) {
          if (res.title) setSpreadsheetTitle(res.title);
          if (res.maquinas && res.maquinas.length > 0) {
            setMachines(res.maquinas);
          }
          if (res.operadores && res.operadores.length > 0) {
            setOperators(res.operadores);
          }
          if (res.registrosRecientes) {
            setRecords(res.registrosRecientes);
          }
          setDataSource('sheets');
        }
      } catch (err: any) {
        console.warn('Apps Script sync aviso:', err.message);
      } finally {
        setIsSyncingMasterData(false);
      }
    },
    [appsScriptUrl]
  );

  // 2. Sync data directly via Google Sheets API (if OAuth token present)
  const syncGoogleSheetsData = useCallback(
    async (tokenToUse?: string, idToUse?: string) => {
      const activeToken = tokenToUse || accessToken;
      const activeSheetId = idToUse || spreadsheetId;

      if (!activeToken || !activeSheetId) {
        // Fallback to Apps Script
        return syncAppsScriptData();
      }

      setIsSyncingMasterData(true);
      try {
        const info = await fetchSpreadsheetInfo(activeToken, activeSheetId);
        setSpreadsheetTitle(info.title);

        const fetchedMachines = await fetchMachinesFromSheet(activeToken, activeSheetId);
        if (fetchedMachines && fetchedMachines.length > 0) {
          setMachines(fetchedMachines);
        }

        const fetchedOperators = await fetchOperatorsFromSheet(activeToken, activeSheetId);
        if (fetchedOperators && fetchedOperators.length > 0) {
          setOperators(fetchedOperators);
        }

        const recent = await fetchRecentRecords(activeToken, activeSheetId);
        setRecords(recent);

        setDataSource('sheets');
        showToast(`Datos maestros sincronizados desde "${info.title}"`, 'success');
      } catch (err: any) {
        console.error('Error syncing Google Sheets:', err);
        // Fallback to Apps Script
        syncAppsScriptData();
      } finally {
        setIsSyncingMasterData(false);
      }
    },
    [accessToken, spreadsheetId, syncAppsScriptData]
  );

  // Datos maestros e historial desde Supabase (fuente principal)
  const syncSupabase = useCallback(async () => {
    setIsSyncingMasterData(true);
    try {
      const { maquinas, operadores } = await cargarMaestros();
      if (maquinas.length) setMachines(maquinas);
      if (operadores.length) setOperators(operadores);
      setRecords(await cargarRecientes(50));
      setSpreadsheetTitle('FLT');
    } catch (err: any) {
      console.warn('No se pudo sincronizar con la base de datos:', err?.message);
      showToast('Sin conexión con la base de datos. Se usan los datos guardados en la app.', 'error');
    } finally {
      setIsSyncingMasterData(false);
    }
  }, []);

  useEffect(() => {
    syncSupabase();
  }, [syncSupabase]);

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        if (spreadsheetId) {
          syncGoogleSheetsData(token, spreadsheetId);
        }
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [spreadsheetId, syncGoogleSheetsData]);

  // Handle Login
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        showToast(`Sesión iniciada como ${result.user.displayName || result.user.email}`, 'success');

        if (spreadsheetId) {
          await syncGoogleSheetsData(result.accessToken, spreadsheetId);
        }
      }
    } catch (err: any) {
      console.error('Error logging in:', err);
      showToast(err.message || 'Error al iniciar sesión con Google', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      showToast('Sesión cerrada correctamente', 'info');
    } catch {
      showToast('Error al cerrar sesión', 'error');
    }
  };

  // Save Spreadsheet ID
  const handleSaveSpreadsheetId = (newId: string) => {
    setSpreadsheetId(newId);
    localStorage.setItem(STORAGE_SHEET_KEY, newId);
    if (accessToken && newId) {
      syncGoogleSheetsData(accessToken, newId);
    }
  };

  // User submits form -> validate & show Confirmation Modal (as required by Workspace skill)
  const handleFormSubmit = (record: CylinderRecord) => {
    setPendingRecord(record);
    setIsConfirmModalOpen(true);
  };

  // Confirm registration and save directly to Google Sheets via Apps Script or REST API
  const handleConfirmSubmit = async () => {
    if (!pendingRecord) return;

    setIsSubmitting(true);
    try {
      // 1. Guardado principal en Supabase (incluye la foto del horómetro)
      const { fotoBase64, ...registro } = pendingRecord;
      const r = await guardarCambio(registro, fotoBase64);
      showToast(
        r.horometroRegresivo
          ? '✓ Registro guardado. Atención: el horómetro es menor que el último registrado para esta máquina.'
          : '✓ Registro guardado correctamente',
        r.horometroRegresivo ? 'info' : 'success'
      );

      // 2. Copia en la hoja Registro y foto en Drive (no bloquea el guardado principal)
      if (appsScriptUrl) {
        appendViaAppsScript(pendingRecord, appsScriptUrl).catch((e) =>
          console.warn('No se pudo copiar a la hoja Registro:', e?.message)
        );
      } else if (accessToken && spreadsheetId) {
        appendCylinderRecord(accessToken, spreadsheetId, registro).catch((e) =>
          console.warn('No se pudo copiar a la hoja Registro:', e?.message)
        );
      }

      // Successfully registered!
      setLastSavedRecord(pendingRecord);
      setRecords((prev) => [pendingRecord, ...prev]);
      setIsConfirmModalOpen(false);
      setPendingRecord(null);

      // Refrescar historial desde la base de datos
      setTimeout(() => {
        cargarRecientes(50).then(setRecords).catch(() => {});
      }, 600);
    } catch (err: any) {
      console.error('Error saving record to Google Sheets:', err);
      showToast(
        `No se guardó el registro: ${err.message || 'intenta de nuevo'}`,
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefreshRecords = async () => {
    setLoadingRecords(true);
    try {
      setRecords(await cargarRecientes(50));
      showToast('Historial actualizado', 'success');
    } catch {
      showToast('Error al actualizar registros', 'error');
    } finally {
      setLoadingRecords(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E8EBEF] text-[#374151] flex flex-col antialiased">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-xs sm:text-sm font-semibold bg-white ${
              toast.type === 'success'
                ? 'border-emerald-500 text-emerald-800'
                : toast.type === 'error'
                ? 'border-rose-500 text-rose-800'
                : 'border-[#24465A] text-[#252B33]'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-[#24465A] shrink-0" />}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-[#64748B] hover:text-[#374151] ml-2 text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Navigation Header in Gris Grafito #252B33 */}
      <Header
        user={user}
        onLogout={handleLogout}
        spreadsheetId={spreadsheetId || appsScriptUrl}
        spreadsheetTitle={spreadsheetTitle}
        onOpenSpreadsheetModal={() => setIsSpreadsheetModalOpen(true)}
        onOpenRecentRecords={() => setIsRecentRecordsModalOpen(true)}
        recordsCount={records.length}
      />

      {/* Main Content Area on Fondo Gris Claro #E8EBEF */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <CylinderForm
          machines={machines}
          operators={operators}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
          currentUserEmail={user?.email || 'soporte.regionalnorte@fleetmanagement-rn.com'}
          spreadsheetTitle={spreadsheetTitle || 'Google Sheets'}
          lastSavedRecord={lastSavedRecord}
          recentRecords={records}
        />
      </main>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmSubmit}
        record={pendingRecord}
        spreadsheetTitle={spreadsheetTitle || 'Google Sheets'}
        isSubmitting={isSubmitting}
        isConnectedToSheets={true}
      />

      {/* Spreadsheet Connection Modal */}
      <SpreadsheetModal
        isOpen={isSpreadsheetModalOpen}
        onClose={() => setIsSpreadsheetModalOpen(false)}
        spreadsheetId={spreadsheetId}
        onSaveSpreadsheetId={handleSaveSpreadsheetId}
        onSyncData={syncGoogleSheetsData}
        accessToken={accessToken}
      />

      {/* Recent Records Modal */}
      <RecentRecordsModal
        isOpen={isRecentRecordsModalOpen}
        onClose={() => setIsRecentRecordsModalOpen(false)}
        records={records}
        onRefresh={handleRefreshRecords}
        loading={loadingRecords}
      />

      {/* Footer in Gris Grafito #252B33 */}
      <footer className="mt-auto border-t border-[#1E232A] bg-[#252B33] text-[#94A3B8] py-5 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white">Rendimiento GLP Regional Norte</span>
          </div>
          <span className="text-[11px] text-[#94A3B8]">
            Hojas: Máquinas por CD • Operadores por CD • Registro
          </span>
        </div>
      </footer>
    </div>
  );
}
