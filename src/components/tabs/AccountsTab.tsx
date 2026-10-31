import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  Landmark,
  Wallet2,
  Banknote,
  ArrowRightLeft,
  X,
  Trash2,
  Edit2,
  DollarSign,
  Sparkles,
} from 'lucide-react';
import {
  Account,
  AccountKind,
  CurrencyCode,
  CURRENCIES,
  COMMON_BANKS_WALLETS,
  ExchangeRates,
  Transaction,
} from '../../types/finance';
import {
  convertAmount,
  formatMoney,
} from '../../utils/currencies';
import { generateId } from '../../utils/storage';

interface AccountsTabProps {
  accounts: Account[];
  transactions: Transaction[];
  rates: ExchangeRates;
  onSaveAccount: (account: Account) => void;
  onDeleteAccount: (accountId: string) => void;
  onOpenTransfer: () => void;
}

export const AccountsTab: React.FC<AccountsTabProps> = ({
  accounts,
  transactions,
  rates,
  onSaveAccount,
  onDeleteAccount,
  onOpenTransfer,
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Form state
  const [name, setName] = useState<string>('');
  const [kind, setKind] = useState<AccountKind>('banco');
  const [cur, setCur] = useState<CurrencyCode>('VES');
  const [ini, setIni] = useState<string>('0');

  // Calculate live balance for any account
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

  // Total Net Worth in USD estimate
  const totalNetWorthUsd = accounts.reduce((sum, a) => {
    const bal = getAccountBalance(a);
    return sum + convertAmount(bal, a.cur, 'USD', rates);
  }, 0);

  const openCreateModal = () => {
    setEditingAccount(null);
    setName('');
    setKind('banco');
    setCur('VES');
    setIni('0');
    setIsModalOpen(true);
  };

  const openEditModal = (a: Account) => {
    setEditingAccount(a);
    setName(a.name);
    setKind(a.kind);
    setCur(a.cur);
    setIni(String(a.ini));
    setIsModalOpen(true);
  };

  const handleApplyPreset = (preset: typeof COMMON_BANKS_WALLETS[0]) => {
    setName(preset.name);
    setKind(preset.kind);
    setCur(preset.cur);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const accountToSave: Account = {
      id: editingAccount ? editingAccount.id : generateId(),
      name: name.trim(),
      kind,
      cur,
      ini: parseFloat(ini) || 0,
    };

    onSaveAccount(accountToSave);
    setIsModalOpen(false);
  };

  const getAccountIcon = (k: AccountKind) => {
    switch (k) {
      case 'banco':
        return <Landmark className="w-4 h-4 text-emerald-400" />;
      case 'billetera':
        return <Wallet2 className="w-4 h-4 text-amber-400" />;
      case 'efectivo':
        return <Banknote className="w-4 h-4 text-cyan-400" />;
    }
  };

  const currenciesList: CurrencyCode[] = ['VES', 'USD', 'USDT', 'EUR'];

  return (
    <div className="flex-1 flex flex-col p-4 pb-24 space-y-4 text-slate-100">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            Cuentas y Billeteras
          </h1>
          <p className="text-xs text-slate-400">
            Administra tus bancos, billeteras digitales y efectivo
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva</span>
        </button>
      </div>

      {/* Estimated Total Net Worth Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            Patrimonio Estimado Total
          </span>
          <span className="text-[10px] text-slate-400">
            Tasa ref: {rates.vesPerUsd} Bs/$
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div className="text-3xl font-extrabold text-white tracking-tight">
            ${totalNetWorthUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </div>
          <button
            onClick={onOpenTransfer}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" /> Transferir
          </button>
        </div>
      </div>

      {/* Accounts Grouped By Currency */}
      <div className="space-y-4">
        {currenciesList.map((currencyCode) => {
          const accs = accounts.filter((a) => a.cur === currencyCode);
          if (accs.length === 0) return null;

          const groupTotal = accs.reduce((s, a) => s + getAccountBalance(a), 0);

          return (
            <div key={currencyCode} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  {currencyCode === 'VES'
                    ? 'Bolívares (VES)'
                    : currencyCode === 'USD'
                    ? 'Dólares (USD)'
                    : currencyCode === 'USDT'
                    ? 'Cripto (USDT)'
                    : 'Euros (EUR)'}
                </span>
                <span className="text-xs font-extrabold text-emerald-400">
                  {formatMoney(groupTotal, currencyCode)}
                </span>
              </div>

              <div className="space-y-2">
                {accs.map((a) => {
                  const bal = getAccountBalance(a);
                  const txCount = transactions.filter(
                    (t) => t.acc === a.id || t.to === a.id
                  ).length;

                  return (
                    <div
                      key={a.id}
                      className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between hover:border-slate-700 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0">
                          {getAccountIcon(a.kind)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {a.name}
                          </div>
                          <div className="text-[10px] text-slate-400 capitalize">
                            {a.kind} · {txCount} movimientos
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs font-extrabold text-white">
                            {formatMoney(bal, a.cur)}
                          </div>
                          {a.ini > 0 && (
                            <div className="text-[9px] text-slate-500">
                              Inicial: {formatMoney(a.ini, a.cur)}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => openEditModal(a)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          title="Editar cuenta"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Account Modal (Create or Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white">
                {editingAccount ? 'Editar Cuenta' : 'Agregar Nueva Cuenta / Billetera'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets */}
            {!editingAccount && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400 block">
                  Plantillas rápidas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_BANKS_WALLETS.slice(0, 6).map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500 text-slate-300 transition-all"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Nombre de la cuenta:
              </label>
              <input
                type="text"
                placeholder="Ej. Banesco, Binance USDT, Efectivo USD..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Kind & Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Tipo:</label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as AccountKind)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="banco">Banco</option>
                  <option value="billetera">Billetera Digital</option>
                  <option value="efectivo">Efectivo</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Moneda:</label>
                <select
                  value={cur}
                  onChange={(e) => setCur(e.target.value as CurrencyCode)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Initial balance */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Saldo Inicial en {cur}:
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="0"
                value={ini}
                onChange={(e) => setIni(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Save & Delete */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleSave}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold rounded-xl text-sm shadow-md transition-all active:scale-98"
              >
                {editingAccount ? 'Guardar Cambios' : 'Crear Cuenta'}
              </button>

              {editingAccount && (
                <button
                  type="button"
                  onClick={() => {
                    if (accounts.length <= 1) {
                      window.alert('Debes mantener al menos una cuenta en la aplicación.');
                      return;
                    }
                    if (
                      window.confirm(
                        `¿Estás seguro de eliminar "${editingAccount.name}"? Los movimientos asociados también se desvincularán.`
                      )
                    ) {
                      onDeleteAccount(editingAccount.id);
                      setIsModalOpen(false);
                    }
                  }}
                  className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar Cuenta
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
