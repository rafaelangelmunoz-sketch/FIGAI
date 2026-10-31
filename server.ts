import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Gemini Client server-side
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Endpoint to parse natural language voice/text into structured financial transactions
app.post('/api/parse-voice', async (req: Request, res: Response): Promise<void> => {
  try {
    const { transcript, accounts = [], categories = { gasto: [], ingreso: [] } } = req.body;

    if (!transcript || typeof transcript !== 'string') {
      res.status(400).json({ error: 'El texto de voz o transcripción es requerido' });
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // If Gemini is available, use gemini-3.8-flash for high-precision parsing
    if (aiClient) {
      try {
        const prompt = `Analiza la siguiente frase de voz de finanzas personales en español y extrae la información en formato JSON estructurado.
Frase dicha por el usuario: "${transcript}"

Fecha actual: ${todayStr}

Cuentas disponibles del usuario:
${JSON.stringify(accounts, null, 2)}

Categorías de gastos disponibles:
${JSON.stringify(categories.gasto || [], null, 2)}

Categorías de ingresos disponibles:
${JSON.stringify(categories.ingreso || [], null, 2)}

Reglas de extracción:
1. "tipo": debe ser "gasto", "ingreso", o "transfer" (transferencia entre cuentas).
   - Frases como "INGRESO a Banesco 3000Bs YUMMY", "cobré", "me pagaron", "recibí", "depósito" indican "ingreso".
   - Frases como "compré", "gasté", "pagué", "consumo", "almuerzo" indican "gasto".
   - Frases como "pasé de Banesco a Zinli", "transferí", "cambié" indican "transfer".
2. "monto": número positivo (ej: 3000, 15.5, 50). Ignora comas o puntos de miles.
3. "moneda": una de "VES", "USD", "USDT", "EUR".
   - "bs", "bolívares", "bolivares", "bs.", "bolivares digitales" -> "VES".
   - "dólares", "dolares", "$", "bucks" -> "USD".
   - "usdt", "tether", "dólar crypto", "cripto" -> "USDT".
   - "euros", "€" -> "EUR".
   - Si no se menciona moneda pero se menciona una cuenta, usa la moneda de esa cuenta. Si no, por defecto "VES" o "USD".
4. "cuenta": Nombre de la cuenta origen (o receptora si es ingreso) que coincida o mejor se parezca a las cuentas del usuario (ej: Banesco, Mercantil, Efectivo Bs, Efectivo USD, Binance, Zinli). Si no coincide con ninguna, indica la más probable o el nombre mencionado.
5. "cuentaId": el id de la cuenta identificada en la lista de cuentas, o null si no se encuentra.
6. "cuentaDestinoId": para transferencias, el id de la cuenta destino si aplica, o null.
7. "cuentaDestinoNombre": nombre de la cuenta destino para transferencias, o null.
8. "categoria": la categoría más adecuada dentro de las listas provistas o una sugerida apropiada (ej: Alimentación, Transporte, Servicios, Ocio, Salario, Freelance).
9. "nota": concepto o detalle (ej: "YUMMY", "almuerzo en restaurant", "gasolina", "pago móvil a Carlos").
10. "fecha": fecha en formato YYYY-MM-DD. Si no especifica "ayer", "hace 2 días", usa ${todayStr}.
11. "resumenHumano": breve frase legible para mostrar en la interfaz (ej: "Ingreso de 3.000 Bs en Banesco (YUMMY)").`;

        const geminiPromise = aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                tipo: { type: Type.STRING, description: 'gasto, ingreso o transfer' },
                monto: { type: Type.NUMBER, description: 'Monto numérico positivo' },
                moneda: { type: Type.STRING, description: 'VES, USD, USDT o EUR' },
                cuenta: { type: Type.STRING, description: 'Nombre de la cuenta' },
                cuentaId: { type: Type.STRING, description: 'ID de la cuenta o vacío' },
                cuentaDestinoNombre: { type: Type.STRING, description: 'Nombre de cuenta destino si es transfer' },
                cuentaDestinoId: { type: Type.STRING, description: 'ID de cuenta destino si es transfer' },
                categoria: { type: Type.STRING, description: 'Categoría asignada' },
                nota: { type: Type.STRING, description: 'Nota o concepto' },
                fecha: { type: Type.STRING, description: 'Fecha YYYY-MM-DD' },
                resumenHumano: { type: Type.STRING, description: 'Resumen amigable' },
              },
              required: ['tipo', 'monto', 'moneda', 'nota', 'fecha'],
            },
          },
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini timeout')), 4000)
        );

        const response: any = await Promise.race([geminiPromise, timeoutPromise]);

        const parsedJson = JSON.parse(response.text || '{}');
        res.json({ success: true, parsed: parsedJson, aiPowered: true });
        return;
      } catch (geminiError: any) {
        console.warn('Gemini parsing warning, falling back to heuristic parser:', geminiError?.message);
        // Fall back to heuristic server parser
      }
    }

    // Heuristic rule-based fallback parser
    const heuristic = parseHeuristic(transcript, accounts, categories, todayStr);
    res.json({ success: true, parsed: heuristic, aiPowered: false });
  } catch (error: any) {
    console.error('Error in parse-voice:', error);
    res.status(500).json({ error: 'Error procesando la voz', details: error.message });
  }
});

// Endpoint for smart financial monthly insights & cash flow diagnosis
app.post('/api/financial-insights', async (req: Request, res: Response): Promise<void> => {
  try {
    const { month, totals, categoriesBreakdown, accountsBreakdown, remindersCount } = req.body;

    if (!aiClient) {
      res.json({
        success: true,
        insight: {
          status: totals?.balance >= 0 ? 'Saludable' : 'Alerta',
          headline: totals?.balance >= 0 ? 'Flujo de caja positivo este mes' : 'Gastos superan los ingresos',
          tips: [
            'Mantén un fondo de emergencia de al menos 1 a 2 meses en moneda dura (USD/USDT).',
            'Registra tus gastos diarios con voz inmediatamente después de realizarlos para evitar fugas invisibles.',
            'Revisa los recordatorios de pagos para evitar mora o cortes de servicios.',
          ],
        },
      });
      return;
    }

    const prompt = `Actúa como un asesor financiero experto en economía multi-moneda (Venezuela/Latinoamérica: Bolívares VES, Dólares USD, Cripto USDT).
Analiza el flujo de caja del mes ${month}:
- Ingresos totales: ${totals?.ingresos}
- Gastos totales: ${totals?.gastos}
- Balance neto: ${totals?.balance}
- Moneda principal: ${totals?.moneda || 'VES'}
- Desglose de gastos por categoría: ${JSON.stringify(categoriesBreakdown || [])}
- Cuentas activas: ${JSON.stringify(accountsBreakdown || [])}
- Recordatorios de pagos pendientes: ${remindersCount || 0}

Genera un diagnóstico financiero conciso en español para móvil con:
1. "status": "Excelente", "Saludable", "Precaución" o "Alerta"
2. "headline": frase corta y directa de impacto (máximo 8 palabras)
3. "analysis": explicación de 2 oraciones sobre el flujo de caja y la mayor categoría de gasto.
4. "tips": lista de 3 consejos accionables para optimizar liquidez y protegerse contra la devaluación o gastos innecesarios.`;

    const geminiPromise = aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
            headline: { type: Type.STRING },
            analysis: { type: Type.STRING },
            tips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['status', 'headline', 'analysis', 'tips'],
        },
      },
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Insights timeout')), 4000)
    );

    const response: any = await Promise.race([geminiPromise, timeoutPromise]);

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, insight: parsed });
  } catch (err: any) {
    console.error('Error in financial-insights:', err);
    res.json({
      success: true,
      insight: {
        status: 'Estable',
        headline: 'Control mensual en curso',
        analysis: 'Continúa registrando tus movimientos diarios para obtener métricas predictivas precisas.',
        tips: [
          'Agrupa tus gastos recurrentes en los recordatorios.',
          'Diversifica tus saldos entre billeteras digitales y cuentas bancarias.',
        ],
      },
    });
  }
});

// Helper for heuristic speech parsing
function parseHeuristic(
  text: string,
  accounts: any[] = [],
  categories: any = { gasto: [], ingreso: [] },
  todayStr: string
) {
  const clean = text.toLowerCase().trim();

  // 1. Determine Type
  let tipo: 'gasto' | 'ingreso' | 'transfer' = 'gasto';
  if (/transfer|pase de|pasar|traspaso|cambi[ae]/i.test(clean)) {
    tipo = 'transfer';
  } else if (/ingreso|cobr[eo]|pago a mi favor|recib[ií]|deposito|depósito|sueldo|salario|ganancia/i.test(clean)) {
    tipo = 'ingreso';
  } else {
    tipo = 'gasto';
  }

  // 2. Extract Amount
  // Support "3000", "3000bs", "3.000", "3000,50", "3000.50", "3k" (3000)
  let monto = 0;
  const kMatch = clean.match(/(\d+([.,]\d+)?)\s*k\b/i);
  if (kMatch) {
    monto = parseFloat(kMatch[1].replace(',', '.')) * 1000;
  } else {
    const gluedMatch = clean.match(/(\d+([.,]\d+)?)\s*(bs|ves|usd|usdt|dolares|dólares|bolivares|bolívares|\$|€|tether)/i);
    if (gluedMatch) {
      monto = parseFloat(gluedMatch[1].replace(',', '.'));
    } else {
      const numMatch = clean.match(/\d+([.,]\d+)?/);
      if (numMatch) {
        monto = parseFloat(numMatch[0].replace(',', '.'));
      }
    }
  }

  // 3. Extract Currency
  let moneda = 'VES';
  if (/\b(usdt|tether|cripto|crypto)\b/i.test(clean)) {
    moneda = 'USDT';
  } else if (/\b(usd|dolar|dólar|dolares|dólares|\$)\b/i.test(clean)) {
    moneda = 'USD';
  } else if (/\b(eur|euro|euros|€)\b/i.test(clean)) {
    moneda = 'EUR';
  } else if (/\b(bs|ves|bolivar|bolívar|bolívares|bolivares)\b/i.test(clean)) {
    moneda = 'VES';
  }

  // 4. Match Account
  let matchedAcc = accounts.find((a) => clean.includes(a.name.toLowerCase()));
  if (!matchedAcc) {
    // fuzzy match keywords (banesco, mercantil, provincial, bdv, venezuela, zelle, binance, efectivo)
    const keywords = ['banesco', 'mercantil', 'provincial', 'venezuela', 'bdv', 'binance', 'zelle', 'zinli', 'efectivo'];
    for (const kw of keywords) {
      if (clean.includes(kw)) {
        matchedAcc = accounts.find((a) => a.name.toLowerCase().includes(kw));
        if (matchedAcc) break;
      }
    }
  }

  // If currency not found explicitly but account matched, use account currency
  if (matchedAcc && !/\b(usdt|usd|dolar|dólar|bs|ves|eur)\b/i.test(clean)) {
    moneda = matchedAcc.cur || moneda;
  }

  // 5. Note / Concept extraction
  // remove numbers, "ingreso a", "gasto de", "transferencia", account names
  let note = clean
    .replace(/\b(ingreso|gasto|transferencia|transferir|pagu[eé]|compr[eé]|cobro)\b/gi, '')
    .replace(/\b(a|de|en|por|con)\b/gi, ' ')
    .replace(/\b\d+([.,]\d+)?\s*(k|bs|ves|usd|usdt|dolares|dólares|bolivares|bolívares)?\b/gi, '')
    .trim();

  if (matchedAcc) {
    note = note.replace(new RegExp(matchedAcc.name, 'gi'), '').trim();
  }
  note = note.replace(/\s+/g, ' ').trim();
  if (!note) note = tipo === 'ingreso' ? 'Ingreso general' : 'Gasto general';
  // Capitalize note
  note = note.charAt(0).toUpperCase() + note.slice(1);

  // 6. Match Category
  const catList = tipo === 'ingreso' ? categories.ingreso : categories.gasto;
  let matchedCat = catList?.[0] || (tipo === 'ingreso' ? 'Otros ingresos' : 'Otros');
  for (const cat of catList || []) {
    if (clean.includes(cat.toLowerCase())) {
      matchedCat = cat;
      break;
    }
  }

  return {
    tipo,
    monto: monto || 0,
    moneda,
    cuenta: matchedAcc ? matchedAcc.name : accounts[0]?.name || 'Efectivo',
    cuentaId: matchedAcc ? matchedAcc.id : accounts[0]?.id || '',
    cuentaDestinoNombre: null,
    cuentaDestinoId: null,
    categoria: matchedCat,
    nota: note,
    fecha: todayStr,
    resumenHumano: `${tipo.toUpperCase()}: ${monto} ${moneda} en ${matchedAcc ? matchedAcc.name : 'cuenta'} - ${note}`,
  };
}

// Development or Production handler
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
