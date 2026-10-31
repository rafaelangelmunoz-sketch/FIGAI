import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  X,
  Sparkles,
  Check,
  Edit3,
  RefreshCw,
  AlertCircle,
  Volume2,
} from 'lucide-react';
import { Account, CurrencyCode, TransactionType } from '../types/finance';
import {
  isSpeechRecognitionSupported,
  createSpeechRecognizer,
  parseVoiceTranscript,
  ParsedVoiceResult,
} from '../utils/speechParser';
import { formatMoney } from '../utils/currencies';
import confetti from 'canvas-confetti';

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: { gasto: string[]; ingreso: string[] };
  onSaveParsedTransaction: (data: {
    type: TransactionType;
    amt: number;
    amt2?: number;
    acc: string;
    to?: string;
    cat: string;
    note: string;
    date: string;
  }) => void;
  onEditInForm: (data: Partial<ParsedVoiceResult>) => void;
}

const EXAMPLE_PHRASES = [
  'INGRESO a Banesco 3000Bs YUMMY',
  'Gasto de 15 USD en Efectivo USD Almuerzo',
  'Gasto 1200 Bs en Banesco Supermercado Plaza',
  'Ingreso a Binance 450 USDT Pago Freelance',
  'Transferí 100 USDT de Binance a Efectivo USD',
];

export const VoiceInputModal: React.FC<VoiceInputModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  onSaveParsedTransaction,
  onEditInForm,
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [parsedResult, setParsedResult] = useState<ParsedVoiceResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasSpeechSupport, setHasSpeechSupport] = useState<boolean>(true);

  const recognizerRef = useRef<any>(null);

  useEffect(() => {
    setHasSpeechSupport(isSpeechRecognitionSupported());
  }, []);

  // When modal opens, clear and optionally auto-start microphone if supported
  useEffect(() => {
    if (isOpen) {
      setTranscript('');
      setParsedResult(null);
      setErrorMsg(null);
      if (isSpeechRecognitionSupported()) {
        startListening();
      }
    } else {
      stopListening();
    }
    return () => {
      stopListening();
    };
  }, [isOpen]);

  const startListening = () => {
    setErrorMsg(null);
    try {
      if (recognizerRef.current) {
        recognizerRef.current.stop();
      }

      const rec = createSpeechRecognizer(
        (text: string) => {
          setTranscript(text);
        },
        (err: string) => {
          setErrorMsg(err);
          setIsListening(false);
        },
        () => {
          setIsListening(false);
        }
      );

      if (rec) {
        recognizerRef.current = rec;
        rec.start();
        setIsListening(true);
      }
    } catch (e: any) {
      console.warn('Speech start error:', e);
      setIsListening(false);
      setErrorMsg('No se pudo activar el micrófono. Puedes escribir tu frase.');
    }
  };

  const stopListening = () => {
    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognizerRef.current = null;
    }
    setIsListening(false);
  };

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
      if (transcript.trim()) {
        handleAnalyze(transcript);
      }
    } else {
      startListening();
    }
  };

  // Analyze transcript (either voice or typed or example click)
  const handleAnalyze = async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const result = await parseVoiceTranscript(text, accounts, categories);
      setParsedResult(result);
    } catch (err: any) {
      setErrorMsg('Error analizando la frase. Puedes completarla manualmente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseExample = (example: string) => {
    setTranscript(example);
    stopListening();
    handleAnalyze(example);
  };

  const handleConfirmSave = () => {
    if (!parsedResult) return;

    if (parsedResult.monto <= 0) {
      setErrorMsg('Por favor especifica un monto mayor a 0');
      return;
    }

    const matchedAccountId =
      parsedResult.cuentaId ||
      accounts.find((a) => a.name.toLowerCase().includes(parsedResult.cuenta.toLowerCase()))?.id ||
      accounts[0]?.id;

    if (!matchedAccountId) {
      setErrorMsg('Selecciona una cuenta válida');
      return;
    }

    onSaveParsedTransaction({
      type: parsedResult.tipo,
      amt: parsedResult.monto,
      acc: matchedAccountId,
      to: parsedResult.cuentaDestinoId || undefined,
      cat: parsedResult.categoria,
      note: parsedResult.nota,
      date: parsedResult.fecha,
    });

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch (e) {
      // ignore
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                Ingreso por Voz
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> IA Gemini
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Di: Tipo, Cuenta, Monto y Nota
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Main Visualizer & Mic Trigger */}
          <div className="flex flex-col items-center justify-center py-4 bg-slate-950/50 rounded-2xl border border-slate-800/60 relative overflow-hidden">
            {/* Wave animation circles */}
            {isListening && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-24 h-24 rounded-full bg-emerald-500/10 animate-ping"></div>
                <div className="w-36 h-36 rounded-full bg-teal-500/5 animate-pulse"></div>
              </div>
            )}

            <button
              onClick={handleToggleListening}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${
                isListening
                  ? 'bg-rose-500 text-white shadow-rose-500/30 ring-4 ring-rose-500/30 animate-pulse'
                  : 'bg-gradient-to-tr from-teal-600 via-emerald-500 to-teal-400 text-white shadow-emerald-500/25 hover:scale-105 active:scale-95'
              }`}
            >
              {isListening ? (
                <MicOff className="w-9 h-9" />
              ) : (
                <Mic className="w-9 h-9" />
              )}
            </button>

            <span className="mt-3 text-xs font-semibold tracking-wide flex items-center gap-1.5 text-slate-300">
              {isListening ? (
                <span className="text-rose-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  Escuchando tu voz... (toca para procesar)
                </span>
              ) : (
                <span className="text-slate-400">Toca el micrófono para hablar</span>
              )}
            </span>
          </div>

          {/* Transcript Display or Manual Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>Lo que dijiste o escribiste:</span>
              {transcript && (
                <button
                  onClick={() => {
                    setTranscript('');
                    setParsedResult(null);
                  }}
                  className="text-[11px] text-slate-400 hover:text-slate-200"
                >
                  Limpiar
                </button>
              )}
            </label>
            <div className="relative">
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                onBlur={() => {
                  if (transcript.trim() && !parsedResult) {
                    handleAnalyze(transcript);
                  }
                }}
                placeholder="Ejemplo: INGRESO a Banesco 3000Bs YUMMY"
                rows={2}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              />
            </div>
            {transcript && !isProcessing && (
              <div className="flex justify-end">
                <button
                  onClick={() => handleAnalyze(transcript)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" /> Re-analizar texto
                </button>
              </div>
            )}
          </div>

          {/* Loading Indicator */}
          {isProcessing && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Extrayendo Tipo, Cuenta, Monto y Nota con IA...</span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parsed Result Card */}
          {parsedResult && !isProcessing && (
            <div className="bg-slate-950/90 border border-emerald-500/30 rounded-2xl p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Movimiento Detectado
                </span>
                <span className="text-[10px] text-slate-400">
                  {parsedResult.aiPowered ? '⚡ Gemini 3.8 Flash' : 'Motor inteligente'}
                </span>
              </div>

              {/* Badges breakdown */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Tipo */}
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex flex-col">
                  <span className="text-[10px] text-slate-400">Tipo de operación</span>
                  <span
                    className={`font-bold uppercase ${
                      parsedResult.tipo === 'ingreso'
                        ? 'text-emerald-400'
                        : parsedResult.tipo === 'gasto'
                        ? 'text-rose-400'
                        : 'text-blue-400'
                    }`}
                  >
                    {parsedResult.tipo === 'ingreso'
                      ? '➕ Ingreso'
                      : parsedResult.tipo === 'gasto'
                      ? '➖ Gasto'
                      : '🔄 Transferencia'}
                  </span>
                </div>

                {/* Monto */}
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex flex-col">
                  <span className="text-[10px] text-slate-400">Monto & Moneda</span>
                  <span className="font-bold text-white">
                    {formatMoney(parsedResult.monto, parsedResult.moneda)}
                  </span>
                </div>

                {/* Cuenta */}
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex flex-col">
                  <span className="text-[10px] text-slate-400">Cuenta / Billetera</span>
                  <span className="font-semibold text-slate-200 truncate">
                    🏦 {parsedResult.cuenta}
                  </span>
                </div>

                {/* Categoria */}
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex flex-col">
                  <span className="text-[10px] text-slate-400">Categoría</span>
                  <span className="font-semibold text-slate-200 truncate">
                    🏷️ {parsedResult.categoria}
                  </span>
                </div>
              </div>

              {/* Nota */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <span className="text-[10px] text-slate-400 block mb-0.5">Nota o Detalle</span>
                <span className="font-medium text-slate-100 italic">
                  "{parsedResult.nota}"
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleConfirmSave}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-sm shadow-md flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                >
                  <Check className="w-4 h-4" /> Guardar Ahora
                </button>
                <button
                  onClick={() => {
                    onEditInForm(parsedResult);
                    onClose();
                  }}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 flex items-center justify-center transition-colors"
                  title="Ajustar en formulario completo"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Quick Examples for Testing */}
          <div className="pt-2">
            <span className="text-[11px] font-semibold text-slate-400 block mb-2 flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-teal-400" /> O prueba tocando un ejemplo rápido:
            </span>
            <div className="flex flex-col gap-1.5">
              {EXAMPLE_PHRASES.map((ph, idx) => (
                <button
                  key={idx}
                  onClick={() => handleUseExample(ph)}
                  className="text-left text-xs px-3 py-2 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 text-slate-300 hover:text-emerald-300 transition-all truncate"
                >
                  🎙️ {ph}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
