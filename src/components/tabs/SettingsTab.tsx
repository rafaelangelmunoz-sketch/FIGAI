import React, { useState } from 'react';
import {
  Settings,
  DollarSign,
  Tag,
  Plus,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet,
  RefreshCw,
  AlertTriangle,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { AppState, ExchangeRates } from '../../types/finance';

interface SettingsTabProps {
  state: AppState;
  onUpdateRates: (rates: ExchangeRates) => void;
  onAddCategory: (type: 'gasto' | 'ingreso', name: string) => void;
  onDeleteCategory: (type: 'gasto' | 'ingreso', name: string) => void;
  onImportBackup: (importedState: AppState) => void;
  onResetData: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  state,
  onUpdateRates,
  onAddCategory,
  onDeleteCategory,
  onImportBackup,
  onResetData,
}) => {
  const [vesRate, setVesRate] = useState<string>(String(state.rates.vesPerUsd || 55));
  const [usdtRate, setUsdtRate] = useState<string>(String(state.rates.usdtPerUsd || 1));
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatType, setNewCatType] = useState<'gasto' | 'ingreso'>('gasto');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSaveRates = () => {
    const v = parseFloat(vesRate);
    const u = parseFloat(usdtRate);
    if (v > 0) {
      onUpdateRates({
        ...state.rates,
        vesPerUsd: v,
        usdtPerUsd: u > 0 ? u : 1,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  const handleCreateCategory = () => {
    if (!newCatName.trim()) return;
    onAddCategory(newCatType, newCatName.trim());
    setNewCatName('');
  };

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finanzas-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Fecha',
      'Tipo',
      'Categoría',
      'Monto',
      'Moneda',
      'Cuenta',
      'Cuenta Destino',
      'Nota',
    ];
    const rows = state.transactions.map((t) => {
      const acc = state.accounts.find((a) => a.id === t.acc);
      const toAcc = state.accounts.find((a) => a.id === t.to);
      return [
        t.date,
        t.type,
        t.cat || '',
        t.amt,
        acc?.cur || '',
        acc?.name || '',
        toAcc?.name || '',
        t.note || '',
      ];
    });

    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimientos-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Import JSON
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.accounts && (parsed.transactions || parsed.tx)) {
          onImportBackup(parsed);
          window.alert('Copia de seguridad restaurada con éxito.');
        } else {
          window.alert('El archivo no contiene un formato de respaldo válido.');
        }
      } catch (err) {
        window.alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex-1 flex flex-col p-4 pb-24 space-y-4 text-slate-100">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          Ajustes y Configuración
        </h1>
        <p className="text-xs text-slate-400">
          Tasas de cambio de referencia, categorías y respaldos
        </p>
      </div>

      {/* Exchange Rates Box */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-3xl space-y-3 shadow-md">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Tasas de Cambio de Referencia
          </span>
          {savedSuccess && (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold animate-pulse">
              <Check className="w-3 h-3" /> ¡Tasas guardadas!
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <label className="text-slate-400 font-medium">Tasa VES / USD (Bs por dólar):</label>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={vesRate}
              onChange={(e) => setVesRate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-medium">Tasa USDT / USD (Cripto):</label>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={usdtRate}
              onChange={(e) => setUsdtRate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <button
          onClick={handleSaveRates}
          className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold rounded-xl text-xs border border-emerald-500/30 transition-colors"
        >
          Actualizar Tasas de Referencia
        </button>
      </div>

      {/* Categories Management */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-3xl space-y-3 shadow-md">
        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 pb-1 border-b border-slate-800/80">
          <Tag className="w-4 h-4 text-emerald-400" />
          Categorías Personalizadas
        </span>

        {/* Add Category Form */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Nueva categoría..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <select
            value={newCatType}
            onChange={(e) => setNewCatType(e.target.value as 'gasto' | 'ingreso')}
            className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
          >
            <option value="gasto">Gasto</option>
            <option value="ingreso">Ingreso</option>
          </select>
          <button
            onClick={handleCreateCategory}
            className="p-2 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Expense Categories Chips */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Categorías de Gastos ({state.categories.gasto.length})
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
            {state.categories.gasto.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300"
              >
                {c}
                {state.categories.gasto.length > 1 && (
                  <button
                    onClick={() => onDeleteCategory('gasto', c)}
                    className="text-slate-500 hover:text-rose-400"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Income Categories Chips */}
        <div className="space-y-1 pt-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Categorías de Ingresos ({state.categories.ingreso.length})
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {state.categories.ingreso.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300"
              >
                {c}
                {state.categories.ingreso.length > 1 && (
                  <button
                    onClick={() => onDeleteCategory('ingreso', c)}
                    className="text-slate-500 hover:text-rose-400"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Backup and Data Safety */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-3xl space-y-3 shadow-md">
        <div className="flex items-center gap-1.5 pb-1 border-b border-slate-800/80">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200">
            Respaldo y Seguridad de Datos
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          Tus datos se guardan de forma local en tu dispositivo con máxima privacidad. Puedes exportar copias cuando desees.
        </p>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={handleExportJSON}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Copia JSON</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
            <span>Exportar CSV</span>
          </button>
        </div>

        {/* Import file input hidden */}
        <label className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-xs cursor-pointer transition-colors">
          <Upload className="w-3.5 h-3.5 text-amber-400" />
          <span>Restaurar Copia JSON</span>
          <input
            type="file"
            accept="application/json"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {/* Reset Database */}
        <div className="pt-2">
          <button
            onClick={() => {
              if (
                window.confirm(
                  '¿Estás seguro de que deseas reiniciar todos los datos a la configuración inicial? Esta acción no se puede deshacer.'
                )
              ) {
                onResetData();
              }
            }}
            className="w-full py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Restablecer Datos de Fábrica</span>
          </button>
        </div>
      </div>
    </div>
  );
};
