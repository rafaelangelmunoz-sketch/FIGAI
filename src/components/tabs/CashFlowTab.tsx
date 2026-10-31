import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  PieChart,
  Calendar,
  Sparkles,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';
import {
  Account,
  CurrencyCode,
  Transaction,
  ExchangeRates,
} from '../../types/finance';
import {
  formatMoney,
  getMonthLabel,
  padZero,
  shiftMonthStr,
} from '../../utils/currencies';

interface CashFlowTabProps {
  currentMonth: string;
  onChangeMonth: (m: string) => void;
  activeCurrency: CurrencyCode;
  onChangeCurrency: (c: CurrencyCode) => void;
  accounts: Account[];
  transactions: Transaction[];
  rates: ExchangeRates;
  remindersCount: number;
}

export const CashFlowTab: React.FC<CashFlowTabProps> = ({
  currentMonth,
  onChangeMonth,
  activeCurrency,
  onChangeCurrency,
  accounts,
  transactions,
  rates,
  remindersCount,
}) => {
  const [insightData, setInsightData] = useState<any>(null);
  const [loadingInsight, setLoadingInsight] = useState<boolean>(false);
  const [activeChartTab, setActiveChartTab] = useState<'acumulado' | 'categorias'>('acumulado');

  // Filter transactions for this month and currency
  const monthTx = transactions.filter((t) => t.date.startsWith(currentMonth));
  const currencyTx = monthTx.filter((t) => {
    const acc = accounts.find((a) => a.id === t.acc);
    return acc && acc.cur === activeCurrency && t.type !== 'transfer';
  });

  const totalIncome = currencyTx
    .filter((t) => t.type === 'ingreso')
    .reduce((sum, t) => sum + t.amt, 0);

  const totalExpense = currencyTx
    .filter((t) => t.type === 'gasto')
    .reduce((sum, t) => sum + t.amt, 0);

  const netCashFlow = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  // Breakdown by category
  const expenseByCategory: Record<string, number> = {};
  currencyTx
    .filter((t) => t.type === 'gasto')
    .forEach((t) => {
      const cat = t.cat || 'Otros gastos';
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + t.amt;
    });

  const sortedCategories = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);
  const maxCategoryAmount = sortedCategories.length > 0 ? sortedCategories[0][1] : 1;

  // Generate Cumulative Daily Data for SVG Chart
  const [yearStr, monthNumStr] = currentMonth.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthNumStr, 10);
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  const now = new Date();
  const isCurrentMonth =
    now.getFullYear() === year && now.getMonth() + 1 === monthNum;
  const maxDayToPlot = isCurrentMonth ? now.getDate() : daysInMonth;

  const dailyCumIncome: number[] = [];
  const dailyCumExpense: number[] = [];
  let cumI = 0;
  let cumE = 0;

  for (let d = 1; d <= maxDayToPlot; d++) {
    const dateStr = `${currentMonth}-${padZero(d)}`;
    const dayTxs = currencyTx.filter((t) => t.date === dateStr);
    dayTxs.forEach((t) => {
      if (t.type === 'ingreso') cumI += t.amt;
      if (t.type === 'gasto') cumE += t.amt;
    });
    dailyCumIncome.push(cumI);
    dailyCumExpense.push(cumE);
  }

  const chartMaxVal = Math.max(10, ...dailyCumIncome, ...dailyCumExpense);

  const chartW = 320;
  const chartH = 120;
  const getX = (index: number) => 15 + (index / Math.max(1, daysInMonth - 1)) * (chartW - 30);
  const getY = (val: number) => chartH - 20 - (val / chartMaxVal) * (chartH - 35);

  const incomePoints = dailyCumIncome.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');
  const expensePoints = dailyCumExpense.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');

  // Smart financial insight handler
  const handleFetchInsight = async () => {
    setLoadingInsight(true);
    try {
      const res = await fetch('/api/financial-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: currentMonth,
          totals: {
            ingresos: totalIncome,
            gastos: totalExpense,
            balance: netCashFlow,
            moneda: activeCurrency,
          },
          categoriesBreakdown: sortedCategories,
          accountsBreakdown: accounts.map((a) => ({ name: a.name, cur: a.cur })),
          remindersCount,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.insight) {
          setInsightData(data.insight);
          return;
        }
      }
      // Static fallback for GitHub Pages or offline
      setInsightData({
        status: netCashFlow >= 0 ? 'Saludable' : 'Alerta',
        headline: netCashFlow >= 0 ? 'Flujo de caja positivo' : 'Gastos superan los ingresos',
        analysis: `Has registrado ${formatMoney(totalIncome, activeCurrency)} en ingresos y ${formatMoney(totalExpense, activeCurrency)} en gastos este mes. Tu tasa de ahorro es del ${savingsRate}%.`,
        tips: [
          'Mantén una reserva de emergencia en moneda dura (USD/USDT).',
          'Usa el registro por voz para no olvidar pequeños pagos diarios.',
          'Revisa las fechas en la pestaña de Pagos para evitar cortes de servicios.',
        ],
      });
    } catch (e) {
      // Fallback on error
      setInsightData({
        status: netCashFlow >= 0 ? 'Saludable' : 'Alerta',
        headline: netCashFlow >= 0 ? 'Flujo de caja positivo' : 'Gastos superan los ingresos',
        analysis: `Control de finanzas activo en ${activeCurrency}.`,
        tips: [
          'Mantén una reserva de liquidez para pagos fijos del mes.',
          'Registra tus ingresos y gastos según la billetera correspondiente.',
        ],
      });
    } finally {
      setLoadingInsight(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Fecha', 'Tipo', 'Categoría', 'Monto', 'Moneda', 'Cuenta', 'Destino', 'Nota'];
    const rows = monthTx.map((t) => {
      const acc = accounts.find((a) => a.id === t.acc);
      const toAcc = accounts.find((a) => a.id === t.to);
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
    a.download = `flujo-de-caja-${currentMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex-1 flex flex-col p-4 pb-24 space-y-4 text-slate-100">
      {/* Month & Currency Nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-2xl p-1">
          <button
            onClick={() => onChangeMonth(shiftMonthStr(currentMonth, -1))}
            className="w-7 h-7 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-xs font-bold text-white capitalize">
            {getMonthLabel(currentMonth)}
          </span>
          <button
            onClick={() => onChangeMonth(shiftMonthStr(currentMonth, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Currency Switcher Chips */}
        <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 p-1 rounded-2xl">
          {(['VES', 'USD', 'USDT'] as CurrencyCode[]).map((c) => (
            <button
              key={c}
              onClick={() => onChangeCurrency(c)}
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

      {/* Net Cash Flow Hero Card */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Flujo de Caja Neto ({activeCurrency})
          </span>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              netCashFlow >= 0
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
            }`}
          >
            {netCashFlow >= 0 ? 'Superávit' : 'Déficit'}
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div
            className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
              netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatMoney(netCashFlow, activeCurrency)}
          </div>
          {totalIncome > 0 && (
            <span className="text-xs text-slate-400">
              Tasa de ahorro:{' '}
              <strong className="text-white font-mono">{savingsRate}%</strong>
            </span>
          )}
        </div>

        {/* Inflow vs Outflow progress comparison */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-semibold text-slate-300">
            <span className="text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +{formatMoney(totalIncome, activeCurrency)}
            </span>
            <span className="text-rose-400 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" /> -{formatMoney(totalExpense, activeCurrency)}
            </span>
          </div>

          <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
            <div
              style={{
                width: `${
                  totalIncome + totalExpense > 0
                    ? (totalIncome / (totalIncome + totalExpense)) * 100
                    : 50
                }%`,
              }}
              className="bg-emerald-500 transition-all duration-500"
            ></div>
            <div
              style={{
                width: `${
                  totalIncome + totalExpense > 0
                    ? (totalExpense / (totalIncome + totalExpense)) * 100
                    : 50
                }%`,
              }}
              className="bg-rose-500 transition-all duration-500"
            ></div>
          </div>
        </div>
      </div>

      {/* Visual Chart Section: Switch between Cumulative Flow & Category Breakdown */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveChartTab('acumulado')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                activeChartTab === 'acumulado'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Curva Diaria
            </button>
            <button
              onClick={() => setActiveChartTab('categorias')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                activeChartTab === 'categorias'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" /> Por Categoría
            </button>
          </div>

          <span className="text-[10px] text-slate-400 font-mono">
            {currencyTx.length} movimientos
          </span>
        </div>

        {/* Tab 1: Cumulative Daily Curve */}
        {activeChartTab === 'acumulado' && (
          <div className="space-y-3">
            {currencyTx.length > 0 ? (
              <>
                <svg
                  viewBox={`0 0 ${chartW} ${chartH}`}
                  className="w-full h-36 overflow-visible select-none"
                >
                  {/* Grid Lines */}
                  <line
                    x1="15"
                    y1={chartH - 20}
                    x2={chartW - 15}
                    y2={chartH - 20}
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <line
                    x1="15"
                    y1="15"
                    x2={chartW - 15}
                    y2="15"
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />

                  {/* Income Cumulative Polyline */}
                  {dailyCumIncome.length > 0 && (
                    <>
                      <polyline
                        points={incomePoints}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx={getX(dailyCumIncome.length - 1)}
                        cy={getY(dailyCumIncome[dailyCumIncome.length - 1])}
                        r="3.5"
                        fill="#10b981"
                      />
                    </>
                  )}

                  {/* Expense Cumulative Polyline */}
                  {dailyCumExpense.length > 0 && (
                    <>
                      <polyline
                        points={expensePoints}
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx={getX(dailyCumExpense.length - 1)}
                        cy={getY(dailyCumExpense[dailyCumExpense.length - 1])}
                        r="3.5"
                        fill="#f43f5e"
                      />
                    </>
                  )}

                  {/* X Axis Labels */}
                  <text x="15" y={chartH - 5} fill="#64748b" fontSize="9" fontWeight="600">
                    Día 1
                  </text>
                  <text
                    x={chartW - 15}
                    y={chartH - 5}
                    fill="#64748b"
                    fontSize="9"
                    fontWeight="600"
                    textAnchor="end"
                  >
                    Día {daysInMonth}
                  </text>
                </svg>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    Ingresos acum. {formatMoney(cumI, activeCurrency)}
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    Gastos acum. {formatMoney(cumE, activeCurrency)}
                  </span>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No hay movimientos registrados en {activeCurrency} para este mes.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Category Breakdown */}
        {activeChartTab === 'categorias' && (
          <div className="space-y-3">
            {sortedCategories.length > 0 ? (
              <div className="space-y-2.5">
                {sortedCategories.map(([catName, amt]) => {
                  const pct = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0;
                  const barWidthPct = (amt / maxCategoryAmount) * 100;

                  return (
                    <div key={catName} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200 truncate pr-2">
                          {catName}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[11px] font-mono text-slate-400">
                            {pct}%
                          </span>
                          <span className="font-bold text-slate-100">
                            {formatMoney(amt, activeCurrency)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          style={{ width: `${barWidthPct}%` }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No hay gastos registrados para analizar categorías este mes.
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Financial Diagnosis Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                Diagnóstico de Flujo de Caja
              </span>
              <span className="text-[10px] text-slate-400">
                Asesor de Finanzas Multi-moneda
              </span>
            </div>
          </div>
          <button
            onClick={handleFetchInsight}
            disabled={loadingInsight}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors shadow flex items-center gap-1 active:scale-95 disabled:opacity-50"
          >
            {loadingInsight ? 'Analizando...' : insightData ? 'Actualizar' : 'Generar'}
          </button>
        </div>

        {insightData && (
          <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Estado: {insightData.status}
              </span>
              <span className="text-xs font-bold text-slate-100">
                {insightData.headline}
              </span>
            </div>

            {insightData.analysis && (
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {insightData.analysis}
              </p>
            )}

            {insightData.tips && insightData.tips.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Recomendaciones clave:
                </span>
                <ul className="space-y-1">
                  {insightData.tips.map((tip: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export Report Actions */}
      <div className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800 rounded-2xl">
        <div>
          <span className="text-xs font-bold text-slate-200 block">Exportar Reporte</span>
          <span className="text-[10px] text-slate-400">
            Descarga los movimientos en formato CSV compatible con Excel
          </span>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold border border-slate-700 transition-colors"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>CSV</span>
        </button>
      </div>
    </div>
  );
};
