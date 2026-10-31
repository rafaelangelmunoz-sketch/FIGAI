/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MobileFrame } from './components/MobileFrame';
import { BottomNav, TabType } from './components/BottomNav';
import { DashboardTab } from './components/tabs/DashboardTab';
import { CashFlowTab } from './components/tabs/CashFlowTab';
import { RemindersTab } from './components/tabs/RemindersTab';
import { AccountsTab } from './components/tabs/AccountsTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { VoiceInputModal } from './components/VoiceInputModal';
import { TransactionModal } from './components/TransactionModal';
import { ReminderModal } from './components/ReminderModal';
import {
  Account,
  AppState,
  CurrencyCode,
  ExchangeRates,
  PaymentReminder,
  Transaction,
  TransactionType,
} from './types/finance';
import {
  getCurrentMonthStr,
  getTodayStr,
  shiftMonthStr,
} from './utils/currencies';
import {
  generateId,
  getDefaultState,
  loadAppState,
  saveAppState,
} from './utils/storage';

export default function App() {
  const [state, setState] = useState<AppState>(() => loadAppState());
  const [activeTab, setActiveTab] = useState<TabType>('inicio');
  const [currentMonth, setCurrentMonth] = useState<string>(() => getCurrentMonthStr());
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Modals
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState<boolean>(false);

  // Active editing targets
  const [editingTx, setEditingTx] = useState<Partial<Transaction> | null>(null);
  const [editingReminder, setEditingReminder] = useState<PaymentReminder | null>(null);

  // Auto-save on state change
  useEffect(() => {
    saveAppState(state);
  }, [state]);

  // Handlers for currency & accounts
  const handleChangeCurrency = (c: CurrencyCode) => {
    setState((prev) => ({ ...prev, activeCurrency: c }));
  };

  const handleSaveAccount = (acc: Account) => {
    setState((prev) => {
      const exists = prev.accounts.some((a) => a.id === acc.id);
      return {
        ...prev,
        accounts: exists
          ? prev.accounts.map((a) => (a.id === acc.id ? acc : a))
          : [...prev.accounts, acc],
      };
    });
  };

  const handleDeleteAccount = (accId: string) => {
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.filter((a) => a.id !== accId),
      transactions: prev.transactions.filter((t) => t.acc !== accId && t.to !== accId),
    }));
    if (selectedAccountId === accId) setSelectedAccountId(null);
  };

  // Handlers for transactions
  const handleSaveTransaction = (txData: {
    id?: string;
    type: TransactionType;
    amt: number;
    amt2?: number;
    acc: string;
    to?: string;
    cat?: string;
    note?: string;
    date: string;
  }) => {
    setState((prev) => {
      const isEdit = Boolean(txData.id);
      const newTx: Transaction = {
        id: txData.id || generateId(),
        type: txData.type,
        amt: txData.amt,
        amt2: txData.amt2,
        acc: txData.acc,
        to: txData.to,
        cat: txData.cat,
        note: txData.note,
        date: txData.date,
        createdAt: isEdit
          ? prev.transactions.find((t) => t.id === txData.id)?.createdAt || Date.now()
          : Date.now(),
      };

      const updatedList = isEdit
        ? prev.transactions.map((t) => (t.id === txData.id ? newTx : t))
        : [newTx, ...prev.transactions];

      // If transaction date is outside current viewed month, optionally navigate to it
      const txMonth = txData.date.slice(0, 7);
      if (txMonth !== currentMonth) {
        setCurrentMonth(txMonth);
      }

      return {
        ...prev,
        transactions: updatedList,
        lastUsedAccountId: txData.acc,
      };
    });
  };

  const handleDeleteTransaction = (txId: string) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== txId),
    }));
  };

  // Handlers for Reminders
  const handleSaveReminder = (reminderData: Partial<PaymentReminder>) => {
    setState((prev) => {
      const isEdit = Boolean(reminderData.id);
      const newReminder: PaymentReminder = {
        id: reminderData.id || generateId(),
        title: reminderData.title || 'Recordatorio de Pago',
        amount: reminderData.amount || 0,
        cur: reminderData.cur || 'USD',
        dueDate: reminderData.dueDate || getTodayStr(),
        recurrence: reminderData.recurrence || 'monthly',
        category: reminderData.category || 'Servicios (Luz, Agua, Gas)',
        accDefault: reminderData.accDefault || prev.accounts[0]?.id,
        isPaid: Boolean(reminderData.isPaid),
        paidDate: reminderData.paidDate,
        notes: reminderData.notes,
      };

      const updated = isEdit
        ? prev.reminders.map((r) => (r.id === reminderData.id ? newReminder : r))
        : [...prev.reminders, newReminder];

      return {
        ...prev,
        reminders: updated,
      };
    });
  };

  const handleDeleteReminder = (reminderId: string) => {
    setState((prev) => ({
      ...prev,
      reminders: prev.reminders.filter((r) => r.id !== reminderId),
    }));
  };

  const handleToggleReminderStatus = (reminderId: string) => {
    setState((prev) => ({
      ...prev,
      reminders: prev.reminders.map((r) =>
        r.id === reminderId
          ? {
              ...r,
              isPaid: !r.isPaid,
              paidDate: !r.isPaid ? getTodayStr() : undefined,
            }
          : r
      ),
    }));
  };

  // 1-tap Pay & Register: generates transaction in chosen account and marks reminder as paid
  const handleMarkPaidAndCreateTx = (reminder: PaymentReminder, accountId: string) => {
    const today = getTodayStr();

    // Create corresponding transaction
    const newTx: Transaction = {
      id: generateId(),
      type: 'gasto',
      amt: reminder.amount,
      acc: accountId,
      cat: reminder.category || 'Servicios (Luz, Agua, Gas)',
      note: `Pago: ${reminder.title}`,
      date: today,
      createdAt: Date.now(),
    };

    setState((prev) => {
      // Mark current reminder paid
      const updatedReminders = prev.reminders.map((r) => {
        if (r.id === reminder.id) {
          return {
            ...r,
            isPaid: true,
            paidDate: today,
          };
        }
        return r;
      });

      return {
        ...prev,
        transactions: [newTx, ...prev.transactions],
        reminders: updatedReminders,
      };
    });
  };

  // Categories management
  const handleAddCategory = (type: 'gasto' | 'ingreso', name: string) => {
    setState((prev) => {
      const currentList = prev.categories[type];
      if (currentList.includes(name)) return prev;
      return {
        ...prev,
        categories: {
          ...prev.categories,
          [type]: [...currentList, name],
        },
      };
    });
  };

  const handleDeleteCategory = (type: 'gasto' | 'ingreso', name: string) => {
    setState((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [type]: prev.categories[type].filter((c) => c !== name),
      },
    }));
  };

  // Exchange rates
  const handleUpdateRates = (newRates: ExchangeRates) => {
    setState((prev) => ({ ...prev, rates: newRates }));
  };

  // Reset or import
  const handleResetData = () => {
    const fresh = getDefaultState();
    setState(fresh);
    saveAppState(fresh);
  };

  const handleImportBackup = (imported: AppState) => {
    setState(imported);
    saveAppState(imported);
  };

  // Pending reminders count
  const pendingRemindersCount = state.reminders.filter((r) => !r.isPaid).length;

  return (
    <MobileFrame>
      {/* Dynamic Tab Body */}
      {activeTab === 'inicio' && (
        <DashboardTab
          currentMonth={currentMonth}
          onChangeMonth={setCurrentMonth}
          activeCurrency={state.activeCurrency}
          onChangeCurrency={handleChangeCurrency}
          accounts={state.accounts}
          transactions={state.transactions}
          reminders={state.reminders}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
          onEditTransaction={(tx) => {
            setEditingTx(tx);
            setIsTxModalOpen(true);
          }}
          onOpenVoice={() => setIsVoiceModalOpen(true)}
          onOpenNewTx={() => {
            setEditingTx(null);
            setIsTxModalOpen(true);
          }}
          onNavigateToReminders={() => setActiveTab('recordatorios')}
        />
      )}

      {activeTab === 'flujo' && (
        <CashFlowTab
          currentMonth={currentMonth}
          onChangeMonth={setCurrentMonth}
          activeCurrency={state.activeCurrency}
          onChangeCurrency={handleChangeCurrency}
          accounts={state.accounts}
          transactions={state.transactions}
          rates={state.rates}
          remindersCount={pendingRemindersCount}
        />
      )}

      {activeTab === 'recordatorios' && (
        <RemindersTab
          reminders={state.reminders}
          accounts={state.accounts}
          activeCurrency={state.activeCurrency}
          onOpenNewReminder={() => {
            setEditingReminder(null);
            setIsReminderModalOpen(true);
          }}
          onEditReminder={(r) => {
            setEditingReminder(r);
            setIsReminderModalOpen(true);
          }}
          onMarkPaidAndCreateTx={handleMarkPaidAndCreateTx}
          onToggleStatus={handleToggleReminderStatus}
        />
      )}

      {activeTab === 'cuentas' && (
        <AccountsTab
          accounts={state.accounts}
          transactions={state.transactions}
          rates={state.rates}
          onSaveAccount={handleSaveAccount}
          onDeleteAccount={handleDeleteAccount}
          onOpenTransfer={() => {
            setEditingTx({ type: 'transfer' });
            setIsTxModalOpen(true);
          }}
        />
      )}

      {activeTab === 'ajustes' && (
        <SettingsTab
          state={state}
          onUpdateRates={handleUpdateRates}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          onImportBackup={handleImportBackup}
          onResetData={handleResetData}
        />
      )}

      {/* Bottom Sticky Navigation */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenVoice={() => setIsVoiceModalOpen(true)}
        onOpenNewTx={() => {
          setEditingTx(null);
          setIsTxModalOpen(true);
        }}
        pendingRemindersCount={pendingRemindersCount}
      />

      {/* Voice Input Modal */}
      <VoiceInputModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        accounts={state.accounts}
        categories={state.categories}
        onSaveParsedTransaction={(parsed) => {
          handleSaveTransaction({
            type: parsed.type,
            amt: parsed.amt,
            amt2: parsed.amt2,
            acc: parsed.acc,
            to: parsed.to,
            cat: parsed.cat,
            note: parsed.note,
            date: parsed.date,
          });
        }}
        onEditInForm={(parsed) => {
          setEditingTx({
            type: parsed.tipo || 'gasto',
            amt: parsed.monto || 0,
            acc: parsed.cuentaId || state.accounts[0]?.id,
            to: parsed.cuentaDestinoId || undefined,
            cat: parsed.categoria,
            note: parsed.nota,
            date: parsed.fecha,
          });
          setIsTxModalOpen(true);
        }}
      />

      {/* Transaction Modal (Manual Creation or Edit) */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTx(null);
        }}
        accounts={state.accounts}
        categories={state.categories}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
        onAddCategory={handleAddCategory}
        initialData={editingTx}
        activeCurrency={state.activeCurrency}
      />

      {/* Reminder Modal (Create or Edit) */}
      <ReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => {
          setIsReminderModalOpen(false);
          setEditingReminder(null);
        }}
        accounts={state.accounts}
        categories={state.categories.gasto}
        onSave={handleSaveReminder}
        onDelete={handleDeleteReminder}
        initialData={editingReminder}
        activeCurrency={state.activeCurrency}
      />
    </MobileFrame>
  );
}
