import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Check,
  Plus,
  ArrowRightLeft,
  Calendar,
  Tag,
  Wallet,
} from 'lucide-react';
import {
  Account,
  CurrencyCode,
  Transaction,
  TransactionType,
} from '../types/finance';
import { formatMoney, getTodayStr } from '../utils/currencies';
import confetti from 'canvas-confetti';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: { gasto: string[]; ingreso: string[] };
  onSave: (tx: {
    id?: string;
    type: TransactionType;
    amt: number;
    amt2?: number;
    acc: string;
    to?: string;
    cat?: string;
    note?: string;
    date: string;
  }) => void;
  onDelete?: (id: string) => void;
  onAddCategory: (type: 'gasto' | 'ingreso', name: string) => void;
  initialData?: Partial<Transaction> | null;
  activeCurrency: CurrencyCode;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  onSave,
  onDelete,
  onAddCategory,
  initialData,
  activeCurrency,
}) => {
  const [type, setType] = useState<TransactionType>('gasto');
  const [amount, setAmount] = useState<string>('');
  const [amount2, setAmount2] = useState<string>('');
  const [selectedAccId, setSelectedAccId] = useState<string>('');
  const [selectedToId, setSelectedToId] = useState<string>('');
  const [selectedCat, setSelectedCat] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayStr());

  // New category creation state
  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setType(initialData.type || 'gasto');
        setAmount(initialData.amt ? String(initialData.amt) : '');
        setAmount2(initialData.amt2 ? String(initialData.amt2) : '');
        setSelectedAccId(initialData.acc || accounts[0]?.id || '');
        setSelectedToId(initialData.to || (accounts[1]?.id ?? ''));
        setSelectedCat(initialData.cat || categories.gasto[0] || '');
        setNote(initialData.note || '');
        setDate(initialData.date || getTodayStr());
      } else {
        // Defaults: find account matching active currency
        const matched = accounts.find((a) => a.cur === activeCurrency) || accounts[0];
        const secondAcc = accounts.find((a) => a.id !== matched?.id) || accounts[1];

        setType('gasto');
        setAmount('');
        setAmount2('');
        setSelectedAccId(matched?.id || '');
        setSelectedToId(secondAcc?.id || '');
        setSelectedCat(categories.gasto[0] || '');
        setNote('');
        setDate(getTodayStr());
      }
      setIsAddingCategory(false);
      setNewCategoryName('');
    }
  }, [isOpen, initialData, accounts, activeCurrency, categories]);

  if (!isOpen) return null;

  const currentAccount = accounts.find((a) => a.id === selectedAccId);
  const toAccount = accounts.find((a) => a.id === selectedToId);
  const isDifferentCurrency =
    type === 'transfer' && currentAccount && toAccount && currentAccount.cur !== toAccount.cur;

  const handleSave = () => {
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      return;
    }

    if (!selectedAccId) return;

    if (type === 'transfer' && (!selectedToId || selectedToId === selectedAccId)) {
      return;
    }

    const numAmt2 = amount2 ? parseFloat(amount2) : undefined;

    onSave({
      id: initialData?.id,
      type,
      amt: numAmt,
      amt2: isDifferentCurrency ? numAmt2 : undefined,
      acc: selectedAccId,
      to: type === 'transfer' ? selectedToId : undefined,
      cat: type !== 'transfer' ? selectedCat : undefined,
      note: note.trim(),
      date,
    });

    try {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.8 },
      });
    } catch (e) {
      // ignore
    }

    onClose();
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    const catType = type === 'ingreso' ? 'ingreso' : 'gasto';
    onAddCategory(catType, newCategoryName.trim());
    setSelectedCat(newCategoryName.trim());
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const activeCategoryList = type === 'ingreso' ? categories.ingreso : categories.gasto;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-slate-800/80">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            {initialData?.id ? 'Editar Movimiento' : 'Nuevo Movimiento'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Segmented Type Switcher */}
          <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setType('gasto');
                setSelectedCat(categories.gasto[0] || '');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'gasto'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => {
                setType('ingreso');
                setSelectedCat(categories.ingreso[0] || '');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'ingreso'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => setType('transfer')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'transfer'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Transferir
            </button>
          </div>

          {/* Amount Input with Currency label */}
          <div className="flex flex-col items-center justify-center py-2 bg-slate-950/60 rounded-2xl border border-slate-800/80 p-4">
            <span className="text-[11px] font-medium text-slate-400 mb-1">
              Monto en {currentAccount ? currentAccount.cur : activeCurrency}
            </span>
            <div className="flex items-center justify-center gap-1 w-full">
              <span className="text-2xl font-bold text-slate-400">
                {currentAccount?.cur === 'USDT'
                  ? '₮'
                  : currentAccount?.cur === 'USD'
                  ? '$'
                  : 'Bs.'}
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                autoFocus={!initialData?.id}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-3/4 bg-transparent text-3xl sm:text-4xl font-extrabold text-white text-center focus:outline-none placeholder-slate-600"
              />
            </div>
          </div>

          {/* Account selector chips */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {type === 'ingreso'
                  ? 'Cuenta donde ingresa:'
                  : type === 'transfer'
                  ? 'Cuenta Origen (sale):'
                  : 'Cuenta / Billetera de pago:'}
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {accounts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAccId(a.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    selectedAccId === a.id
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-sm'
                      : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {a.name} · <span className="font-mono text-[10px]">{a.cur}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Transfer destination account */}
          {type === 'transfer' && (
            <div className="space-y-3 p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
              <label className="text-xs font-semibold text-teal-300 flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-teal-400" />
                <span>Cuenta Destino (recibe):</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {accounts
                  .filter((a) => a.id !== selectedAccId)
                  .map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedToId(a.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        selectedToId === a.id
                          ? 'bg-teal-500/20 text-teal-300 border-teal-500 shadow-sm'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {a.name} · <span className="font-mono text-[10px]">{a.cur}</span>
                    </button>
                  ))}
              </div>

              {/* Cross-currency conversion input */}
              {isDifferentCurrency && (
                <div className="pt-2 border-t border-slate-800/80">
                  <label className="text-[11px] font-medium text-slate-300 block mb-1">
                    Monto final que recibe en {toAccount?.cur}:
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    placeholder={`Monto en ${toAccount?.cur}`}
                    value={amount2}
                    onChange={(e) => setAmount2(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Category Chips (if not transfer) */}
          {type !== 'transfer' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Categoría:</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(!isAddingCategory)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> Nueva
                </button>
              </div>

              {/* Add category inline */}
              {isAddingCategory && (
                <div className="flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <input
                    type="text"
                    placeholder="Nombre de categoría..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    className="text-xs px-2.5 py-1 bg-emerald-500 text-slate-950 font-bold rounded-lg"
                  >
                    Agregar
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                {activeCategoryList.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCat(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                      selectedCat === cat
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Note and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400">Nota / Detalle</label>
              <input
                type="text"
                placeholder="Ej. YUMMY, Almuerzo, Mercado..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" /> Fecha
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 space-y-2">
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <Check className="w-4 h-4" />
              {initialData?.id ? 'Guardar Cambios' : 'Registrar Movimiento'}
            </button>

            {initialData?.id && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('¿Deseas eliminar este movimiento?')) {
                    onDelete(initialData.id!);
                    onClose();
                  }
                }}
                className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar Movimiento
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
