import { Account, CurrencyCode, TransactionType } from '../types/finance';
import { getTodayStr } from './currencies';

export interface ParsedVoiceResult {
  tipo: TransactionType;
  monto: number;
  moneda: CurrencyCode;
  cuenta: string;
  cuentaId?: string | null;
  cuentaDestinoNombre?: string | null;
  cuentaDestinoId?: string | null;
  categoria: string;
  nota: string;
  fecha: string;
  resumenHumano?: string;
  aiPowered?: boolean;
}

// Check browser Web Speech API support
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

// Create a SpeechRecognition instance with Spanish language
export function createSpeechRecognizer(
  onResult: (transcript: string, isFinal: boolean) => void,
  onError: (errorMsg: string) => void,
  onEnd: () => void
): any {
  if (!isSpeechRecognitionSupported()) {
    onError('Tu navegador no soporta entrada de voz directa por Web Speech API. Puedes escribir la frase.');
    return null;
  }

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.lang = 'es-ES'; // Spanish
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    let interim = '';
    let final = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        final += event.results[i][0].transcript;
      } else {
        interim += event.results[i][0].transcript;
      }
    }

    const currentText = final || interim;
    onResult(currentText.trim(), Boolean(final));
  };

  recognition.onerror = (event: any) => {
    console.warn('SpeechRecognition error:', event.error);
    if (event.error === 'not-allowed') {
      onError('Permiso de micrófono denegado en el navegador.');
    } else if (event.error === 'no-speech') {
      onError('No se detectó voz. Intenta hablar nuevamente.');
    } else {
      onError(`Error de audio (${event.error})`);
    }
  };

  recognition.onend = () => {
    onEnd();
  };

  return recognition;
}

// Client-side rule-based parser fallback
export function parseVoiceLocally(
  rawText: string,
  accounts: Account[],
  categories: { gasto: string[]; ingreso: string[] }
): ParsedVoiceResult {
  const text = rawText.toLowerCase().trim();
  const todayStr = getTodayStr();

  // 1. Detect transaction type
  let tipo: TransactionType = 'gasto';
  if (/transfer|pase|pasar|traspaso|cambio|cambiar/i.test(text)) {
    tipo = 'transfer';
  } else if (/ingreso|cobro|cobre|cobré|deposito|depósito|sueldo|salario|recibi|recibí|abono/i.test(text)) {
    tipo = 'ingreso';
  }

  // 2. Detect currency
  let moneda: CurrencyCode = 'VES';
  if (/usdt|tether|cripto|crypto/i.test(text)) {
    moneda = 'USDT';
  } else if (/usd|dolar|dólar|dolares|dólares|\$/i.test(text)) {
    moneda = 'USD';
  } else if (/eur|euro|euros|€/i.test(text)) {
    moneda = 'EUR';
  } else if (/bs|ves|bolivar|bolívar|bolivares|bolívares/i.test(text)) {
    moneda = 'VES';
  }

  // 3. Detect Amount
  let monto = 0;
  // match patterns like "3000", "3000bs", "3000.50", "3000,50", "3k"
  const kMatch = text.match(/(\d+([.,]\d+)?)\s*k\b/i);
  if (kMatch) {
    monto = parseFloat(kMatch[1].replace(',', '.')) * 1000;
  } else {
    const gluedMatch = text.match(/(\d+([.,]\d+)?)\s*(bs|ves|usd|usdt|dolares|dólares|bolivares|bolívares|\$|€|tether)/i);
    if (gluedMatch) {
      monto = parseFloat(gluedMatch[1].replace(',', '.'));
    } else {
      const numMatches = text.match(/\d+([.,]\d+)?/g);
      if (numMatches && numMatches.length > 0) {
        for (const m of numMatches) {
          const val = parseFloat(m.replace(',', '.'));
          if (val !== 2025 && val !== 2026 && val !== 2024) {
            monto = val;
            break;
          }
        }
        if (!monto && numMatches[0]) {
          monto = parseFloat(numMatches[0].replace(',', '.'));
        }
      }
    }
  }

  // 4. Match Account
  let matchedAcc: Account | undefined = accounts.find((a) =>
    text.includes(a.name.toLowerCase())
  );

  if (!matchedAcc) {
    // Try matching parts of the name (e.g. Banesco, Mercantil, Binance, Efectivo)
    const keywords = ['banesco', 'mercantil', 'provincial', 'venezuela', 'bdv', 'binance', 'zelle', 'zinli', 'wally', 'efectivo'];
    for (const kw of keywords) {
      if (text.includes(kw)) {
        matchedAcc = accounts.find((a) => a.name.toLowerCase().includes(kw));
        if (matchedAcc) break;
      }
    }
  }

  // If currency was default but account has specific currency, prefer account's currency
  if (matchedAcc && !/usdt|usd|dolar|dólar|bs|ves|eur/i.test(text)) {
    moneda = matchedAcc.cur;
  }

  // Destination account for transfers
  let toAcc: Account | undefined;
  if (tipo === 'transfer') {
    toAcc = accounts.find((a) => a.id !== matchedAcc?.id);
  }

  // 5. Clean note
  let note = text
    .replace(/\b(ingreso|gasto|transferencia|transferir|pago|pagu[eé]|compr[eé]|consumo|a|de|en|por|con|para)\b/gi, ' ')
    .replace(/\b\d+([.,]\d+)?\s*(k|bs|ves|usd|usdt|dolares|dólares|bolivares|bolívares)?\b/gi, ' ')
    .trim();

  if (matchedAcc) {
    note = note.replace(new RegExp(matchedAcc.name, 'gi'), ' ').trim();
  }
  note = note.replace(/\s+/g, ' ').trim();
  if (!note) {
    note = tipo === 'ingreso' ? 'Ingreso registrado' : 'Gasto registrado';
  }
  note = note.charAt(0).toUpperCase() + note.slice(1);

  // 6. Match category
  const catList = tipo === 'ingreso' ? categories.ingreso : categories.gasto;
  let matchedCat = catList[0] || 'General';

  // Keyword to category association
  const catKeywords: Record<string, string> = {
    almuerzo: 'Alimentación',
    cena: 'Alimentación',
    comida: 'Alimentación',
    restaurante: 'Ocio y Restaurantes',
    yummy: 'Alimentación',
    pedidosya: 'Alimentación',
    supermercado: 'Supermercado',
    abasto: 'Supermercado',
    mercado: 'Supermercado',
    gasolina: 'Transporte y Gasolina',
    uber: 'Transporte y Gasolina',
    taxi: 'Transporte y Gasolina',
    metro: 'Transporte y Gasolina',
    internet: 'Internet y Telefonía',
    cantv: 'Internet y Telefonía',
    fibra: 'Internet y Telefonía',
    recarga: 'Internet y Telefonía',
    movistar: 'Internet y Telefonía',
    digitel: 'Internet y Telefonía',
    salario: 'Salario / Nómina',
    sueldo: 'Salario / Nómina',
    quincena: 'Salario / Nómina',
    freelance: 'Honorarios Freelance',
    farmacia: 'Salud y Farmacia',
    medicina: 'Salud y Farmacia',
  };

  for (const [kw, cat] of Object.entries(catKeywords)) {
    if (text.includes(kw)) {
      matchedCat = cat;
      break;
    }
  }

  const defaultAcc = accounts[0];
  const finalAcc = matchedAcc || defaultAcc;

  return {
    tipo,
    monto: monto || 0,
    moneda: finalAcc?.cur || moneda,
    cuenta: finalAcc?.name || 'Cuenta Principal',
    cuentaId: finalAcc?.id || '',
    cuentaDestinoNombre: toAcc?.name || null,
    cuentaDestinoId: toAcc?.id || null,
    categoria: matchedCat,
    nota: note,
    fecha: todayStr,
    resumenHumano: `${tipo.toUpperCase()} en ${finalAcc?.name || 'Cuenta'}: ${monto} ${moneda} (${note})`,
    aiPowered: false,
  };
}

// Async parser that tries server Gemini 3.8 Flash endpoint first, with local fallback
export async function parseVoiceTranscript(
  transcript: string,
  accounts: Account[],
  categories: { gasto: string[]; ingreso: string[] }
): Promise<ParsedVoiceResult> {
  try {
    const res = await fetch('/api/parse-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, accounts, categories }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.parsed && data.parsed.monto !== undefined) {
        // Ensure accountId matches a real account
        let matchedAccountId = data.parsed.cuentaId;
        if (!matchedAccountId || !accounts.some((a) => a.id === matchedAccountId)) {
          const accByName = accounts.find(
            (a) =>
              a.name.toLowerCase() === (data.parsed.cuenta || '').toLowerCase() ||
              (data.parsed.cuenta || '').toLowerCase().includes(a.name.toLowerCase())
          );
          matchedAccountId = accByName ? accByName.id : accounts[0]?.id;
        }

        return {
          tipo: (data.parsed.tipo as TransactionType) || 'gasto',
          monto: Number(data.parsed.monto) || 0,
          moneda: (data.parsed.moneda as CurrencyCode) || 'VES',
          cuenta: data.parsed.cuenta || accounts[0]?.name || '',
          cuentaId: matchedAccountId,
          cuentaDestinoNombre: data.parsed.cuentaDestinoNombre || null,
          cuentaDestinoId: data.parsed.cuentaDestinoId || null,
          categoria: data.parsed.categoria || categories.gasto[0] || 'General',
          nota: data.parsed.nota || transcript,
          fecha: data.parsed.fecha || getTodayStr(),
          resumenHumano: data.parsed.resumenHumano,
          aiPowered: Boolean(data.aiPowered),
        };
      }
    }
  } catch (err) {
    console.warn('Server parse voice error, using fallback:', err);
  }

  // Fallback locally
  return parseVoiceLocally(transcript, accounts, categories);
}
