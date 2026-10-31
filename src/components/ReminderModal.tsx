import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Check,
  CalendarClock,
  Wallet,
  Tag,
  Repeat,
} from 'lucide-react';
import {
  Account,
  CurrencyCode,
  PaymentReminder,
  RecurrenceType,
  CURRENCIES,
} from '../types/finance';
import { getTodayStr } from '../utils/currencies';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: string[];
  onSave: (reminder: Partial<PaymentReminder>) => void;
  onDelete?: (id: string) => void;
  initialData?: PaymentReminder | null;
  activeCurrency: CurrencyCode;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  onSave,
  onDelete,
  initialData,
  activeCurrency,
}) => {
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [cur, setCur] = useState<CurrencyCode>('USD');
  const [dueDate, setDueDate] = useState<string>(getTodayStr());
  const [recurrence, setRecurrence] = useState<RecurrenceType>('monthly');
  const [category, setCategory] = useState<string>(categories[0] || 'Servicios');
  const [accDefault, setAccDefault] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || '');
        setAmount(initialData.amount ? String(initialData.amount) : '');
        setCur(initialData.cur || 'USD');
        setDueDate(initialData.dueDate || getTodayStr());
        setRecurrence(initialData.recurrence || 'monthly');
        setCategory(initialData.category || categories[0] || 'Servicios');
        setAccDefault(initialData.accDefault || accounts[0]?.id || '');
        setNotes(initialData.notes || '');
      } else {
        setTitle('');
        setAmount('');
        setCur(activeCurrency);
        setDueDate(getTodayStr());
        setRecurrence('monthly');
        setCategory(categories[0] || 'Servicios');
        setAccDefault(accounts[0]?.id || '');
        setNotes('');
      }
    }
  }, [isOpen, initialData, accounts, activeCurrency, categories]);

  if (!isOpen) return null;

  const handleSave = () => {
    const numAmt = parseFloat(amount);
    if (!title.trim() || isNaN(numAmt) || numAmt <= 0) {
      return;
    }

    onSave({
      id: initialData?.id,
      title: title.trim(),
      amount: numAmt,
      cur,
      dueDate,
      recurrence,
      category,
      accDefault,
      notes: notes.trim(),
      isPaid: initialData ? initialData.isPaid : false,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <CalendarClock className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white">
              {initialData?.id ? 'Editar Recordatorio' : 'Nuevo Recordatorio de Pago'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Title */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">
              Concepto / Nombre del Pago:
            </label>
            <input
              type="text"
              placeholder="Ej. Cantv Fibra, Netflix, Alquiler, Tarjeta de Crédito..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Monto:</label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Moneda:</label>
              <select
                value={cur}
                onChange={(e) => setCur(e.target.value as CurrencyCode)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date & Recurrence */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300 flex items-center gap-1">
                <CalendarClock className="w-3.5 h-3.5 text-amber-400" />
                Fecha de Vencimiento:
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300 flex items-center gap-1">
                <Repeat className="w-3.5 h-3.5 text-amber-400" />
                Frecuencia:
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="monthly">Mensual</option>
                <option value="biweekly">Quincenal</option>
                <option value="weekly">Semanal</option>
                <option value="none">Único (una sola vez)</option>
              </select>
            </div>
          </div>

          {/* Category & Preferred Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                Categoría:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-amber-400" />
                Cuenta sugerida para pagar:
              </label>
              <select
                value={accDefault}
                onChange={(e) => setAccDefault(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.cur})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Notas o Referencia:</label>
            <textarea
              rows={2}
              placeholder="Número de contrato, link o recordatorio extra..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Save & Delete */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-sm shadow-lg flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <Check className="w-4 h-4" />
              {initialData?.id ? 'Guardar Cambios' : 'Crear Recordatorio de Pago'}
            </button>

            {initialData?.id && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('¿Eliminar este recordatorio?')) {
                    onDelete(initialData.id);
                    onClose();
                  }
                }}
                className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar Recordatorio
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
