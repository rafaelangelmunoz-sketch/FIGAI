import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  CalendarClock,
  Wallet,
  Settings,
  Mic,
  Plus,
} from 'lucide-react';

export type TabType = 'inicio' | 'flujo' | 'recordatorios' | 'cuentas' | 'ajustes';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onOpenVoice: () => void;
  onOpenNewTx: () => void;
  pendingRemindersCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenVoice,
  onOpenNewTx,
  pendingRemindersCount,
}) => {
  return (
    <nav aria-label="Navegación principal" className="sticky bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-1.5 pb-safe">
      <div className="flex items-center justify-around relative">
        {/* Tab 1: Inicio */}
        <button
          onClick={() => onChangeTab('inicio')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'inicio'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Inicio</span>
        </button>

        {/* Tab 2: Flujo de Caja */}
        <button
          onClick={() => onChangeTab('flujo')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'flujo'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Flujo de Caja</span>
        </button>

        {/* Central Voice Action Button */}
        <div className="relative -top-3 flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            {/* Quick Voice Button */}
            <button
              onClick={onOpenVoice}
              className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-teal-600 via-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/25 active:scale-95 transition-transform hover:scale-105"
              title="Registrar por Micrófono"
            >
              <Mic className="w-6 h-6 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
              </span>
            </button>

            {/* Quick Manual + Button */}
            <button
              onClick={onOpenNewTx}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-slate-200 shadow-md active:scale-95 hover:bg-slate-700 transition-all"
              title="Registro manual rápido"
            >
              <Plus className="w-5 h-5 text-emerald-400" />
            </button>
          </div>
          <span className="text-[9px] font-medium text-slate-300 mt-1">Voz / Nuevo</span>
        </div>

        {/* Tab 3: Recordatorios */}
        <button
          onClick={() => onChangeTab('recordatorios')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all relative ${
            activeTab === 'recordatorios'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CalendarClock className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Pagos</span>
          {pendingRemindersCount > 0 && (
            <span className="absolute top-0 right-1.5 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-slate-950 text-[9px] font-extrabold flex items-center justify-center">
              {pendingRemindersCount}
            </span>
          )}
        </button>

        {/* Tab 4: Cuentas */}
        <button
          onClick={() => onChangeTab('cuentas')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'cuentas'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wallet className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Cuentas</span>
        </button>

        {/* Tab 5: Ajustes */}
        <button
          onClick={() => onChangeTab('ajustes')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'ajustes'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Ajustes</span>
        </button>
      </div>
    </nav>
  );
};
