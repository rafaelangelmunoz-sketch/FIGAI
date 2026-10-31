export type CurrencyCode = 'VES' | 'USD' | 'USDT' | 'EUR';

export type AccountKind = 'banco' | 'billetera' | 'efectivo';

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  cur: CurrencyCode;
  ini: number;
  color?: string;
}

export type TransactionType = 'gasto' | 'ingreso' | 'transfer';

export interface Transaction {
  id: string;
  type: TransactionType;
  amt: number;
  amt2?: number; // for transfers with currency exchange
  acc: string; // account ID
  to?: string; // destination account ID for transfer
  cat?: string; // category
  note?: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
}

export type RecurrenceType = 'none' | 'monthly' | 'biweekly' | 'weekly';

export interface PaymentReminder {
  id: string;
  title: string;
  amount: number;
  cur: CurrencyCode;
  dueDate: string; // YYYY-MM-DD
  recurrence: RecurrenceType;
  category: string;
  accDefault?: string; // preferred account to pay from
  isPaid: boolean;
  paidDate?: string;
  notes?: string;
  autoTransactionCreated?: boolean;
}

export interface ExchangeRates {
  vesPerUsd: number; // e.g. 50.0
  usdtPerUsd: number; // 1.0
  eurPerUsd: number; // 0.92
}

export interface AppState {
  accounts: Account[];
  transactions: Transaction[];
  reminders: PaymentReminder[];
  categories: {
    gasto: string[];
    ingreso: string[];
  };
  rates: ExchangeRates;
  lastUsedAccountId?: string;
  activeCurrency: CurrencyCode;
  theme: 'dark' | 'light' | 'system';
}

export const CURRENCIES: { code: CurrencyCode; label: string; symbol: string; badge: string }[] = [
  { code: 'VES', label: 'Bolívares (Bs)', symbol: 'Bs. ', badge: 'VES' },
  { code: 'USD', label: 'Dólares (USD)', symbol: '$ ', badge: 'USD' },
  { code: 'USDT', label: 'Tether (USDT)', symbol: '₮ ', badge: 'USDT' },
  { code: 'EUR', label: 'Euros (EUR)', symbol: '€ ', badge: 'EUR' },
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Alimentación',
  'Supermercado',
  'Transporte y Gasolina',
  'Servicios (Luz, Agua, Gas)',
  'Internet y Telefonía',
  'Vivienda y Alquiler',
  'Salud y Farmacia',
  'Ocio y Restaurantes',
  'Educación',
  'Compras personales',
  'Mascotas',
  'Impuestos y Tasas',
  'Otros gastos',
];

export const DEFAULT_INCOME_CATEGORIES = [
  'Salario / Nómina',
  'Honorarios Freelance',
  'Ventas del Negocio',
  'Rendimientos e Inversiones',
  'Remesas',
  'Reembolsos',
  'Otros ingresos',
];

export const COMMON_BANKS_WALLETS = [
  { name: 'Banesco', kind: 'banco' as AccountKind, cur: 'VES' as CurrencyCode, color: 'bg-emerald-600' },
  { name: 'Banco Mercantil', kind: 'banco' as AccountKind, cur: 'VES' as CurrencyCode, color: 'bg-blue-600' },
  { name: 'Banco de Venezuela (BDV)', kind: 'banco' as AccountKind, cur: 'VES' as CurrencyCode, color: 'bg-red-600' },
  { name: 'BBVA Provincial', kind: 'banco' as AccountKind, cur: 'VES' as CurrencyCode, color: 'bg-indigo-600' },
  { name: 'Binance USDT', kind: 'billetera' as AccountKind, cur: 'USDT' as CurrencyCode, color: 'bg-amber-500' },
  { name: 'Zinli Billetera', kind: 'billetera' as AccountKind, cur: 'USD' as CurrencyCode, color: 'bg-purple-600' },
  { name: 'Wally Tech', kind: 'billetera' as AccountKind, cur: 'USD' as CurrencyCode, color: 'bg-cyan-600' },
  { name: 'Zelle', kind: 'billetera' as AccountKind, cur: 'USD' as CurrencyCode, color: 'bg-violet-600' },
  { name: 'Efectivo Bs', kind: 'efectivo' as AccountKind, cur: 'VES' as CurrencyCode, color: 'bg-green-700' },
  { name: 'Efectivo USD', kind: 'efectivo' as AccountKind, cur: 'USD' as CurrencyCode, color: 'bg-emerald-700' },
];
