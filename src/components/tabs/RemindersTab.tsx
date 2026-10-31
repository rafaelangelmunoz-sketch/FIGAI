import React, { useState } from 'react';
import {
  CalendarClock,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Wallet,
  Repeat,
  Check,
  Tag,
  ArrowUpRight,
} from 'lucide-react';
import {
  Account,
  CurrencyCode,
  PaymentReminder,
  Transaction,
} from '../../types/finance';
import { formatMoney, getTodayStr } from '../../utils/currencies';
import confetti from 'canvas-confetti';

interface RemindersTabProps {
  reminders: PaymentReminder[];
  accounts: Account[];
  activeCurrency: CurrencyCode;
  onOpenNewReminder: () => void;
  onEditReminder: (reminder: PaymentReminder) => void;
  onMarkPaidAndCreateTx: (reminder: PaymentReminder, accountId: string) => void;
  onToggleStatus: (reminderId: string) => void;
}

export const RemindersTab: React.FC<RemindersTabProps> = ({
  reminders,
  accounts,
  activeCurrency,
  onOpenNewReminder,
  onEditReminder,
  onMarkPaidAndCreateTx,
  onToggleStatus,
}) => {
  const [filter, setFilter] = useState<'pending' | 'paid' | 'all'>('pending');
  const [payingReminder, setPayingReminder] = useState<PaymentReminder | null>(null);
  const [selectedPayAccId, setSelectedPayAccId] = useState<string>('');

  const todayStr = getTodayStr();

  // Helper to compute day difference
  const getDayDiff = (dueDateStr: string): number => {
    const today = new Date(todayStr + 'T00:00:00');
    const due = new Date(dueDateStr + 'T00:00:00');
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Filtered list
  const filteredReminders = reminders.filter((r) => {
    if (filter === 'pending') return !r.isPaid;
    if (filter === 'paid') return r.isPaid;
    return true;
  });

  // Calculate total pending amounts
  const pendingList = reminders.filter((r) => !r.isPaid);
  const overdueList = pendingList.filter((r) => getDayDiff(r.dueDate) < 0);
  const dueSoonList = pendingList.filter((r) => {
    const d = getDayDiff(r.dueDate);
    return d >= 0 && d <= 7;
  });

  const handleStartPay = (r: PaymentReminder) => {
    setPayingReminder(r);
    setSelectedPayAccId(r.accDefault || accounts[0]?.id || '');
  };

  const handleConfirmPay = () => {
    if (!payingReminder || !selectedPayAccId) return;

    onMarkPaidAndCreateTx(payingReminder, selectedPayAccId);

    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // ignore
    }

    setPayingReminder(null);
  };

  return (
    <div className="flex-1 flex flex-col p-4 pb-24 space-y-4 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-amber-400" />
            Recordatorios de Pagos
          </h1>
          <p className="text-xs text-slate-400">
            Control de cuentas por pagar y fechas de vencimiento
          </p>
        </div>

        <button
          onClick={onOpenNewReminder}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
            <span>Pendientes</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {pendingList.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {dueSoonList.length} vencen esta semana
          </div>
        </div>

        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
            <span>Vencidos</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div
            className={`text-2xl font-extrabold ${
              overdueList.length > 0 ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            {overdueList.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {overdueList.length > 0 ? '¡Atención requerida!' : 'Al día'}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setFilter('pending')}
          className={`flex-1 py-1.5 rounded-xl transition-all ${
            filter === 'pending'
              ? 'bg-amber-500 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Por Pagar ({pendingList.length})
        </button>
        <button
          onClick={() => setFilter('paid')}
          className={`flex-1 py-1.5 rounded-xl transition-all ${
            filter === 'paid'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Pagados ({reminders.length - pendingList.length})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-1.5 rounded-xl transition-all ${
            filter === 'all'
              ? 'bg-slate-800 text-white font-bold shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Todos ({reminders.length})
        </button>
      </div>

      {/* Reminder Cards List */}
      <div className="space-y-2.5">
        {filteredReminders.length > 0 ? (
          filteredReminders.map((r) => {
            const diff = getDayDiff(r.dueDate);
            const isOverdue = !r.isPaid && diff < 0;
            const isDueToday = !r.isPaid && diff === 0;
            const isDueSoon = !r.isPaid && diff > 0 && diff <= 5;
            const acc = accounts.find((a) => a.id === r.accDefault);

            return (
              <div
                key={r.id}
                className={`p-4 rounded-2xl border transition-all ${
                  r.isPaid
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-80'
                    : isOverdue
                    ? 'bg-rose-950/20 border-rose-500/40 shadow-sm shadow-rose-950/30'
                    : isDueToday
                    ? 'bg-amber-950/20 border-amber-500/50 shadow-sm shadow-amber-950/30'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Top line: status badge & recurrence */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    {r.isPaid ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Pagado
                      </span>
                    ) : isOverdue ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3" /> Vencido hace {Math.abs(diff)} días
                      </span>
                    ) : isDueToday ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> ¡Vence Hoy!
                      </span>
                    ) : isDueSoon ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> En {diff} días
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400">
                        Vence: {r.dueDate}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Repeat className="w-2.5 h-2.5" />
                    {r.recurrence === 'monthly'
                      ? 'Mensual'
                      : r.recurrence === 'biweekly'
                      ? 'Quincenal'
                      : r.recurrence === 'weekly'
                      ? 'Semanal'
                      : 'Único'}
                  </span>
                </div>

                {/* Main Content */}
                <div
                  className="cursor-pointer"
                  onClick={() => onEditReminder(r)}
                >
                  <div className="flex items-baseline justify-between mb-1">
                    <h2 className="text-sm font-bold text-white truncate pr-2">
                      {r.title}
                    </h2>
                    <span className="text-base font-extrabold text-white flex-shrink-0">
                      {formatMoney(r.amount, r.cur)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3 text-slate-500" />
                      {r.category}
                    </span>
                    {acc && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <Wallet className="w-3 h-3 text-emerald-400" />
                        {acc.name}
                      </span>
                    )}
                    {r.notes && (
                      <span className="italic text-slate-500 truncate max-w-[200px]">
                        · {r.notes}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons: Pagar Ahora */}
                {!r.isPaid && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                    <button
                      onClick={() => onToggleStatus(r.id)}
                      className="text-[11px] text-slate-400 hover:text-slate-200"
                    >
                      Marcar pagado sin movimiento
                    </button>

                    <button
                      onClick={() => handleStartPay(r)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Pagar y Registrar</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-12 px-4 text-center bg-slate-950/40 rounded-3xl border border-dashed border-slate-800 space-y-2">
            <CalendarClock className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">
              No tienes recordatorios en esta sección.
            </p>
            <button
              onClick={onOpenNewReminder}
              className="mt-2 text-xs font-bold px-4 py-2 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20"
            >
              + Agregar Recordatorio de Pago
            </button>
          </div>
        )}
      </div>

      {/* Pay and Register Confirmation Modal */}
      {payingReminder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                Registrar Pago de Servicio
              </span>
              <button
                onClick={() => setPayingReminder(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                Servicio a pagar:
              </span>
              <div className="text-sm font-bold text-white">
                {payingReminder.title}
              </div>
              <div className="text-base font-extrabold text-emerald-400">
                {formatMoney(payingReminder.amount, payingReminder.cur)}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                ¿Desde qué cuenta o billetera se realizó el débito?
              </label>
              <select
                value={selectedPayAccId}
                onChange={(e) => setSelectedPayAccId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.cur})
                  </option>
                ))}
              </select>
            </div>

            <p className="text-[11px] text-slate-400">
              Se creará un gasto en esta cuenta con fecha de hoy y se marcará el
              recordatorio como pagado.
            </p>

            <button
              onClick={handleConfirmPay}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-sm shadow-md transition-all active:scale-98"
            >
              Confirmar y Registrar Gasto
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
