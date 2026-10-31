import {
  AppState,
  Account,
  Transaction,
  PaymentReminder,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from '../types/finance';

const STORAGE_KEY_V2 = 'finanzas_pro_v2';
const LEGACY_KEY_V1 = 'finanzas-v1';

export const generateId = (): string => Math.random().toString(36).substring(2, 10);

export function getDefaultState(): AppState {
  const initialAccounts: Account[] = [
    { id: 'acc_banesco', name: 'Banesco', kind: 'banco', cur: 'VES', ini: 25000, color: '#16a34a' },
    { id: 'acc_binance', name: 'Binance USDT', kind: 'billetera', cur: 'USDT', ini: 450, color: '#f59e0b' },
    { id: 'acc_efectivo_usd', name: 'Efectivo USD', kind: 'efectivo', cur: 'USD', ini: 120, color: '#059669' },
    { id: 'acc_efectivo_bs', name: 'Efectivo Bs', kind: 'efectivo', cur: 'VES', ini: 1500, color: '#10b981' },
    { id: 'acc_zinli', name: 'Zinli Digital', kind: 'billetera', cur: 'USD', ini: 65, color: '#8b5cf6' },
  ];

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');

  // Pre-seed with realistic transactions so the user immediately sees rich charts and flow
  const sampleTransactions: Transaction[] = [
    {
      id: generateId(),
      type: 'ingreso',
      amt: 3000,
      acc: 'acc_banesco',
      cat: 'Honorarios Freelance',
      note: 'YUMMY entrega y servicio',
      date: `${y}-${m}-02`,
      createdAt: Date.now() - 86400000 * 4,
    },
    {
      id: generateId(),
      type: 'ingreso',
      amt: 450,
      acc: 'acc_binance',
      cat: 'Salario / Nómina',
      note: 'Pago quincena crypto',
      date: `${y}-${m}-01`,
      createdAt: Date.now() - 86400000 * 5,
    },
    {
      id: generateId(),
      type: 'gasto',
      amt: 1200,
      acc: 'acc_banesco',
      cat: 'Supermercado',
      note: 'Compras automercado Plaza',
      date: `${y}-${m}-03`,
      createdAt: Date.now() - 86400000 * 3,
    },
    {
      id: generateId(),
      type: 'gasto',
      amt: 35,
      acc: 'acc_efectivo_usd',
      cat: 'Alimentación',
      note: 'Almuerzo familiar',
      date: `${y}-${m}-04`,
      createdAt: Date.now() - 86400000 * 2,
    },
    {
      id: generateId(),
      type: 'gasto',
      amt: 25,
      acc: 'acc_binance',
      cat: 'Servicios (Luz, Agua, Gas)',
      note: 'Recarga saldo y servicios',
      date: `${y}-${m}-05`,
      createdAt: Date.now() - 86400000 * 1,
    },
  ];

  // Pre-seed sample payment reminders (bills)
  const sampleReminders: PaymentReminder[] = [
    {
      id: generateId(),
      title: 'Servicio de Internet Fibra (Cantv / NetUno)',
      amount: 35,
      cur: 'USD',
      dueDate: `${y}-${m}-15`,
      recurrence: 'monthly',
      category: 'Internet y Telefonía',
      accDefault: 'acc_zinli',
      isPaid: false,
      notes: 'Pagar antes del 15 para evitar corte de señal',
    },
    {
      id: generateId(),
      title: 'Condominio del Edificio',
      amount: 45,
      cur: 'USD',
      dueDate: `${y}-${m}-20`,
      recurrence: 'monthly',
      category: 'Vivienda y Alquiler',
      accDefault: 'acc_banesco',
      isPaid: false,
      notes: 'Transferencia o pago móvil a tasa BCV',
    },
    {
      id: generateId(),
      title: 'Tarjeta de Crédito Banesco',
      amount: 2500,
      cur: 'VES',
      dueDate: `${y}-${m}-10`,
      recurrence: 'monthly',
      category: 'Otros gastos',
      accDefault: 'acc_banesco',
      isPaid: false,
      notes: 'Pago mínimo o total mensual',
    },
    {
      id: generateId(),
      title: 'Suscripción Streaming (Netflix & Spotify)',
      amount: 15,
      cur: 'USD',
      dueDate: `${y}-${m}-08`,
      recurrence: 'monthly',
      category: 'Ocio y Restaurantes',
      accDefault: 'acc_zinli',
      isPaid: true,
      paidDate: `${y}-${m}-08`,
      notes: 'Cobro automático con tarjeta digital',
    },
  ];

  return {
    accounts: initialAccounts,
    transactions: sampleTransactions,
    reminders: sampleReminders,
    categories: {
      gasto: [...DEFAULT_EXPENSE_CATEGORIES],
      ingreso: [...DEFAULT_INCOME_CATEGORIES],
    },
    rates: {
      vesPerUsd: 55.0,
      usdtPerUsd: 1.0,
      eurPerUsd: 0.92,
    },
    activeCurrency: 'VES',
    theme: 'dark',
  };
}

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V2);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure defaults if fields were missing
      return {
        ...getDefaultState(),
        ...parsed,
        categories: {
          gasto: parsed.categories?.gasto || DEFAULT_EXPENSE_CATEGORIES,
          ingreso: parsed.categories?.ingreso || DEFAULT_INCOME_CATEGORIES,
        },
        rates: {
          vesPerUsd: parsed.rates?.vesPerUsd || 55.0,
          usdtPerUsd: parsed.rates?.usdtPerUsd || 1.0,
          eurPerUsd: parsed.rates?.eurPerUsd || 0.92,
        },
      };
    }

    // Attempt migration from legacy V1
    const legacyRaw = localStorage.getItem(LEGACY_KEY_V1);
    if (legacyRaw) {
      const leg = JSON.parse(legacyRaw);
      const def = getDefaultState();

      if (Array.isArray(leg.accounts) && leg.accounts.length > 0) {
        def.accounts = leg.accounts;
      }
      if (Array.isArray(leg.tx)) {
        def.transactions = leg.tx.map((t: any) => ({
          id: t.id || generateId(),
          type: t.type || 'gasto',
          amt: Number(t.amt) || 0,
          amt2: t.amt2 ? Number(t.amt2) : undefined,
          acc: t.acc,
          to: t.to,
          cat: t.cat || 'Otros gastos',
          note: t.note || '',
          date: t.date || new Date().toISOString().split('T')[0],
          createdAt: Date.now(),
        }));
      }
      if (leg.cats) {
        def.categories.gasto = leg.cats.gasto || def.categories.gasto;
        def.categories.ingreso = leg.cats.ingreso || def.categories.ingreso;
      }
      saveAppState(def);
      return def;
    }
  } catch (e) {
    console.error('Failed to load state from localStorage:', e);
  }

  const defaultState = getDefaultState();
  saveAppState(defaultState);
  return defaultState;
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state to localStorage:', e);
  }
}
