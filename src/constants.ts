/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExpenseCategory } from './types';

export const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbx8ZvK2PQtSoj0bknrOIe0qCUqNr-szctenP_mGNbYqz-DwlVIEuI1Qdf-nneTnUG5cNw/exec";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'makanan', label: 'Makan & Minum', icon: '🍜', color: 'bg-orange-500', bg: 'bg-orange-50' },
  { id: 'transport', label: 'Transportasi', icon: '🚗', color: 'bg-blue-500', bg: 'bg-blue-50' },
  { id: 'motor', label: 'Motor & Servis', icon: '👨‍🔧', color: 'bg-teal-500', bg: 'bg-teal-50' },
  { id: 'belanja', label: 'Belanja', icon: '🛒', color: 'bg-purple-500', bg: 'bg-purple-50' },
  { id: 'tagihan', label: 'Tagihan', icon: '⚡', color: 'bg-yellow-500', bg: 'bg-yellow-50' },
  { id: 'istri', label: 'Transfer ke Istri', icon: '💖', color: 'bg-pink-500', bg: 'bg-pink-50' },
  { id: 'lainnya', label: 'Lainnya', icon: '📦', color: 'bg-gray-500', bg: 'bg-gray-50' }
];
