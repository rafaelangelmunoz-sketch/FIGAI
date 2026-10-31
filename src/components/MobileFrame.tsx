import React, { useState } from 'react';
import { Smartphone, Monitor, Wifi, Battery, Sparkles } from 'lucide-react';

interface MobileFrameProps {
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children }) => {
  const [deviceFrameMode, setDeviceFrameMode] = useState<boolean>(true);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start sm:py-4 transition-colors">
      {/* Top Device Preview Bar (Visible on desktop/larger screens) */}
      <header className="hidden sm:flex items-center justify-between w-full max-w-md px-4 py-2 text-xs text-slate-400 border-b border-slate-800/80 mb-2">
        <div className="flex items-center gap-1.5 font-medium text-emerald-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Finanzas Pro Móvil</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            VES · USD · USDT
          </span>
        </div>
        <button
          onClick={() => setDeviceFrameMode(!deviceFrameMode)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title="Alternar entre vista teléfono y vista expandida"
        >
          {deviceFrameMode ? (
            <>
              <Smartphone className="w-3.5 h-3.5 text-teal-400" />
              <span>Marco Móvil</span>
            </>
          ) : (
            <>
              <Monitor className="w-3.5 h-3.5 text-teal-400" />
              <span>Expandido</span>
            </>
          )}
        </button>
      </header>

      {/* Main Container */}
      <div
        className={`w-full flex-1 flex flex-col transition-all duration-300 relative ${
          deviceFrameMode
            ? 'sm:max-w-[440px] sm:my-auto sm:border sm:border-slate-800/90 sm:rounded-[40px] sm:shadow-2xl sm:shadow-teal-950/40 sm:overflow-hidden bg-slate-900'
            : 'max-w-2xl bg-slate-900 sm:rounded-2xl sm:border sm:border-slate-800'
        }`}
        style={{ minHeight: '100dvh' }}
      >
        {/* Simulated Mobile Status Bar (Visible in frame mode) */}
        {deviceFrameMode && (
          <div className="hidden sm:flex items-center justify-between px-7 pt-3 pb-1 text-[11px] font-semibold text-slate-400 select-none z-30">
            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {/* Dynamic Island pill */}
            <div className="w-24 h-4 bg-slate-950 rounded-full flex items-center justify-center border border-slate-800">
              <div className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse"></div>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Wifi className="w-3.5 h-3.5" />
              <Battery className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        {/* Screen Content */}
        <div className="flex-1 flex flex-col relative overflow-x-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};
