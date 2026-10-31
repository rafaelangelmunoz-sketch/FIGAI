import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Plus,
  Mic,
  CalendarClock,
  Landmark,
  Wallet2,
  Banknote,
  Search,
} from 'lucide-react';
import {
  Account,
  CurrencyCode,
  PaymentReminder,
  Transaction,
} from '../../types/finance';
import {
  formatMoney,
  getMonthLabel,
  getRelativeDateLabel,
  shiftMonthStr,
} from '../../utils/currencies';

interface DashboardTabProps {
  currentMonth: string;
  onChangeMonth: (m: string) => void;
  activeCurrency: CurrencyCode;
  onChangeCurrency: (c: CurrencyCode) => void;
  accounts: Account[];
  transactions: Transaction[];
  reminders: PaymentReminder[];
  selectedAccountId: string | null;
  onSelectAccount: (accId: string | null) => void;
  onEditTransaction: (tx: Transaction) => void;
  onOpenVoice: () => void;
  onOpenNewTx: () => void;
  onNavigateToReminders: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  currentMonth,
  onChangeMonth,
  activeCurrency,
  onChangeCurrency,
  accounts,
  transactions,
  reminders,
  selectedAccountId,
  onSelectAccount,
  onEditTransaction,
  onOpenVoice,
  onOpenNewTx,
  onNavigateToReminders,
}) => {
  // Calculate balances per account
  const getAccountBalance = (acc: Account): number => {
    return (
      acc.ini +
      transactions.reduce((sum, t) => {
        let delta = 0;
        if (t.acc === acc.id) {
          delta -= t.type === 'gasto' ? t.amt : t.type === 'ingreso' ? -t.amt : t.amt;
        }
        if (t.type === 'transfer' && t.to === acc.id) {
          delta += t.amt2 !== undefined ? t.amt2 : t.amt;
        }
        return sum + delta;
      }, 0)
    );
  };

  // Filter accounts for active currency or all
  const accountsInActiveCurrency = accounts.filter((a) => a.cur === activeCurrency);
  const totalBalanceInActiveCur = accountsInActiveCurrency.reduce(
    (sum, a) => sum + getAccountBalance(a),
    0
  );

  // Month transactions
  const monthTx = transactions.filter((t) => t.date.startsWith(currentMonth));

  // Filter by currency
  const currencyTx = monthTx.filter((t) => {
    const acc = accounts.find((a) => a.id === t.acc);
    const toAcc = accounts.find((a) => a.id === t.to);
    return (acc && acc.cur === activeCurrency) || (toAcc && toAcc.cur === activeCurrency);
  });

  // Filter by selected account if any
  const filteredTx = selectedAccountId
    ? currencyTx.filter((t) => t.acc === selectedAccountId || t.to === selectedAccountId)
    : currencyTx;

  // Monthly income and expense totals in active currency
  const totalIncome = currencyTx
    .filter((t) => t.type === 'ingreso')
    .reduce((sum, t) => sum + t.amt, 0);

  const totalExpense = currencyTx
    .filter((t) => t.type === 'gasto')
    .reduce((sum, t) => sum + t.amt, 0);

  const netBalance = totalIncome - totalExpense;

  // Group transactions by date
  const groupedTx: Record<string, Transaction[]> = {};
  filteredTx
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    .forEach((t) => {
      groupedTx[t.date] = groupedTx[t.date] || [];
      groupedTx[t.date].push(t);
    });

  // Pending reminders alert
  const pendingReminders = reminders.filter((r) => !r.isPaid);
  const nextReminder = pendingReminders[0];

  const getAccountIcon = (kind: string) => {
    switch (kind) {
      case 'banco':
        return <Landmark className="w-4 h-4 text-emerald-400" />;
      case 'billetera':
        return <Wallet2 className="w-4 h-4 text-amber-400" />;
      case 'efectivo':
        return <Banknote className="w-4 h-4 text-cyan-400" />;
      default:
        return <Wallet2 className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 pb-24 space-y-4 text-slate-100">
      {/* Top Bar: Month Selector & Currency Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-2xl p-1">
          <button
            onClick={() => onChangeMonth(shiftMonthStr(currentMonth, -1))}
            className="w-7 h-7 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-xs font-bold text-white capitalize">
            {getMonthLabel(currentMonth)}
          </span>
          <button
            onClick={() => onChangeMonth(shiftMonthStr(currentMonth, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Currency Switcher Chips */}
        <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 p-1 rounded-2xl">
          {(['VES', 'USD', 'USDT'] as CurrencyCode[]).map((c) => (
            <button
              key={c}
              onClick={() => {
                onChangeCurrency(c);
                onSelectAccount(null);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                activeCurrency === c
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Main Total Balance Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800/90 rounded-3xl p-5 shadow-xl">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-slate-400">
            Saldo Total ({activeCurrency})
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800/80 text-emerald-400 border border-emerald-500/20">
            {accountsInActiveCurrency.length} cuentas activas
          </span>
        </div>

        <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
          {formatMoney(totalBalanceInActiveCur, activeCurrency)}
        </div>

        {/* Month Cash Flow mini metrics */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Ingresos del mes</span>
              <span className="text-xs font-bold text-emerald-400">
                +{formatMoney(totalIncome, activeCurrency)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Gastos del mes</span>
              <span className="text-xs font-bold text-rose-400">
                -{formatMoney(totalExpense, activeCurrency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Reminder Notification Banner */}
      {nextReminder && (
        <div
          onClick={onNavigateToReminders}
          className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl cursor-pointer hover:bg-amber-500/15 transition-all shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide block">
                Recordatorio de pago pendiente
              </span>
              <span className="text-xs font-semibold text-slate-100 truncate block">
                {nextReminder.title} ({formatMoney(nextReminder.amount, nextReminder.cur)})
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-amber-500 text-slate-950 ml-2 whitespace-nowrap">
            Ver ({pendingReminders.length})
          </span>
        </div>
      )}

      {/* Accounts & Wallets Carousel */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300">
            Cuentas y Billeteras ({activeCurrency})
          </span>
          {selectedAccountId && (
            <button
              onClick={() => onSelectAccount(null)}
              className="text-[11px] text-emerald-400 font-semibold hover:underline"
            >
              Ver todas
            </button>
          )}
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
          {accountsInActiveCurrency.map((a) => {
            const isSelected = selectedAccountId === a.id;
            const bal = getAccountBalance(a);
            return (
              <button
                key={a.id}
                onClick={() => onSelectAccount(isSelected ? null : a.id)}
                className={`flex-none w-36 p-3 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'bg-slate-800 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="p-1 rounded-lg bg-slate-900 border border-slate-800">
                    {getAccountIcon(a.kind)}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    {a.cur}
                  </span>
                </div>
                <div className="text-xs font-bold text-white truncate">{a.name}</div>
                <div className="text-xs font-semibold text-slate-300 mt-0.5">
                  {formatMoney(bal, a.cur)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Voice & Manual Fast Actions Banner */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onOpenVoice}
          className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/15 to-teal-500/10 border border-emerald-500/30 hover:border-emerald-500/50 transition-all text-emerald-300 group shadow-sm active:scale-98"
        >
          <div className="w-7 h-7 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
            <Mic className="w-4 h-4 animate-pulse" />
          </div>
          <div className="text-left">
            <span className="text-xs font-bold block text-white">Hablar</span>
            <span className="text-[10px] text-emerald-400">Por Micrófono</span>
          </div>
        </button>

        <button
          onClick={onOpenNewTx}
          className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all text-slate-200 active:scale-98"
        >
          <div className="w-7 h-7 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center font-bold">
            <Plus className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="text-xs font-bold block text-white">Manual</span>
            <span className="text-[10px] text-slate-400">Nuevo registro</span>
          </div>
        </button>
      </div>

      {/* Transactions List Grouped by Day */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300">
            Movimientos ({filteredTx.length})
          </span>
          <span className="text-[11px] text-slate-400">
            {selectedAccountId
              ? accounts.find((a) => a.id === selectedAccountId)?.name
              : `Todo en ${activeCurrency}`}
          </span>
        </div>

        {Object.keys(groupedTx).length > 0 ? (
          Object.keys(groupedTx).map((dateStr) => (
            <div key={dateStr} className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                {getRelativeDateLabel(dateStr)}
              </span>

              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl divide-y divide-slate-800/60 overflow-hidden">
                {groupedTx[dateStr].map((tx) => {
                  const acc = accounts.find((a) => a.id === tx.acc);
                  const toAcc = accounts.find((a) => a.id === tx.to);
                  const isTransfer = tx.type === 'transfer';
                  const isIncome = tx.type === 'ingreso';

                  return (
                    <button
                      key={tx.id}
                      onClick={() => onEditTransaction(tx)}
                      className="w-full flex items-center justify-between p-3 hover:bg-slate-900/80 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isTransfer
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : isIncome
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {isTransfer ? (
                            <ArrowRightLeft className="w-4 h-4" />
                          ) : isIncome ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-100 truncate block">
                            {isTransfer ? 'Transferencia' : tx.cat || 'General'}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate block">
                            {isTransfer
                              ? `${acc?.name} → ${toAcc?.name}`
                              : acc?.name}
                            {tx.note ? ` · ${tx.note}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="text-right ml-2 flex-shrink-0">
                        <span
                          className={`text-xs font-extrabold ${
                            isTransfer
                              ? 'text-blue-400'
                              : isIncome
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {isTransfer ? '' : isIncome ? '+' : '−'}
                          {formatMoney(tx.amt, acc?.cur || activeCurrency)}
                        </span>
                        {isTransfer && tx.amt2 && toAcc && (
                          <span className="text-[10px] text-slate-400 block">
                            → {formatMoney(tx.amt2, toAcc.cur)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 px-4 text-center bg-slate-950/40 rounded-3xl border border-dashed border-slate-800">
            <p className="text-xs text-slate-400">
              No hay movimientos en {activeCurrency} este mes.
            </p>
            <button
              onClick={onOpenVoice}
              className="mt-3 text-xs font-bold px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20"
            >
              🎙️ Probar ingreso por voz
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
