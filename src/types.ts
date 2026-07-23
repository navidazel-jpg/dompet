/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Transaction {
  id: string;
  date: string;
  type: 'main' | 'wallet-main' | 'income' | 'withdraw' | 'expense' | 'expense-bank' | 'income-wallet';
  amount: number;
  timestamp: number;
  description: string;
  qty?: string;
  kategori: string;
  email: string;
  
  // Computed values for running balances
  histBank?: number;
  histWallet?: number;
}

export interface ExpenseCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
}

export interface DialogState {
  isOpen: boolean;
  type: 'info' | 'confirm';
  message: string;
  onConfirm: (() => void) | null;
}
