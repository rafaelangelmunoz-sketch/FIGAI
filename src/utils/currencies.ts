import { CurrencyCode, ExchangeRates } from '../types/finance';

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  VES: 'Bs. ',
  USD: '$ ',
  USDT: '₮ ',
  EUR: '€ ',
};

export function formatMoney(amount: number, cur: CurrencyCode): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount || 0);

  const formatted = abs.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const sign = isNegative ? '−' : '';

  if (cur === 'USDT') {
    return `${sign}${formatted} USDT`;
  }

  const sym = CURRENCY_SYMBOLS[cur] || `${cur} `;
  return `${sign}${sym}${formatted}`;
}

export function formatCompactMoney(amount: number, cur: CurrencyCode): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount || 0);
  let str = '';
  if (abs >= 1_000_000) {
    str = (abs / 1_000_000).toFixed(1) + 'M';
  } else if (abs >= 1_000) {
    str = (abs / 1_000).toFixed(1) + 'k';
  } else {
    str = abs.toFixed(2);
  }
  const sign = isNegative ? '−' : '';
  const sym = cur === 'USDT' ? '₮' : CURRENCY_SYMBOLS[cur]?.trim() || '';
  return `${sign}${sym}${str}`;
}

export function convertAmount(
  amount: number,
  fromCur: CurrencyCode,
  toCur: CurrencyCode,
  rates: ExchangeRates
): number {
  if (fromCur === toCur) return amount;

  // First convert to USD as base
  let inUsd = amount;
  if (fromCur === 'USD') inUsd = amount;
  else if (fromCur === 'USDT') inUsd = amount / (rates.usdtPerUsd || 1);
  else if (fromCur === 'VES') inUsd = amount / (rates.vesPerUsd || 50);
  else if (fromCur === 'EUR') inUsd = amount / (rates.eurPerUsd || 0.92);

  // Then convert from USD to toCur
  if (toCur === 'USD') return inUsd;
  if (toCur === 'USDT') return inUsd * (rates.usdtPerUsd || 1);
  if (toCur === 'VES') return inUsd * (rates.vesPerUsd || 50);
  if (toCur === 'EUR') return inUsd * (rates.eurPerUsd || 0.92);

  return amount;
}

export function padZero(n: number): string {
  return String(n).padStart(2, '0');
}

export function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
}

export function getCurrentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}`;
}

export function shiftMonthStr(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}`;
}

export function getMonthLabel(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

export function getRelativeDateLabel(dateStr: string): string {
  const today = getTodayStr();
  if (dateStr === today) return 'Hoy';

  const d = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yStr = `${yesterday.getFullYear()}-${padZero(yesterday.getMonth() + 1)}-${padZero(yesterday.getDate())}`;

  if (dateStr === yStr) return 'Ayer';

  return d.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
