/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { 
  PlusCircle, MinusCircle, Edit, Trash2, Wallet, 
  TrendingUp, TrendingDown, FileText, Check, X, Calendar, 
  RefreshCw, AlertCircle, Building2, ArrowDownToLine, Landmark,
  LogOut, User, Mail, ChevronDown, ChevronUp, CreditCard,
  Eye, EyeOff, ChevronLeft, ChevronRight, PieChart, Wrench, Bell,
  Grid, Calculator, List, Search, SlidersHorizontal, Settings, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Transaction, DialogState } from './types';
import { GOOGLE_SHEET_URL, EXPENSE_CATEGORIES } from './constants';
import AnimatedNumber from './components/AnimatedNumber';

export default function App() {
  const [userEmail, setUserEmail] = useState<string>(() => localStorage.getItem('saved_user_email') || '');
  const [emailInput, setEmailInput] = useState<string>('');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'record' | 'history'>('dashboard');

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Wallet/Bank visibility settings
  const [showBankBalance, setShowBankBalance] = useState<boolean>(() => {
    const saved = localStorage.getItem('show_bank_balance');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showWalletBalance, setShowWalletBalance] = useState<boolean>(() => {
    const saved = localStorage.getItem('show_wallet_balance');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showAnalysis, setShowAnalysis] = useState<boolean>(() => {
    const saved = localStorage.getItem('show_analysis_chart');
    return saved !== null ? JSON.parse(saved) : true; 
  });
  
  const [animateChart, setAnimateChart] = useState<boolean>(false);

  // Pop-up category details state
  const [activeCategoryDetail, setActiveCategoryDetail] = useState<string | null>(null);

  // Pop-up category calculator state
  const [showCategoryCalculator, setShowCategoryCalculator] = useState<boolean>(false);
  const [selectedCategoriesForCalc, setSelectedCategoriesForCalc] = useState<string[]>([]);

  useEffect(() => {
    localStorage.setItem('show_bank_balance', JSON.stringify(showBankBalance));
  }, [showBankBalance]);

  useEffect(() => {
    localStorage.setItem('show_wallet_balance', JSON.stringify(showWalletBalance));
  }, [showWalletBalance]);

  useEffect(() => {
    localStorage.setItem('show_analysis_chart', JSON.stringify(showAnalysis));
  }, [showAnalysis]);
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8; // Increased slightly for desktop list efficiency

  const currentMonth = (new Date().getMonth() + 1).toString();
  const currentYear = new Date().getFullYear().toString();
  const [expenseFilterMonth, setExpenseFilterMonth] = useState<string>(currentMonth);
  const [expenseFilterYear, setExpenseFilterYear] = useState<string>(currentYear);

  const [dialog, setDialog] = useState<DialogState>({ isOpen: false, type: 'info', message: '', onConfirm: null });

  const showMessage = (message: string) => setDialog({ isOpen: true, type: 'info', message, onConfirm: null });
  const showConfirm = (message: string, onConfirm: () => void) => setDialog({ isOpen: true, type: 'confirm', message, onConfirm });
  const closeDialog = () => setDialog({ isOpen: false, type: 'info', message: '', onConfirm: null });

  useEffect(() => {
    if (userEmail) {
      fetchData();
    }
  }, [userEmail]);

  const fetchData = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(`${GOOGLE_SHEET_URL}?email=${encodeURIComponent(userEmail)}`);
      const data = await response.json();
      
      const mappedData = data.map((item: any) => {
        const safeItem: any = {};
        Object.keys(item).forEach(key => {
          safeItem[key.trim().toLowerCase()] = item[key];
        });

        let safeDate = safeItem.date;
        if (safeDate) {
          const dateObj = new Date(safeDate);
          if (!isNaN(dateObj.getTime())) {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            safeDate = `${year}-${month}-${day}`; 
          } else if (typeof safeDate === 'string' && safeDate.includes('T')) {
            safeDate = safeDate.split('T')[0];
          }
        }

        return {
          id: safeItem.id,
          date: safeDate,
          type: safeItem.type,
          amount: Number(safeItem.amount) || 0,
          timestamp: Number(safeItem.timestamp) || 0,
          description: safeItem.description || safeItem.keterangan || safeItem.deskripsi || "Tanpa Keterangan",
          qty: safeItem.qty || safeItem.jumlah || safeItem.quantity || "", 
          kategori: safeItem.kategori || 'lainnya',
          email: safeItem.email || ""
        };
      });

      const currentUserEmail = userEmail.toLowerCase().trim();
      const cleanData = mappedData.filter((tx: any) => {
        const itemEmail = tx.email.toString().toLowerCase().trim();
        return itemEmail === currentUserEmail;
      });
      
      setTransactions(cleanData);
      setCurrentPage(1); 
    } catch (error) {
      console.error("Gagal mengambil data:", error);
      showMessage("Gagal terhubung ke Google Sheets atau data Anda masih kosong.");
    } finally {
      setIsSyncing(false);
    }
  };

  const syncToSheet = async (action: string, txData: any) => {
    setIsSyncing(true);
    try {
      const payloadData = { ...txData, email: userEmail };
      await fetch(GOOGLE_SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: action, data: payloadData, email: userEmail })
      });
    } catch (error) {
      console.error("Gagal simpan:", error);
      showMessage("Gagal menyimpan ke database cloud. Periksa jaringan internet Anda.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    const trimmedEmail = emailInput.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return showMessage('Mohon masukkan format alamat email yang valid!');
    }
    localStorage.setItem('saved_user_email', trimmedEmail);
    setUserEmail(trimmedEmail);
  };

  const handleLogout = () => {
    showConfirm('Apakah Anda yakin ingin keluar dari akun ini?', () => {
      localStorage.removeItem('saved_user_email');
      setUserEmail('');
      setEmailInput('');
      setTransactions([]);
    });
  };

  const formatInputNumber = (val: string | number) => {
    if (val === undefined || val === null) return '';
    const cleaned = val.toString().replace(/\D/g, '');
    if (!cleaned) return '';
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const unformatNumber = (val: string | number) => {
    if (!val) return 0;
    return parseInt(val.toString().replace(/\./g, ''), 10) || 0;
  };

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(number || 0);
  };

  const displayDate = (dateString: string) => {
      if (!dateString) return '-';
      const parts = dateString.split('-');
      if (parts.length === 3) {
          const [year, month, day] = parts.map(Number);
          const dateObj = new Date(year, month - 1, day);
          return dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      const dateObj = new Date(dateString);
      if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      return dateString;
  };

  const getToday = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };

  const [activeForm, setActiveForm] = useState<'income' | 'withdraw' | 'expense' | 'expense-bank' | 'motor' | 'income-wallet' | null>(null); 
  const toggleForm = (formName: 'income' | 'withdraw' | 'expense' | 'expense-bank' | 'motor' | 'income-wallet') => {
    setActiveForm(prev => prev === formName ? null : formName);
  };

  const [isEditingMain, setIsEditingMain] = useState<boolean>(false);
  const [mainBalanceInput, setMainBalanceInput] = useState<string>('');
  
  const [isEditingWallet, setIsEditingWallet] = useState<boolean>(false);
  const [walletBalanceInput, setWalletBalanceInput] = useState<string>('');

  const [incomeForm, setIncomeForm] = useState({ amount: '', description: '' });
  const [incomeWalletForm, setIncomeWalletForm] = useState({ amount: '', description: '' });
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', description: 'Tarik Tunai ATM' });
  
  const [expenseForm, setExpenseForm] = useState({ amount: '', description: '', qty: '', kategori: 'makanan' });
  const [expenseBankForm, setExpenseBankForm] = useState({ amount: '', description: '', qty: '', kategori: 'makanan' });
  
  const [motorFormType, setMotorFormType] = useState<'oli' | 'servis'>('oli'); 
  const [motorForm, setMotorForm] = useState({ jenisOli: '', kmAwal: '', kmNambah: '', deskripsiServis: '', amount: '' });

  const [editingTx, setEditingTx] = useState<any | null>(null);

  // --- FUNGSI AUTO-FORMAT BENSIN/BBM ---
  const handleExpenseDescriptionChange = (e: ChangeEvent<HTMLInputElement>, formType: 'expense' | 'expense-bank') => {
    const val = e.target.value;
    const lowerVal = val.toLowerCase();
    
    if (formType === 'expense') {
      let currentAmount = expenseForm.amount;
      if (lowerVal.includes('pertalit')) currentAmount = '10.000';
      else if (lowerVal.includes('pertamax')) currentAmount = '16.650';
      setExpenseForm({ ...expenseForm, description: val, amount: currentAmount });
    } else {
      let currentAmount = expenseBankForm.amount;
      if (lowerVal.includes('pertalit')) currentAmount = '10.000';
      else if (lowerVal.includes('pertamax')) currentAmount = '16.650';
      setExpenseBankForm({ ...expenseBankForm, description: val, amount: currentAmount });
    }
  };

  // --- FUNGSI AUTO-FORMAT SATUAN (SMART QTY) ---
  const formatQtyWithUnit = (qtyVal: string, descVal: string) => {
    if (!qtyVal) return '';
    if (/[a-zA-Z]/.test(qtyVal)) return qtyVal; 

    const num = qtyVal.trim();
    const desc = descVal.toLowerCase();
    let unit = 'pcs'; 

    if (/(nasi|makan|ayam|lauk|sayur|rokok|sate|bakso|mie|padang|pecel|gorengan)/.test(desc)) {
      unit = 'bks';
    } else if (/(air|es|kopi|teh|minum|boba|jus|susu)/.test(desc)) {
      unit = 'gelas';
    } else if (/(bensin|pertalite|pertamax|shell|solar|vivo)/.test(desc)) {
      unit = 'liter';
    } else if (/(beras|gula|telur|daging|cabe|bawang|buah)/.test(desc)) {
      unit = 'kg';
    } else if (/(kue|martabak|pizza|bolu)/.test(desc)) {
      unit = 'ktk';
    } else if (/(parkir|tol|wc|toilet)/.test(desc)) {
      unit = 'kali';
    }

    return `${num} ${unit}`;
  };

  const getQtyMultiplier = (qtyStr: string) => {
    if (!qtyStr) return 1;
    const match = qtyStr.match(/[\d.,]+/);
    if (match) {
      const numStr = match[0].replace(',', '.'); 
      const num = parseFloat(numStr);
      return isNaN(num) || num <= 0 ? 1 : num;
    }
    return 1;
  };

  const { processedHistory, bankBalance, walletBalance } = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => {
      if (a.timestamp && b.timestamp) {
          if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
      }
      if (a.type === 'main' || a.type === 'wallet-main') return -1;
      if (b.type === 'main' || b.type === 'wallet-main') return 1;
      return 0;
    });

    let currentBank = 0;
    let currentWallet = 0;

    const historyWithBalances = sorted.map(tx => {
      const amt = Number(tx.amount);
      
      if (tx.type === 'main') {
        currentBank += amt;
      } else if (tx.type === 'wallet-main') {
        currentWallet += amt;
      } else if (tx.type === 'income') {
        currentBank += amt;
      } else if (tx.type === 'income-wallet') {
        currentWallet += amt;
      } else if (tx.type === 'withdraw') {
        currentBank -= amt;
        currentWallet += amt;
      } else if (tx.type === 'expense') {
        currentWallet -= amt;
      } else if (tx.type === 'expense-bank') {
        currentBank -= amt;
      }

      return { ...tx, histBank: currentBank, histWallet: currentWallet };
    });

    historyWithBalances.reverse();

    return {
      processedHistory: historyWithBalances,
      bankBalance: currentBank,
      walletBalance: currentWallet
    };
  }, [transactions]);

  // --- STATE KALKULATOR SISA KM ---
  const [isCalculatingKm, setIsCalculatingKm] = useState<boolean>(false);
  const [motorKmInput, setMotorKmInput] = useState<string>('');
  const [sisaKmOli, setSisaKmOli] = useState<string | null>(() => localStorage.getItem('sisa_km_oli') || null);

  const latestOilChange = useMemo(() => {
    const tx = processedHistory.find(t => t.kategori === 'motor' && t.description.includes('Ganti Oli') && t.description.includes('->'));
    if (!tx) return null;

    const matchKM = tx.description.match(/KM ([\d.]+) -> ([\d.]+)/);
    const matchOli = tx.description.match(/Ganti Oli: (.*?) \(/);
    
    if (matchKM && matchOli) {
      return {
        date: tx.date,
        oli: matchOli[1].trim(),
        kmAwal: matchKM[1],
        kmNext: matchKM[2]
      };
    }
    return null;
  }, [processedHistory]);

  const hitungSisaKm = () => {
    if (!motorKmInput || !latestOilChange) return;
    const targetKm = unformatNumber(latestOilChange.kmNext);
    const currentKm = unformatNumber(motorKmInput);
    const sisa = targetKm - currentKm;
    
    setSisaKmOli(sisa.toString());
    localStorage.setItem('sisa_km_oli', sisa.toString());
    setIsCalculatingKm(false);
  };

  const hapusSisaKm = () => {
    setSisaKmOli(null);
    localStorage.removeItem('sisa_km_oli');
    setMotorKmInput('');
    setIsCalculatingKm(false);
  };

  // --- MENGHITUNG TOTAL DAN RINCIAN PER KATEGORI ---
  const { displayedExpense, availableYears, categoryTotals, categoryBreakdownData } = useMemo(() => {
    const years = new Set<string>([new Date().getFullYear().toString()]); 
    let filteredSum = 0;
    
    const catTotals: Record<string, number> = {};
    const catTransactions: Record<string, Transaction[]> = {};
    
    EXPENSE_CATEGORIES.forEach(c => {
      catTotals[c.id] = 0;
      catTransactions[c.id] = [];
    });
    
    processedHistory.forEach(tx => {
      if (tx.date) {
        const dateObj = new Date(tx.date);
        if (!isNaN(dateObj.getTime())) {
          years.add(dateObj.getFullYear().toString());
        }
      }
      
      if (tx.type === 'expense' || tx.type === 'expense-bank') {
        let matchesMonth = true;
        let matchesYear = true;
        
        if (tx.date) {
           const dateObj = new Date(tx.date);
           if (!isNaN(dateObj.getTime())) {
             if (expenseFilterMonth !== 'all') {
                matchesMonth = (dateObj.getMonth() + 1).toString() === expenseFilterMonth;
             }
             if (expenseFilterYear !== 'all') {
                matchesYear = dateObj.getFullYear().toString() === expenseFilterYear;
             }
           }
        }
        
        if (matchesMonth && matchesYear) {
           filteredSum += Number(tx.amount);
           const cat = tx.kategori && catTotals[tx.kategori] !== undefined ? tx.kategori : 'lainnya';
           catTotals[cat] += Number(tx.amount);
           catTransactions[cat].push(tx); 
        }
      }
    });

    const catArray = EXPENSE_CATEGORIES.map(c => ({
      ...c,
      amount: catTotals[c.id] || 0,
      percentage: filteredSum > 0 ? Number((((catTotals[c.id] || 0) / filteredSum) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.amount - a.amount);

    return {
      displayedExpense: filteredSum,
      availableYears: Array.from(years).sort((a, b) => Number(b) - Number(a)),
      categoryTotals: catArray,
      categoryBreakdownData: catTransactions
    };
  }, [processedHistory, expenseFilterMonth, expenseFilterYear]);

  // Combined Searching & Filtering of History for History page
  const filteredHistory = useMemo(() => {
    return processedHistory.filter(tx => {
      // 1. Filter by keyword search
      const descMatch = tx.description.toLowerCase().includes(searchTerm.toLowerCase());
      const catMatch = tx.kategori.toLowerCase().includes(searchTerm.toLowerCase());
      const amountMatch = tx.amount.toString().includes(searchTerm);
      const matchesSearch = searchTerm ? (descMatch || catMatch || amountMatch) : true;

      // 2. Filter by Transaction category/type select
      let matchesType = true;
      if (typeFilter !== 'all') {
        if (typeFilter === 'income') {
          matchesType = tx.type === 'income' || tx.type === 'income-wallet' || tx.type === 'main' || tx.type === 'wallet-main';
        } else if (typeFilter === 'withdraw') {
          matchesType = tx.type === 'withdraw';
        } else if (typeFilter === 'expense-dompet') {
          matchesType = tx.type === 'expense';
        } else if (typeFilter === 'expense-atm') {
          matchesType = tx.type === 'expense-bank';
        } else {
          matchesType = tx.kategori === typeFilter;
        }
      }

      // 3. Filter by Date constraints (Month/Year)
      let matchesMonth = true;
      let matchesYear = true;
      if (tx.date) {
        const dateObj = new Date(tx.date);
        if (!isNaN(dateObj.getTime())) {
          if (expenseFilterMonth !== 'all') {
            matchesMonth = (dateObj.getMonth() + 1).toString() === expenseFilterMonth;
          }
          if (expenseFilterYear !== 'all') {
            matchesYear = dateObj.getFullYear().toString() === expenseFilterYear;
          }
        }
      }

      return matchesSearch && matchesType && matchesMonth && matchesYear;
    });
  }, [processedHistory, searchTerm, typeFilter, expenseFilterMonth, expenseFilterYear]);

  useEffect(() => {
    if (showAnalysis && categoryTotals.length > 0) {
      setAnimateChart(false);
      const timer = setTimeout(() => setAnimateChart(true), 100);
      return () => clearTimeout(timer);
    } else {
      setAnimateChart(false);
    }
  }, [showAnalysis, categoryTotals]);

  // Pagination bounds based on the active filtered history
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTransactions = filteredHistory.slice(startIndex, startIndex + itemsPerPage);

  const handleSaveMainBalance = () => {
    const newAmount = unformatNumber(mainBalanceInput);
    const existingMain = transactions.find(tx => tx.type === 'main');
    const existingMainAmount = existingMain ? Number(existingMain.amount) : 0;
    
    // Hitung saldo awal baru agar saldo akhir (bankBalance) persis sesuai dengan input baru
    const adjustedAmount = newAmount - (bankBalance - existingMainAmount);

    const txData: Transaction = {
      id: existingMain ? existingMain.id : 'main-balance',
      date: existingMain ? existingMain.date : getToday(),
      type: 'main',
      amount: adjustedAmount,
      description: 'Saldo Awal (Rekening)',
      timestamp: existingMain ? existingMain.timestamp : Date.now(),
      email: userEmail,
      kategori: 'main'
    };
    if (existingMain) {
      setTransactions(prev => prev.map(tx => tx.type === 'main' ? txData : tx));
      syncToSheet('edit', txData);
    } else {
      setTransactions(prev => [txData, ...prev]);
      syncToSheet('add', txData);
    }
    setIsEditingMain(false);
  };

  const openEditMain = () => {
    setMainBalanceInput(formatInputNumber(bankBalance));
    setIsEditingMain(true);
  };

  const handleSaveWalletBalance = () => {
    const newAmount = unformatNumber(walletBalanceInput);
    const existingWalletMain = transactions.find(tx => tx.type === 'wallet-main');
    const existingWalletMainAmount = existingWalletMain ? Number(existingWalletMain.amount) : 0;
    
    // Hitung saldo awal baru agar saldo akhir (walletBalance) persis sesuai dengan input baru
    const adjustedAmount = newAmount - (walletBalance - existingWalletMainAmount);

    const txData: Transaction = {
      id: existingWalletMain ? existingWalletMain.id : 'wallet-main-balance',
      date: existingWalletMain ? existingWalletMain.date : getToday(),
      type: 'wallet-main',
      amount: adjustedAmount,
      description: 'Saldo Awal (Dompet)',
      timestamp: existingWalletMain ? existingWalletMain.timestamp : Date.now(),
      email: userEmail,
      kategori: 'wallet-main'
    };
    if (existingWalletMain) {
      setTransactions(prev => prev.map(tx => tx.type === 'wallet-main' ? txData : tx));
      syncToSheet('edit', txData);
    } else {
      setTransactions(prev => [txData, ...prev]);
      syncToSheet('add', txData);
    }
    setIsEditingWallet(false);
  };

  const openEditWallet = () => {
    setWalletBalanceInput(formatInputNumber(walletBalance));
    setIsEditingWallet(true);
  };

  const handleAddIncome = (e: FormEvent) => {
    e.preventDefault();
    const amount = unformatNumber(incomeForm.amount);
    if (amount <= 0 || !incomeForm.description) return showMessage('Isi keterangan dan nominal dengan benar!');
    const newTx: Transaction = { 
      id: "tx_" + Date.now().toString(), 
      date: getToday(), 
      type: 'income', 
      amount, 
      description: incomeForm.description, 
      timestamp: Date.now(), 
      email: userEmail,
      kategori: 'penerimaan'
    };
    setTransactions(prev => [...prev, newTx]);
    syncToSheet('add', newTx);
    setIncomeForm({ amount: '', description: '' });
    setActiveTab('dashboard');
    setCurrentPage(1);
  };

  const handleAddIncomeWallet = (e: FormEvent) => {
    e.preventDefault();
    const amount = unformatNumber(incomeWalletForm.amount);
    if (amount <= 0 || !incomeWalletForm.description) return showMessage('Isi keterangan dan nominal dengan benar!');
    const newTx: Transaction = { 
      id: "tx_" + Date.now().toString(), 
      date: getToday(), 
      type: 'income-wallet', 
      amount, 
      description: incomeWalletForm.description, 
      timestamp: Date.now(), 
      email: userEmail,
      kategori: 'penerimaan'
    };
    setTransactions(prev => [...prev, newTx]);
    syncToSheet('add', newTx);
    setIncomeWalletForm({ amount: '', description: '' });
    setActiveTab('dashboard');
    setCurrentPage(1);
  };

  const handleAddWithdraw = (e: FormEvent) => {
    e.preventDefault();
    const amount = unformatNumber(withdrawForm.amount);
    if (amount <= 0 || !withdrawForm.description) return showMessage('Isi keterangan dan nominal dengan benar!');
    if (amount > bankBalance) {
      return showConfirm(`Saldo Rekening tidak cukup (Sisa: ${formatRupiah(bankBalance)}). Tetap lanjutkan?`, () => {
        processWithdraw(amount);
      });
    }
    processWithdraw(amount);
  };

  const processWithdraw = (amount: number) => {
    const newTx: Transaction = { 
      id: "tx_" + Date.now().toString(), 
      date: getToday(), 
      type: 'withdraw', 
      amount, 
      description: withdrawForm.description, 
      timestamp: Date.now(), 
      email: userEmail,
      kategori: 'tariktunai'
    };
    setTransactions(prev => [...prev, newTx]);
    syncToSheet('add', newTx);
    setWithdrawForm({ amount: '', description: 'Tarik Tunai ATM' });
    setActiveTab('dashboard');
    setCurrentPage(1);
  };

  const handleAddExpense = (e: FormEvent) => {
    e.preventDefault();
    const baseAmount = unformatNumber(expenseForm.amount);
    if (baseAmount <= 0 || !expenseForm.description) return showMessage('Isi keterangan dan nominal dengan benar!');
    
    const qtyMultiplier = getQtyMultiplier(expenseForm.qty);
    const totalAmount = baseAmount * qtyMultiplier;
    const finalQty = formatQtyWithUnit(expenseForm.qty, expenseForm.description);

    if (totalAmount > walletBalance) {
      return showConfirm(`Uang Dompet tidak cukup (Sisa: ${formatRupiah(walletBalance)}). Total pengeluaran adalah ${formatRupiah(totalAmount)}. Tetap catat?`, () => {
        processExpense(totalAmount, finalQty);
      });
    }
    processExpense(totalAmount, finalQty);
  };

  const processExpense = (totalAmount: number, qtyValue: string) => {
    const newTx: Transaction = { 
      id: "tx_" + Date.now().toString(), 
      date: getToday(), 
      type: 'expense', 
      amount: totalAmount, 
      description: expenseForm.description, 
      qty: qtyValue, 
      kategori: expenseForm.kategori,
      timestamp: Date.now(), 
      email: userEmail 
    };
    setTransactions(prev => [...prev, newTx]);
    syncToSheet('add', newTx);
    setExpenseForm({ amount: '', description: '', qty: '', kategori: 'makanan' });
    setActiveTab('dashboard');
    setCurrentPage(1);
  };

  const handleAddExpenseBank = (e: FormEvent) => {
    e.preventDefault();
    const baseAmount = unformatNumber(expenseBankForm.amount);
    if (baseAmount <= 0 || !expenseBankForm.description) return showMessage('Isi keterangan dan nominal dengan benar!');
    
    const qtyMultiplier = getQtyMultiplier(expenseBankForm.qty);
    const totalAmount = baseAmount * qtyMultiplier;
    const finalQty = formatQtyWithUnit(expenseBankForm.qty, expenseBankForm.description);

    if (totalAmount > bankBalance) {
      return showConfirm(`Saldo Rekening tidak cukup (Sisa: ${formatRupiah(bankBalance)}). Total pengeluaran adalah ${formatRupiah(totalAmount)}. Tetap catat?`, () => {
        processExpenseBank(totalAmount, finalQty);
      });
    }
    processExpenseBank(totalAmount, finalQty);
  };

  const processExpenseBank = (totalAmount: number, qtyValue: string) => {
    const newTx: Transaction = { 
      id: "tx_" + Date.now().toString(), 
      date: getToday(), 
      type: 'expense-bank', 
      amount: totalAmount, 
      description: expenseBankForm.description, 
      qty: qtyValue,
      kategori: expenseBankForm.kategori,
      timestamp: Date.now(), 
      email: userEmail 
    };
    setTransactions(prev => [...prev, newTx]);
    syncToSheet('add', newTx);
    setExpenseBankForm({ amount: '', description: '', qty: '', kategori: 'makanan' });
    setActiveTab('dashboard');
    setCurrentPage(1);
  };

  const handleAddMotorExpense = (e: FormEvent) => {
    e.preventDefault();
    const amount = unformatNumber(motorForm.amount);
    if (amount <= 0) return showMessage('Masukkan nominal harga dengan benar!');

    let finalDescription = '';

    if (motorFormType === 'oli') {
      if (!motorForm.jenisOli || !motorForm.kmAwal || !motorForm.kmNambah) {
        return showMessage('Mohon lengkapi jenis oli dan info kilometernya!');
      }
      const kmAwalNum = unformatNumber(motorForm.kmAwal);
      const kmNambahNum = unformatNumber(motorForm.kmNambah);
      const kmNextNum = kmAwalNum + kmNambahNum;
      
      finalDescription = `Ganti Oli: ${motorForm.jenisOli} (KM ${formatInputNumber(kmAwalNum)} -> ${formatInputNumber(kmNextNum)})`;
      
      hapusSisaKm();
    } else {
      if (!motorForm.deskripsiServis) {
        return showMessage('Mohon isi keterangan servis/sparepart!');
      }
      finalDescription = `Servis/Sparepart: ${motorForm.deskripsiServis}`;
    }

    if (amount > walletBalance) {
      return showConfirm(`Uang Dompet tidak cukup (Sisa: ${formatRupiah(walletBalance)}). Tetap catat sebagai pengeluaran dompet?`, () => {
        processMotorExpense(amount, finalDescription);
      });
    }
    processMotorExpense(amount, finalDescription);
  };

  const processMotorExpense = (amount: number, desc: string) => {
    const newTx: Transaction = { 
      id: "tx_" + Date.now().toString(), 
      date: getToday(), 
      type: 'expense', 
      amount, 
      description: desc, 
      kategori: 'motor', 
      timestamp: Date.now(), 
      email: userEmail 
    };
    setTransactions(prev => [...prev, newTx]);
    syncToSheet('add', newTx);
    setMotorForm({ jenisOli: '', kmAwal: '', kmNambah: '', deskripsiServis: '', amount: '' });
    setActiveTab('dashboard');
    setCurrentPage(1);
  };

  const handleDelete = (id: string) => {
    showConfirm('Hapus transaksi ini secara permanen?', () => {
      setTransactions(prev => prev.filter(tx => tx.id !== id));
      syncToSheet('delete', { id: id });
    });
  };

  const saveEditedHistory = (e: FormEvent) => {
    e.preventDefault();
    const updatedAmount = unformatNumber(editingTx.amountStr); 
    const finalQty = formatQtyWithUnit(editingTx.qtyStr !== undefined ? editingTx.qtyStr : editingTx.qty, editingTx.description);

    const updatedTx = { 
      ...editingTx, 
      amount: updatedAmount, 
      email: userEmail,
      qty: finalQty,
      keterangan: editingTx.description,
      deskripsi: editingTx.description
    };
    delete updatedTx.amountStr; 
    delete updatedTx.qtyStr;
    
    setTransactions(prev => prev.map(tx => tx.id === updatedTx.id ? updatedTx : tx));
    syncToSheet('edit', updatedTx);
    setEditingTx(null);
  };

  const getCategoryDetails = (catId: string) => {
    return EXPENSE_CATEGORIES.find(c => c.id === catId) || EXPENSE_CATEGORIES.find(c => c.id === 'lainnya') || {
      id: 'lainnya', label: 'Lainnya', icon: '📦', color: 'bg-gray-500', bg: 'bg-gray-50'
    };
  };

  // Safe reset all keyword and drop filter parameters
  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setExpenseFilterMonth('all');
    setExpenseFilterYear('all');
    setCurrentPage(1);
  };

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans text-slate-900">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 border border-slate-200 relative overflow-hidden">
          {/* Subtle design accents in background */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-50 rounded-full pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-slate-100 rounded-full pointer-events-none"></div>
          
          <div className="flex flex-col items-center text-center mb-8 relative z-10">
            <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-500/20 mb-4 select-none">
              <Landmark size={28} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">Dompet Digital</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-[280px]">Catatan Keuangan Digital Responsif, Teratur & Real-Time</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-500 uppercase mb-2 flex items-center gap-1.5 select-none">
                <Mail size={14} className="text-indigo-500" /> Alamat Email
              </label>
              <div className="relative">
                <input 
                  type="email" 
                  value={emailInput || ''} 
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@example.com" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none font-medium transition-all text-sm text-slate-900"
                  required 
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                <Info size={12} className="inline mr-1 text-slate-500 align-text-bottom" />
                Catatan Anda disinkronkan langsung ke Google Sheets. Masukkan email untuk memuat data Anda.
              </p>
            </div>

            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-md shadow-indigo-505/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm cursor-pointer border border-indigo-700">
              Masuk ke Aplikasi
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900 relative">
      
      {/* SIDEBAR NAVIGATION (Visible on desktop and tablet, hidden on mobile) */}
      <aside className="w-64 bg-slate-900 flex-shrink-0 hidden md:flex flex-col text-slate-300 border-r border-slate-800">
        {/* Brand Header */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-black tracking-tight select-none">
            M
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Dompet Digital</span>
        </div>

        {/* User Account Info Info Profile Section */}
        <div className="p-4 mx-4 mt-4 bg-slate-850/50 bg-slate-800 border border-slate-800 rounded-xl">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 leading-none">PENGGUNA AKTIF</p>
          <p className="text-xs font-semibold text-white truncate" title={userEmail}>
            {userEmail}
          </p>
        </div>

        {/* Sidebar Nav buttons */}
        <nav className="flex-1 px-4 space-y-1.5 mt-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all text-left ${
              activeTab === 'dashboard' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <PieChart size={18} className={activeTab === 'dashboard' ? 'text-white' : 'text-slate-400'} />
            Dasbor Utama
          </button>
          
          <button
            onClick={() => {
              if (activeTab !== 'record') {
                setActiveTab('record');
                setActiveForm('expense');
              }
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all text-left ${
              activeTab === 'record' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Grid size={18} className={activeTab === 'record' ? 'text-white' : 'text-slate-400'} />
            Pencatatan Baru
          </button>
          
          <button
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all text-left ${
              activeTab === 'history' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileText size={18} className={activeTab === 'history' ? 'text-white' : 'text-slate-400'} />
            Riwayat Transaksi
          </button>
        </nav>

        {/* Sidebar Bottom section */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors rounded-xl text-xs font-bold text-left cursor-pointer"
          >
            <LogOut size={16} />
            Keluar Sesi
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER (Visible on mobile, hidden on desktop) */}
      <header className="md:hidden bg-slate-900 text-white px-4 py-4 sticky top-0 z-40 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-black select-none">
            M
          </div>
          <span className="font-bold text-lg tracking-tight">Dompet Digital</span>
        </div>
        
        <div className="flex items-center gap-2">
          {isSyncing ? (
            <span className="flex items-center gap-1 bg-indigo-505/15 bg-indigo-600 px-2.5 py-1 rounded-full text-[10px] font-bold text-white animate-pulse">
              <RefreshCw size={10} className="animate-spin" /> Sync
            </span>
          ) : (
            <button 
              onClick={fetchData} 
              className="p-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
              title="Refresh Manual"
            >
              <RefreshCw size={12} />
            </button>
          )}
          <button 
            onClick={handleLogout} 
            className="p-1.5 bg-rose-500/15 border border-rose-500/20 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
            title="Keluar"
          >
            <LogOut size={12} />
          </button>
        </div>
      </header>

      {/* MOBILE USER BRAND BANNER */}
      <div className="md:hidden bg-indigo-600 text-white text-center py-1.5 px-4 flex items-center justify-center gap-1.5 text-[10px] font-black tracking-wide">
        <User size={11} className="text-indigo-200" />
        <span className="opacity-80">AKUN:</span>
        <span className="border-b border-indigo-400 pb-0.5 truncate max-w-[220px]">{userEmail}</span>
      </div>

      {/* MAIN WORKSPACE WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* DESKTOP STICKY UPPER HEADER (Hidden on mobile) */}
        <header className="hidden md:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold select-none">
            <span>Halaman</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-bold uppercase tracking-wider">
              {activeTab === 'dashboard' && 'Dashboard Overview'}
              {activeTab === 'record' && 'Catat Transaksi'}
              {activeTab === 'history' && 'Riwayat & Arsip'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 font-medium font-mono select-none">
              Auto-Sync Actived
            </span>
            
            {isSyncing ? (
              <span className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full text-xs font-bold text-indigo-600 animate-pulse">
                <RefreshCw size={12} className="animate-spin" /> Menyingkronkan...
              </span>
            ) : (
              <button 
                onClick={fetchData} 
                className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-700 transition-colors cursor-pointer active:scale-98"
                title="Refresh Manual"
              >
                <RefreshCw size={12} /> Sinkron Google Sheet
              </button>
            )}
          </div>
        </header>

        {/* CONTAINER CONTENT */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 md:py-8 mb-24 md:mb-12">
          <AnimatePresence mode="wait">
          
          {/* TAB 1: DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* WALLET & BANK BALANCE STATS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* REKENING/BANK CARD */}
                <div className="bg-linear-to-br from-blue-700 via-blue-800 to-indigo-900 text-white rounded-3xl p-6 shadow-xl border border-blue-500/10 flex flex-col justify-between relative overflow-hidden min-h-[140px] group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                    <Landmark size={120} />
                  </div>
                  
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md text-blue-200">
                        <Building2 size={18} />
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest text-blue-200">Rekening ATM</p>
                      <button 
                        onClick={() => setShowBankBalance(!showBankBalance)} 
                        className="p-1 text-blue-300 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                        title={showBankBalance ? "Sembunyikan Saldo" : "Tampilkan Saldo"}
                      >
                        {showBankBalance ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                    </div>
                    {!isEditingMain && (
                      <button 
                        onClick={openEditMain} 
                        className="p-1 px-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1 backdrop-blur-md"
                        title="Set Saldo Awal"
                      >
                        <Edit size={12} /> Set Awal
                      </button>
                    )}
                  </div>
                  
                  <div className="relative z-10 mt-3">
                    {isEditingMain ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                        <input 
                          type="text" 
                          value={mainBalanceInput} 
                          onChange={(e) => setMainBalanceInput(formatInputNumber(e.target.value))} 
                          className="w-full px-3 py-1.5 bg-white text-slate-900 rounded-xl outline-none font-extrabold text-base focus:ring-2 focus:ring-blue-400" 
                          autoFocus 
                          placeholder="Saldo Atm..." 
                        />
                        <button onClick={handleSaveMainBalance} className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl cursor-pointer" title="Simpan"><Check size={16}/></button>
                        <button onClick={() => setIsEditingMain(false)} className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl cursor-pointer" title="Batal"><X size={16}/></button>
                      </div>
                    ) : (
                      <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                        {showBankBalance ? <AnimatedNumber value={bankBalance} /> : 'Rp •••••••'}
                      </h3>
                    )}
                  </div>
                </div>

                {/* CASH WALLET CARD */}
                <div className="bg-linear-to-br from-emerald-600 via-emerald-700 to-teal-850 text-white rounded-3xl p-6 shadow-xl border border-emerald-500/10 flex flex-col justify-between relative overflow-hidden min-h-[140px] group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                    <Wallet size={120} />
                  </div>
                  
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md text-emerald-250">
                        <Wallet size={18} />
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest text-emerald-250">Tunai Dompet</p>
                      <button 
                        onClick={() => setShowWalletBalance(!showWalletBalance)} 
                        className="p-1 text-emerald-300 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                        title={showWalletBalance ? "Sembunyikan Saldo" : "Tampilkan Saldo"}
                      >
                        {showWalletBalance ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                    </div>
                    {!isEditingWallet && (
                      <button 
                        onClick={openEditWallet} 
                        className="p-1 px-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1 backdrop-blur-md"
                        title="Set Saldo Awal"
                      >
                        <Edit size={12} /> Set Awal
                      </button>
                    )}
                  </div>
                  
                  <div className="relative z-10 mt-3">
                    {isEditingWallet ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                        <input 
                          type="text" 
                          value={walletBalanceInput} 
                          onChange={(e) => setWalletBalanceInput(formatInputNumber(e.target.value))} 
                          className="w-full px-3 py-1.5 bg-white text-slate-900 rounded-xl outline-none font-extrabold text-base focus:ring-2 focus:ring-emerald-400" 
                          autoFocus 
                          placeholder="Saldo Kartu..." 
                        />
                        <button onClick={handleSaveWalletBalance} className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl cursor-pointer" title="Simpan"><Check size={16}/></button>
                        <button onClick={() => setIsEditingWallet(false)} className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl cursor-pointer" title="Batal"><X size={16}/></button>
                      </div>
                    ) : (
                      <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                        {showWalletBalance ? <AnimatedNumber value={walletBalance} /> : 'Rp •••••••'}
                      </h3>
                    )}
                  </div>
                </div>

                {/* EXPENSES STATS CARD WITH DATE FILTER */}
                <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 text-rose-600">
                      <div className="p-2 bg-rose-50 rounded-xl text-rose-500">
                        <TrendingDown size={18} />
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">Terpakai (Bulan Ini)</p>
                    </div>
                  </div>
                  
                  <div className="my-2">
                    <h3 className="text-3xl font-black text-rose-600">
                      {formatRupiah(displayedExpense)}
                    </h3>
                  </div>

                  <div className="flex gap-2 border-t border-slate-100 pt-3 mt-1">
                    <select 
                      value={expenseFilterMonth} 
                      onChange={(e) => setExpenseFilterMonth(e.target.value)}
                      className="bg-slate-100 text-slate-700 text-xs rounded-xl p-2 outline-none border border-slate-200 w-full font-bold cursor-pointer hover:bg-slate-200/65 transition-colors"
                    >
                      <option value="all">Semua Bulan</option>
                      <option value="1">Januari</option>
                      <option value="2">Februari</option>
                      <option value="3">Maret</option>
                      <option value="4">April</option>
                      <option value="5">Mei</option>
                      <option value="6">Juni</option>
                      <option value="7">Juli</option>
                      <option value="8">Agustus</option>
                      <option value="9">September</option>
                      <option value="10">Oktober</option>
                      <option value="11">November</option>
                      <option value="12">Desember</option>
                    </select>
                    <select 
                      value={expenseFilterYear} 
                      onChange={(e) => setExpenseFilterYear(e.target.value)}
                      className="bg-slate-100 text-slate-700 text-xs rounded-xl p-2 outline-none border border-slate-200 w-full font-bold cursor-pointer hover:bg-slate-200/65 transition-colors"
                    >
                      <option value="all">Semua Tahun</option>
                      {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* TWO COLUMN ROW FOR CATEGORY PROGRESS & INFO */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                
                {/* ANALYSIS BLOCK (Left 3 columns) */}
                <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200 lg:col-span-3 space-y-4">
                  <div className="flex justify-between items-center cursor-pointer border-b border-slate-100 pb-3" onClick={() => setShowAnalysis(!showAnalysis)}>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <PieChart size={18} className="text-blue-500" /> Analisis Kategori
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCategoryCalculator(true);
                          setSelectedCategoriesForCalc([]);
                        }}
                        className="text-slate-400 hover:text-indigo-600 transition-colors p-1 bg-slate-150 hover:bg-indigo-50 rounded-lg"
                        title="Hitung Total Kategori"
                      >
                        <Calculator size={16} />
                      </button>
                      <div className="text-slate-400 hover:text-slate-600 transition-colors p-1 bg-slate-150 rounded-lg">
                        {showAnalysis ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {showAnalysis && (
                    <div className="space-y-4 pt-1 animate-in fade-in slide-in-from-top-1">
                      {categoryTotals.length === 0 ? (
                        <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <p className="text-sm text-slate-400 font-bold">Belum ada catatan pengeluaran di filter tanggal terpilih.</p>
                        </div>
                      ) : (
                        categoryTotals.map(cat => (
                          <div key={cat.id} className="group">
                            <div className="flex justify-between items-end mb-1.5">
                              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                <span className="text-lg bg-slate-100 p-1 px-1.5 rounded-lg">{cat.icon}</span> 
                                <span className="hover:text-blue-600 transition-colors">{cat.label}</span>
                                <span className="text-[10px] text-slate-400">({cat.percentage}%)</span>
                              </span>
                              
                              <button 
                                onClick={() => setActiveCategoryDetail(cat.id)}
                                className="text-right hover:bg-slate-100 p-1 px-2.5 rounded-xl transition-all border border-transparent hover:border-slate-200/50 flex items-center gap-1 group/btn"
                                title="Lihat Rincian Items"
                              >
                                <span className="text-xs font-black text-slate-800 group-hover/btn:text-blue-600 transition-colors">
                                  <AnimatedNumber value={cat.amount} />
                                </span>
                                <Info size={12} className="text-slate-400 group-hover/btn:text-blue-500" />
                              </button>
                            </div>
                            
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                              <div 
                                className={`h-full ${cat.color} rounded-full transition-all duration-1000 ease-out`} 
                                style={{ width: animateChart ? `${cat.percentage}%` : '0%' }}
                              ></div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* OIL CHANGE COUNTDOWN WARNING & STATS CARD (Right 2 columns) */}
                <div className="lg:col-span-2 space-y-4">
                  {latestOilChange ? (
                    <div className="bg-gradient-to-tr from-teal-50 to-teal-100/70 border border-teal-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2.5 bg-teal-500 text-white rounded-2xl flex items-center justify-center">
                              <Wrench size={18} className="animate-wiggle" />
                            </div>
                            <h4 className="font-extrabold text-sm text-teal-900 uppercase tracking-widest">Pengingat Oli Motor</h4>
                          </div>
                          
                          {!isCalculatingKm && sisaKmOli === null && (
                            <button 
                              onClick={() => setIsCalculatingKm(true)} 
                              className="p-1 px-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="Tulis Odometer Terkini"
                            >
                              <Edit size={12} /> Cek
                            </button>
                          )}
                        </div>

                        <div className="space-y-2 mb-3">
                          <p className="text-teal-800 text-xs leading-normal">
                            Jadwal ganti oli merek <strong className="text-teal-950 font-black">{latestOilChange.oli}</strong> berikutnya direkomendasikan pada odometer angka <strong className="bg-teal-200 text-teal-950 px-1.5 py-0.5 rounded-lg border border-teal-300 font-bold">KM {latestOilChange.kmNext}</strong>.
                          </p>
                        </div>

                        {/* HIGHLY INTERACTIVE ODOCALCULATOR DRAWER */}
                        {isCalculatingKm ? (
                          <div className="mt-4 bg-white/70 p-4 border border-teal-200/50 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
                            <p className="text-[11px] font-bold text-teal-800">Masukkan Odometer KM saat ini:</p>
                            <div className="flex flex-col gap-2.5">
                              <input 
                                type="text" 
                                inputMode="numeric"
                                value={motorKmInput}
                                onChange={(e) => setMotorKmInput(formatInputNumber(e.target.value))}
                                placeholder="Masukkan angka odometer..." 
                                className="w-full px-3 py-2 text-sm bg-white rounded-xl border border-teal-200 focus:ring-2 focus:ring-teal-400 outline-none font-bold"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button 
                                  onClick={hitungSisaKm} 
                                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                  title="Hitung Sisa KM"
                                >
                                  <Calculator size={14} className="flex-shrink-0" />
                                  Hitung Sisa Jarak
                                </button>
                                <button 
                                  onClick={() => setIsCalculatingKm(false)} 
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : sisaKmOli !== null ? (
                          <div className="mt-3 bg-white/90 p-4 rounded-2xl border border-teal-200/60 flex flex-col gap-2 shadow-xs relative overflow-hidden">
                             
                             <div className="flex justify-between items-center relative z-10">
                               <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Sisa Jarak Tempuh:</span>
                               <button onClick={hapusSisaKm} className="p-1 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer" title="Reset Hitungan">
                                 <Trash2 size={13} />
                               </button>
                             </div>

                             <div className="relative z-10 py-1">
                               {Number(sisaKmOli) < 0 ? (
                                 <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-center">
                                   <p className="text-xs text-rose-600 font-extrabold flex items-center justify-center gap-1 animate-pulse">
                                     <AlertCircle size={14} /> Segera ganti Oli Anda!
                                   </p>
                                   <p className="text-lg font-black text-rose-700 mt-1">
                                     Terlewat {formatInputNumber(Math.abs(Number(sisaKmOli)))} KM
                                   </p>
                                 </div>
                               ) : (
                                 <div className="text-center bg-teal-50 border border-teal-200/50 rounded-xl p-2">
                                   <p className="text-2xl font-black text-teal-700">
                                     {formatInputNumber(sisaKmOli)} KM
                                   </p>
                                   <p className="text-[10px] text-teal-600 font-bold uppercase mt-0.5 tracking-wider">Lagi sebelum servis berikut</p>
                                 </div>
                               )}
                             </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setIsCalculatingKm(true)}
                            className="mt-3 w-full border border-teal-300 py-3 rounded-2xl text-xs font-bold text-teal-700 bg-white/50 hover:bg-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Calculator size={14} /> Hitung Sisa Jarak Oli Sekarang
                          </button>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-teal-200/50 flex justify-between items-center">
                        <span className="text-[10px] text-teal-600/80 font-bold">Terakhir Ganti: KM {latestOilChange.kmAwal}</span>
                        <span className="text-[10px] text-teal-600/80 font-medium">({displayDate(latestOilChange.date)})</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 text-center space-y-2">
                      <div className="w-12 h-12 bg-slate-200/50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                        <Wrench size={18} />
                      </div>
                      <h4 className="font-bold text-slate-700 text-sm">Belum Ada Riwayat Oli</h4>
                      <p className="text-xs text-slate-400 leading-normal mb-2">Pencatatan sisa KM oli akan otomatis tampil saat Anda menyimpan transaksi dalam kategori Motor bersubjek Ganti Oli.</p>
                      <button 
                        onClick={() => { setActiveTab('record'); toggleForm('motor'); setMotorFormType('oli'); }}
                        className="text-xs font-bold bg-white hover:bg-slate-100 py-2 px-3 border border-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <PlusCircle size={12} /> Catat Oli Pertama
                      </button>
                    </div>
                  )}

                  {/* QUICK TIPS INFO CARD REMOVED */}
                </div>
              </div>

              {/* QUICK CALL-TO-ACTION FOR INPUT */}
              <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500 text-white rounded-2xl">
                    <Grid size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm md:text-base">Mulai Catat Transaksi Baru Anda</h4>
                    <p className="text-xs text-slate-500">Pilih dari 5 jalur pencatatan yang responsif dan teratur.</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (activeTab !== 'record') {
                      setActiveTab('record');
                      setActiveForm('expense');
                    }
                  }}
                  className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl shadow-md cursor-pointer transition-all active:scale-95 text-sm"
                >
                  Buka Form Input Keuangan →
                </button>
              </div>

            </motion.div>
          )}

          {/* TAB 2: DETAILED RECORD/TRANSACTIONS FORM */}
          {activeTab === 'record' && (
            <motion.div 
              key="record"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              
              {/* SIDE CHOOSER RAIL (3 columns on desktop, horizontal on mobile) */}
              <div className="lg:col-span-4 space-y-3">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Pilih Transaksi</h3>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
                    <button 
                      onClick={() => setActiveForm('expense')} 
                      className={`p-3.5 rounded-2xl font-bold text-xs flex items-center gap-2.5 transition-all text-left justify-start md:text-sm border ${activeForm === 'expense' ? 'bg-rose-50 text-rose-700 font-extrabold border-rose-300 shadow-xs' : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-150'}`}
                    >
                      <MinusCircle size={18} className="text-rose-500 flex-shrink-0" />
                      <div>
                        <span>Keluar Dompet</span>
                        <p className="text-[10px] text-slate-400 font-normal hidden lg:block">Belanja tunai dari dompet</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => setActiveForm('expense-bank')} 
                      className={`p-3.5 rounded-2xl font-bold text-xs flex items-center gap-2.5 transition-all text-left justify-start md:text-sm border ${activeForm === 'expense-bank' ? 'bg-amber-50 text-amber-700 font-extrabold border-amber-300 shadow-xs' : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-150'}`}
                    >
                      <CreditCard size={18} className="text-amber-500 flex-shrink-0" />
                      <div>
                        <span>Bayar ATM</span>
                        <p className="text-[10px] text-slate-400 font-normal hidden lg:block">Belanja nontunai via Rekening</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => setActiveForm('income')} 
                      className={`p-3.5 rounded-2xl font-bold text-xs flex items-center gap-2.5 transition-all text-left justify-start md:text-sm border ${activeForm === 'income' ? 'bg-blue-50 text-blue-700 font-extrabold border-blue-300 shadow-xs' : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-150'}`}
                    >
                      <TrendingUp size={18} className="text-blue-500 flex-shrink-0" />
                      <div>
                        <span>Masuk ATM</span>
                        <p className="text-[10px] text-slate-400 font-normal hidden lg:block">Gaji atau penerimaan transfer</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => setActiveForm('income-wallet')} 
                      className={`p-3.5 rounded-2xl font-bold text-[11px] sm:text-xs flex items-center gap-2.5 transition-all text-left justify-start md:text-sm border ${activeForm === 'income-wallet' ? 'bg-emerald-55 bg-emerald-50 text-emerald-700 font-extrabold border-emerald-300 shadow-xs' : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-150'}`}
                    >
                      <TrendingUp size={18} className="text-emerald-500 flex-shrink-0" />
                      <div>
                        <span>Masuk Dompet</span>
                        <p className="text-[10px] text-slate-400 font-normal hidden lg:block">Uang kas langsung ke Dompet</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => setActiveForm('withdraw')} 
                      className={`p-3.5 rounded-2xl font-bold text-[11px] sm:text-xs flex items-center gap-2.5 transition-all text-left justify-start md:text-sm border ${activeForm === 'withdraw' ? 'bg-indigo-50 text-indigo-700 font-extrabold border-indigo-300 shadow-xs' : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-150'}`}
                    >
                      <ArrowDownToLine size={18} className="text-indigo-500 flex-shrink-0" />
                      <div>
                        <span>Tarik Tunai ATM</span>
                        <p className="text-[10px] text-slate-400 font-normal hidden lg:block">ATM ditarik masuk ke Dompet</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => setActiveForm('motor')} 
                      className={`p-3.5 rounded-2xl font-bold text-xs flex items-center gap-2.5 transition-all text-left justify-start md:text-sm border ${activeForm === 'motor' ? 'bg-teal-50 text-teal-700 font-extrabold border-teal-300 shadow-xs' : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-150'}`}
                    >
                      <Wrench size={18} className="text-teal-555 flex-shrink-0" />
                      <div>
                        <span>Servis Motor</span>
                        <p className="text-[10px] text-slate-400 font-normal hidden lg:block">Ganti oli motor & spareparts</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* ACTIVE FORM RENDER SPACE (8 columns on desktop) */}
              <div className="lg:col-span-8">
                <AnimatePresence mode="wait">
                  {activeForm ? (
                    <motion.div 
                      key={activeForm}
                      initial={{ opacity: 0, scale: 0.95, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -15 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className={`bg-white rounded-3xl shadow-md border-2 overflow-hidden ${
                        activeForm === 'income' ? 'border-blue-100' : 
                        activeForm === 'income-wallet' ? 'border-emerald-100' : 
                        activeForm === 'withdraw' ? 'border-indigo-100' : 
                        activeForm === 'expense' ? 'border-rose-100' : 
                        activeForm === 'expense-bank' ? 'border-amber-100' : 'border-teal-100'
                      }`}
                    >
                      {/* HEADER DI DALAM PANEL INPUT */}
                      <div className={`p-4 px-6 flex items-center justify-between text-white font-extrabold ${
                        activeForm === 'income' ? 'bg-blue-600' : 
                        activeForm === 'income-wallet' ? 'bg-emerald-605 bg-emerald-600' : 
                        activeForm === 'withdraw' ? 'bg-indigo-600' : 
                        activeForm === 'expense' ? 'bg-rose-500' : 
                        activeForm === 'expense-bank' ? 'bg-amber-500' : 'bg-teal-500'
                      }`}>
                        <span className="flex items-center gap-2 tracking-wide uppercase text-sm">
                          {activeForm === 'income' && <><TrendingUp size={18} /> Formulir Masuk ATM</>}
                          {activeForm === 'income-wallet' && <><TrendingUp size={18} /> Formulir Masuk Dompet</>}
                          {activeForm === 'withdraw' && <><ArrowDownToLine size={18} /> Formulir Tarik Tunai</>}
                          {activeForm === 'expense' && <><MinusCircle size={18} /> Formulir Keluar Dompet</>}
                          {activeForm === 'expense-bank' && <><CreditCard size={18} /> Formulir Bayar ATM (Nontunai)</>}
                          {activeForm === 'motor' && <><Wrench size={18} /> Formulir Servis Motor</>}
                        </span>
                      </div>

                      {/* INCOME FORM */}
                      {activeForm === 'income' && (
                        <form onSubmit={handleAddIncome} className="p-6 space-y-4">
                          <div>
                            <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1">KETERANGAN SUMBER PEMASUKAN</label>
                            <input 
                              type="text" 
                              value={incomeForm.description || ''} 
                              onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })} 
                              className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none transition-all font-medium bg-slate-50 focus:bg-white text-base" 
                              required 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1">JUMLAH NOMINAL MASUK (Rp)</label>
                            <input 
                              type="text" 
                              inputMode="numeric" 
                              value={incomeForm.amount || ''} 
                              onChange={(e) => setIncomeForm({ ...incomeForm, amount: formatInputNumber(e.target.value) })} 
                              className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none transition-all font-extrabold bg-slate-50 focus:bg-white text-lg tracking-wide focus:ring-4 focus:ring-blue-100" 
                              required 
                            />
                          </div>
                          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 cursor-pointer mt-4 hover:scale-[0.99] active:scale-95 transition-all text-base">
                            <PlusCircle size={18} /> Save
                          </button>
                        </form>
                      )}

                      {/* INCOME WALLET FORM */}
                      {activeForm === 'income-wallet' && (
                        <form onSubmit={handleAddIncomeWallet} className="p-6 space-y-4">
                          <div>
                            <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1">KETERANGAN SUMBER PEMASUKAN DOMPET</label>
                            <input 
                              type="text" 
                              value={incomeWalletForm.description || ''} 
                              onChange={(e) => setIncomeWalletForm({ ...incomeWalletForm, description: e.target.value })} 
                              className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 outline-none transition-all font-medium bg-slate-50 focus:bg-white text-base" 
                              required 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1">JUMLAH NOMINAL MASUK (Rp)</label>
                            <input 
                              type="text" 
                              inputMode="numeric" 
                              value={incomeWalletForm.amount || ''} 
                              onChange={(e) => setIncomeWalletForm({ ...incomeWalletForm, amount: formatInputNumber(e.target.value) })} 
                              className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 outline-none transition-all font-extrabold bg-slate-50 focus:bg-white text-lg tracking-wide focus:ring-4 focus:ring-emerald-100" 
                              required 
                            />
                          </div>
                          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15 cursor-pointer mt-4 hover:scale-[0.99] active:scale-95 transition-all text-base">
                            <PlusCircle size={18} /> Save
                          </button>
                        </form>
                      )}

                      {/* WITHDRAW FORM */}
                      {activeForm === 'withdraw' && (
                        <form onSubmit={handleAddWithdraw} className="p-6 space-y-4">
                          <div>
                            <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1">KETERANGAN TRANSAKSI</label>
                            <input 
                              type="text" 
                              value={withdrawForm.description || ''} 
                              onChange={(e) => setWithdrawForm({ ...withdrawForm, description: e.target.value })} 
                              className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 outline-none transition-all font-medium bg-slate-50 focus:bg-white text-base" 
                              required 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1">DANA YANG DITARIK TUNAI (Rp)</label>
                            <input 
                              type="text" 
                              inputMode="numeric" 
                              value={withdrawForm.amount || ''} 
                              onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: formatInputNumber(e.target.value) })} 
                              className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 outline-none transition-all font-extrabold bg-slate-50 focus:bg-white text-lg tracking-wide focus:ring-4 focus:ring-indigo-100" 
                              required 
                            />
                            <p className="text-[11px] text-slate-400 mt-2 italic leading-tight">
                              *Catatan ini akan mendebet saldo Bank Rekening Anda dan mengkredit tunai Dompet secara otomatis.
                            </p>
                          </div>
                          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/15 cursor-pointer mt-4 hover:scale-[0.99] active:scale-95 transition-all text-base">
                            <ArrowDownToLine size={18} /> Save
                          </button>
                        </form>
                      )}

                      {/* EXPENSE FORM (DOMPET TUNAI) */}
                      {activeForm === 'expense' && (
                        <form onSubmit={handleAddExpense} className="p-6 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-2">
                              <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1">KETERANGAN PENGELUARAN</label>
                              <input 
                                type="text" 
                                value={expenseForm.description || ''} 
                                onChange={(e) => handleExpenseDescriptionChange(e, 'expense')} 
                                className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-rose-500 outline-none transition-all font-medium bg-slate-50 focus:bg-white text-base" 
                                required 
                              />
                            </div>
                            <div className="md:col-span-1">
                              <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1">BANYAKNYA QTY</label>
                              <input 
                                type="text" 
                                value={expenseForm.qty || ''} 
                                onChange={(e) => setExpenseForm({ ...expenseForm, qty: e.target.value })} 
                                onBlur={() => setExpenseForm({ ...expenseForm, qty: formatQtyWithUnit(expenseForm.qty, expenseForm.description) })}
                                className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-rose-500 outline-none transition-all font-bold bg-slate-50 focus:bg-white text-base text-center" 
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1">HARGA SATUAN (Rp)</label>
                              <input 
                                type="text" 
                                inputMode="numeric" 
                                value={expenseForm.amount || ''} 
                                onChange={(e) => setExpenseForm({ ...expenseForm, amount: formatInputNumber(e.target.value) })} 
                                className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-rose-500 outline-none transition-all font-extrabold bg-slate-50 focus:bg-white text-base text-right tracking-wide" 
                                required 
                              />
                            </div>
                            
                            <div>
                              <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1">PILIH KATEGORI</label>
                              <select 
                                value={expenseForm.kategori} 
                                onChange={(e) => setExpenseForm({ ...expenseForm, kategori: e.target.value })} 
                                className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-rose-500 outline-none font-bold text-base bg-slate-50 cursor-pointer focus:bg-white transition-all text-slate-700"
                              >
                                {EXPENSE_CATEGORIES.map(cat => (
                                  <option key={`opt-exp-${cat.id}`} value={cat.id}>{cat.icon} &nbsp;{cat.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* SMART MULTIPLIER MATH OVERVIEW */}
                          {unformatNumber(expenseForm.amount) > 0 && (
                            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 flex justify-between items-center text-xs text-rose-800 font-bold">
                              <span>Perhitungan:</span>
                              <span>
                                {formatRupiah(unformatNumber(expenseForm.amount))} &times; {getQtyMultiplier(expenseForm.qty)} = 
                                <span className="ml-1 text-sm font-black text-rose-600">{formatRupiah(unformatNumber(expenseForm.amount) * getQtyMultiplier(expenseForm.qty))}</span>
                              </span>
                            </div>
                          )}

                          <button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-500/15 cursor-pointer mt-4 hover:scale-[0.99] active:scale-95 transition-all text-base">
                            <Check size={18} /> Save
                          </button>
                        </form>
                      )}

                      {/* EXPENSE BANK FORM (ATM DIRECT) */}
                      {activeForm === 'expense-bank' && (
                        <form onSubmit={handleAddExpenseBank} className="p-6 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-2">
                              <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1">KETERANGAN PENGELUARAN REKENING</label>
                              <input 
                                type="text" 
                                value={expenseBankForm.description || ''} 
                                onChange={(e) => handleExpenseDescriptionChange(e, 'expense-bank')} 
                                className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-amber-500 outline-none transition-all font-medium bg-slate-50 focus:bg-white text-base" 
                                required 
                              />
                            </div>
                            <div className="md:col-span-1">
                              <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1">QTY / JUMLAH</label>
                              <input 
                                type="text" 
                                value={expenseBankForm.qty || ''} 
                                onChange={(e) => setExpenseBankForm({ ...expenseBankForm, qty: e.target.value })} 
                                onBlur={() => setExpenseBankForm({ ...expenseBankForm, qty: formatQtyWithUnit(expenseBankForm.qty, expenseBankForm.description) })}
                                className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-amber-500 outline-none transition-all font-bold bg-slate-50 focus:bg-white text-base text-center" 
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1">HARGA SATUAN (Rp)</label>
                              <input 
                                type="text" 
                                inputMode="numeric" 
                                value={expenseBankForm.amount || ''} 
                                onChange={(e) => setExpenseBankForm({ ...expenseBankForm, amount: formatInputNumber(e.target.value) })} 
                                className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-amber-500 outline-none transition-all font-extrabold bg-slate-50 focus:bg-white text-base text-right tracking-wide" 
                                required 
                              />
                            </div>
                            
                            <div>
                              <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1">PILIH KATEGORI</label>
                              <select 
                                value={expenseBankForm.kategori} 
                                onChange={(e) => setExpenseBankForm({ ...expenseBankForm, kategori: e.target.value })} 
                                className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-amber-500 outline-none font-bold text-base bg-slate-50 cursor-pointer focus:bg-white transition-all text-slate-700"
                              >
                                {EXPENSE_CATEGORIES.map(cat => (
                                  <option key={`opt-expb-${cat.id}`} value={cat.id}>{cat.icon} &nbsp;{cat.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* SMART MULTIPLIER MATH OVERVIEW */}
                          {unformatNumber(expenseBankForm.amount) > 0 && (
                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex justify-between items-center text-xs text-amber-805 font-bold">
                              <span>Perhitungan:</span>
                              <span>
                                {formatRupiah(unformatNumber(expenseBankForm.amount))} &times; {getQtyMultiplier(expenseBankForm.qty)} = 
                                <span className="ml-1 text-sm font-black text-amber-600">{formatRupiah(unformatNumber(expenseBankForm.amount) * getQtyMultiplier(expenseBankForm.qty))}</span>
                              </span>
                            </div>
                          )}

                          <button type="submit" className="w-full bg-amber-505 bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/15 cursor-pointer mt-4 hover:scale-[0.99] active:scale-95 transition-all text-base">
                            <CreditCard size={18} /> Save
                          </button>
                        </form>
                      )}

                      {/* MOTOR EXPENSE FORM */}
                      {activeForm === 'motor' && (
                        <div className="p-6">
                          
                          {/* TAB SELECTOR: OIL VS ASSORTED WORK */}
                          <div className="flex bg-teal-50 border border-teal-200/50 p-1 rounded-2xl mb-5">
                            <button 
                              type="button" 
                              onClick={() => setMotorFormType('oli')} 
                              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${motorFormType === 'oli' ? 'bg-teal-500 text-white shadow-xs' : 'text-teal-600 hover:bg-teal-100/50'}`}
                            >
                              ⚙️ &nbsp;Ganti Oli Berkala
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setMotorFormType('servis')} 
                              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${motorFormType === 'servis' ? 'bg-teal-500 text-white shadow-xs' : 'text-teal-600 hover:bg-teal-100/50'}`}
                            >
                              👨‍🔧 &nbsp;Servis / Sparepart
                            </button>
                          </div>

                          <form onSubmit={handleAddMotorExpense} className="space-y-4">
                            {motorFormType === 'oli' ? (
                              <div className="space-y-4 animate-in fade-in slide-in-from-top-1.5 duration-200">
                                <div>
                                  <label className="block text-xs font-black text-slate-500 tracking-wider mb-1">MEREK / JENIS OLI</label>
                                  <input 
                                    type="text" 
                                    value={motorForm.jenisOli || ''} 
                                    onChange={(e) => setMotorForm({ ...motorForm, jenisOli: e.target.value })} 
                                    className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 outline-none transition-all font-medium text-base bg-slate-50 focus:bg-white" 
                                  />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-black text-slate-500 tracking-wider mb-1">KM MOTOR SAAT INI</label>
                                    <input 
                                      type="text" 
                                      inputMode="numeric" 
                                      value={motorForm.kmAwal || ''} 
                                      onChange={(e) => setMotorForm({ ...motorForm, kmAwal: formatInputNumber(e.target.value) })} 
                                      className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 outline-none transition-all font-extrabold text-base bg-slate-50 focus:bg-white text-center" 
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-black text-slate-500 tracking-wider mb-1">JARING REKOM (+ KM)</label>
                                    <input 
                                      type="text" 
                                      inputMode="numeric" 
                                      value={motorForm.kmNambah || ''} 
                                      onChange={(e) => setMotorForm({ ...motorForm, kmNambah: formatInputNumber(e.target.value) })} 
                                      className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 outline-none transition-all font-extrabold text-base bg-slate-50 focus:bg-white text-center" 
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="animate-in fade-in slide-in-from-top-1.5 duration-200">
                                <label className="block text-xs font-black text-slate-500 tracking-wider mb-1">KETERANGAN SPAREPARTS/SERVIS</label>
                                <input 
                                  type="text" 
                                  value={motorForm.deskripsiServis || ''} 
                                  onChange={(e) => setMotorForm({ ...motorForm, deskripsiServis: e.target.value })} 
                                  className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 outline-none transition-all font-medium text-base bg-slate-50 focus:bg-white" 
                                />
                              </div>
                            )}

                            <div>
                              <label className="block text-xs font-black text-slate-500 tracking-wider mb-1 uppercase">BIAYA JASA & PRODUK (Rp) - <span className="text-rose-500 italic font-bold">Dipotong dari Dompet</span></label>
                              <input 
                                type="text" 
                                inputMode="numeric" 
                                value={motorForm.amount || ''} 
                                onChange={(e) => setMotorForm({ ...motorForm, amount: formatInputNumber(e.target.value) })} 
                                className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 outline-none transition-all font-extrabold text-base bg-slate-50 focus:bg-white text-right tracking-wide" 
                              />
                            </div>
                            
                            <button type="submit" className="w-full bg-teal-500 hover:bg-teal-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-teal-500/15 cursor-pointer mt-4 hover:scale-[0.99] active:scale-95 transition-all text-base">
                              <Wrench size={18} /> Save
                            </button>
                          </form>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="empty-state"
                      initial={{ opacity: 0, scale: 0.95, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -15 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="bg-slate-50 flex flex-col items-center justify-center p-12 text-center rounded-3xl h-full min-h-[300px] border-2 border-dashed border-slate-200"
                    >
                      <div className="bg-white p-4 rounded-full shadow-sm mb-4 text-slate-300">
                        <Grid size={32} />
                      </div>
                      <h4 className="font-extrabold text-slate-700 mb-1">Area Kerja Kosong</h4>
                      <p className="text-slate-500 font-medium text-sm">Silakan pilih salah satu menu "Pilih Transaksi" di samping kiri untuk membuka formulir pendataan.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </motion.div>
          )}

          {/* TAB 3: RICH TRANSACTION HISTORY ARCHIVE */}
          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              
              {/* COMPREHENSIVE FILTER SLIDER CONTROL PANEL */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                
                {/* FIRST LINE: SEARCH BAR */}
                <div className="flex flex-col md:flex-row items-stretch gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                    <input 
                      type="text"
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      placeholder="Cari transaksi berdasarkan keterangan atau kata kunci..." 
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100 focus:bg-white border-2 border-slate-200 focus:border-blue-500 rounded-2xl outline-none transition-all text-sm font-medium"
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                        className="absolute right-3.5 top-3.5 p-0.5 text-slate-400 hover:text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <button 
                    onClick={clearFilters}
                    className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-extrabold text-sm rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                  >
                    <SlidersHorizontal size={14} /> Bersihkan Filter
                  </button>
                </div>

                {/* SECOND LINE: DROP DOWN DROPS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-slate-100 pt-3.5">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider mb-1.5 text-slate-505">Kategori / Alur</label>
                    <select
                      value={typeFilter}
                      onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                      className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      <option value="all">Semua Alur / Kategori</option>
                      <option value="income">⚡ Semua Dana Masuk (ATM & Dompet)</option>
                      <option value="withdraw">🔄 Tarik Tunai ATM</option>
                      <option value="expense-dompet">💵 Belanja dari Dompet</option>
                      <option value="expense-atm">💳 Belanja langsung ATM</option>
                      {EXPENSE_CATEGORIES.map(c => (
                        <option key={`ch-cat-${c.id}`} value={c.id}>{c.icon} {c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider mb-1.5 text-slate-505">Bulan Catatan</label>
                    <select
                      value={expenseFilterMonth}
                      onChange={(e) => { setExpenseFilterMonth(e.target.value); setCurrentPage(1); }}
                      className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      <option value="all">Semua Bulan</option>
                      <option value="1">Januari</option>
                      <option value="2">Februari</option>
                      <option value="3">Maret</option>
                      <option value="4">April</option>
                      <option value="5">Mei</option>
                      <option value="6">Juni</option>
                      <option value="7">Juli</option>
                      <option value="8">Agustus</option>
                      <option value="9">September</option>
                      <option value="10">Oktober</option>
                      <option value="11">November</option>
                      <option value="12">Desember</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider mb-1.5 text-slate-505">Tahun Catatan</label>
                    <select
                      value={expenseFilterYear}
                      onChange={(e) => { setExpenseFilterYear(e.target.value); setCurrentPage(1); }}
                      className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      <option value="all">Semua Tahun</option>
                      {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <div className="w-full p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-center text-xs text-blue-800 font-extrabold whitespace-nowrap">
                      Terfilter: {filteredHistory.length} Baris
                    </div>
                  </div>
                </div>
              </div>

              {/* TRANSACTIONS CONTAINER LIST */}
              <div className="space-y-4">
                {currentTransactions.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-2">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                      <FileText size={20} />
                    </div>
                    <h4 className="font-extrabold text-slate-800 text-sm">Tidak Menemukan Data COCOK</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto leading-normal">Cobalah mengubah kombinasi kata pencarian Anda, atau atur ulang filter pencatat.</p>
                    <button 
                      onClick={clearFilters}
                      className="text-xs font-extrabold text-blue-600 border border-blue-200 rounded-lg py-1.5 px-3 bg-blue-50/50 hover:bg-blue-50 cursor-pointer transition-colors mt-2"
                    >
                      Reset Filter Pencatat
                    </button>
                  </div>
                ) : (
                  <>
                    {currentTransactions.map((tx) => {
                      const isExpense = tx.type === 'expense' || tx.type === 'expense-bank';
                      const catDetails = isExpense ? getCategoryDetails(tx.kategori) : null;

                      return (
                        <div key={tx.id} className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200 flex flex-col gap-3 relative hover:shadow-md transition-all duration-200">
                          
                          {/* HEAD BAR: DATE & ACTIONS */}
                          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <span className="text-xs font-black text-slate-600 flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-xl">
                              <Calendar size={13} className="text-blue-500" /> {displayDate(tx.date)}
                            </span>
                            
                            {tx.type !== 'main' && tx.type !== 'wallet-main' ? (
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => setEditingTx({ ...tx, amountStr: formatInputNumber(tx.amount), qtyStr: tx.qty || '' })} 
                                  className="p-2 text-blue-650 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                  title="Edit Transaksi"
                                >
                                  <Edit size={13} />
                                </button>
                                <button 
                                  onClick={() => handleDelete(tx.id)} 
                                  className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                  title="Hapus Transaksi"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                🔧 Atur saldo awal via tombol Dasbor
                              </span>
                            )}
                          </div>

                          {/* BODY: SPECS AND ACCENTS */}
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <h4 className="font-extrabold text-slate-900 text-sm md:text-base leading-snug flex items-center gap-1.5 flex-wrap">
                                {isExpense && catDetails && (
                                  <span className="text-lg bg-slate-100 p-0.5 px-1.5 rounded-lg border border-slate-100" title={catDetails.label}>{catDetails.icon}</span>
                                )}
                                <span>{tx.description}</span>
                                {tx.qty && (
                                  <span className="ml-1 px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black rounded-lg whitespace-nowrap">
                                    {tx.qty}
                                  </span>
                                )}
                              </h4>
                              
                              <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {tx.type === 'main' && (
                                  <span className="text-[9px] font-black bg-blue-150 text-blue-700 px-2 py-0.5 rounded-lg border border-blue-200 uppercase tracking-wider">Saldo Awal ATM</span>
                                )}
                                {tx.type === 'wallet-main' && (
                                  <span className="text-[9px] font-black bg-emerald-150 text-emerald-700 px-2 py-0.5 rounded-lg border border-emerald-250 uppercase tracking-wider">Saldo Awal Dompet</span>
                                )}
                                {tx.type === 'income' && (
                                  <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg border border-blue-200 uppercase tracking-wider">Pemasukan ATM</span>
                                )}
                                {tx.type === 'income-wallet' && (
                                  <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg border border-emerald-250 uppercase tracking-wider">Pemasukan Dompet</span>
                                )}
                                {tx.type === 'withdraw' && (
                                  <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg border border-indigo-200 uppercase tracking-wider">Tarik Tunai ATM</span>
                                )}
                                {tx.type === 'expense' && (
                                  <span className="text-[9px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-lg border border-rose-200 uppercase tracking-wider">Keluar Dompet</span>
                                )}
                                {tx.type === 'expense-bank' && (
                                  <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg border border-amber-200 uppercase tracking-wider">Bayar ATM (Direct)</span>
                                )}
                              </div>
                            </div>

                            <div className={`text-right font-black text-base md:text-lg whitespace-nowrap ${
                              isExpense ? 'text-rose-500' 
                              : (tx.type === 'withdraw' || tx.type === 'wallet-main' || tx.type === 'main' || tx.type === 'income' || tx.type === 'income-wallet') ? 'text-blue-600' 
                              : 'text-slate-800'
                            }`}>
                              {isExpense || tx.type === 'withdraw' ? '−' : '+'} {formatRupiah(tx.amount)}
                            </div>
                          </div>

                          {/* FOOTER: RUNNING BALANCE STAMPS */}
                          <div className="bg-slate-50 rounded-2xl p-3.5 grid grid-cols-2 gap-3 mt-1 border border-slate-200 shadow-inner">
                            <div className="flex flex-col">
                              <span className="text-[9px] uppercase font-black text-slate-400 mb-0.5 flex items-center gap-1"><Building2 size={10}/> Sisa Rekening ATM</span>
                              <span className="font-extrabold text-slate-700 text-xs sm:text-sm">
                                {showBankBalance && tx.histBank !== undefined ? formatRupiah(tx.histBank) : 'Rp •••••••'}
                              </span>
                            </div>
                            
                            <div className="flex flex-col border-l border-slate-200 pl-3.5">
                              <span className="text-[9px] uppercase font-black text-slate-400 mb-0.5 flex items-center gap-1"><Wallet size={10}/> Sisa Saldo Dompet</span>
                              <span className="font-extrabold text-slate-700 text-xs sm:text-sm">
                                {showWalletBalance && tx.histWallet !== undefined ? formatRupiah(tx.histWallet) : 'Rp •••••••'}
                              </span>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                    
                    {/* PAGINATION CONTROLI BAR */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-xs border border-slate-200 mt-4">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className={`flex items-center gap-1 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            currentPage === 1 
                            ? 'text-slate-300 bg-slate-50 cursor-not-allowed' 
                            : 'text-blue-650 bg-blue-50 border border-blue-100 hover:bg-blue-100 active:scale-95'
                          }`}
                        >
                          <ChevronLeft size={14} /> Sebelumnya
                        </button>
                        
                        <span className="text-xs font-extrabold text-slate-500 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
                          Halaman {currentPage} <span className="text-slate-300 mx-1">/</span> {totalPages}
                        </span>
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className={`flex items-center gap-1 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            currentPage === totalPages 
                            ? 'text-slate-305 text-slate-300 bg-slate-50 cursor-not-allowed' 
                            : 'text-blue-650 bg-blue-50 border border-blue-100 hover:bg-blue-100 active:scale-95'
                          }`}
                        >
                          Berikutnya <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>

      {/* FLOAT BOTTOM MOBILE DYNAMIC TAB BAR BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2.5 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] md:hidden z-40">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          
          {/* TAB 1: DASBOR */}
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center p-1.5 transition-all w-20 relative cursor-pointer ${activeTab === 'dashboard' ? 'text-indigo-600 font-extrabold scale-105' : 'text-slate-400'}`}
          >
            <PieChart size={20} className={activeTab === 'dashboard' ? 'stroke-[2.5px]' : 'stroke-2'} />
            <span className="text-[10px] mt-1 font-bold">Dasbor</span>
            {activeTab === 'dashboard' && (
              <motion.div 
                layoutId="active-dot" 
                className="absolute -top-1 w-1.5 h-1.5 bg-indigo-600 rounded-full" 
                transition={{ type: 'spring', sharpness: 120, damping: 15 }}
              />
            )}
          </button>

          {/* TAB 2: CATAT */}
          <button 
            onClick={() => {
              if (activeTab !== 'record') {
                setActiveTab('record');
                setActiveForm('expense');
              }
            }}
            className={`flex flex-col items-center justify-center p-1.5 transition-all w-20 relative cursor-pointer ${activeTab === 'record' ? 'text-indigo-600 font-extrabold scale-105' : 'text-slate-400'}`}
          >
            <Grid size={20} className={activeTab === 'record' ? 'stroke-[2.5px]' : 'stroke-2'} />
            <span className="text-[10px] mt-1 font-bold">Catat</span>
            {activeTab === 'record' && (
              <motion.div 
                layoutId="active-dot" 
                className="absolute -top-1 w-1.5 h-1.5 bg-indigo-600 rounded-full" 
                transition={{ type: 'spring', sharpness: 120, damping: 15 }}
              />
            )}
          </button>

          {/* TAB 3: RIWAYAT */}
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center p-1.5 transition-all w-20 relative cursor-pointer ${activeTab === 'history' ? 'text-indigo-600 font-extrabold scale-105' : 'text-slate-400'}`}
          >
            <FileText size={20} className={activeTab === 'history' ? 'stroke-[2.5px]' : 'stroke-2'} />
            <span className="text-[10px] mt-1 font-bold">Riwayat</span>
            {activeTab === 'history' && (
              <motion.div 
                layoutId="active-dot" 
                className="absolute -top-1 w-1.5 h-1.5 bg-indigo-600 rounded-full" 
                transition={{ type: 'spring', sharpness: 120, damping: 15 }}
              />
            )}
          </button>

        </div>
      </div>

      {/* PORTAL OVERLAYS */}

      {/* CATEGORY BREAKDOWN MODAL POP-UP */}
      <AnimatePresence>
        {activeCategoryDetail && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[150] p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-base">
                  <List size={18} className="text-blue-500"/> 
                  Rincian Item: {getCategoryDetails(activeCategoryDetail).label}
                </h3>
                <button onClick={() => setActiveCategoryDetail(null)} className="text-slate-400 hover:text-slate-600 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {categoryBreakdownData[activeCategoryDetail]?.length === 0 ? (
                   <div className="text-center py-6">
                     <p className="text-slate-400 font-bold text-xs">Belum ada transaksi di kategori ini.</p>
                   </div>
                ) : (
                   categoryBreakdownData[activeCategoryDetail]?.map(tx => (
                     <div key={tx.id} className="flex justify-between items-stretch border-b border-slate-150 pb-3 last:border-0 last:pb-0">
                       <div className="flex-1 pr-3 flex flex-col justify-between">
                         <span className="text-[10px] text-slate-400 mb-1 flex items-center gap-1 font-bold">
                           <Calendar size={10} /> {displayDate(tx.date)}
                         </span>
                         <p className="text-xs sm:text-sm font-extrabold text-slate-800 leading-tight">
                           {tx.description}
                           {tx.qty && <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-black whitespace-nowrap">{tx.qty}</span>}
                         </p>
                       </div>
                       
                       <div className="font-extrabold text-xs sm:text-sm text-rose-500 whitespace-nowrap bg-rose-50 px-2.5 py-1 rounded-xl self-center border border-rose-100">
                         {formatRupiah(tx.amount)}
                       </div>
                     </div>
                   ))
                )}
              </div>
              
              {/* BAGIAN SUBTOTAL CALC */}
              {categoryBreakdownData[activeCategoryDetail]?.length > 0 && (
                <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-between items-center shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                  <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Subtotal Pengeluaran</span>
                  <span className="font-black text-lg text-rose-600">
                    {formatRupiah(categoryBreakdownData[activeCategoryDetail].reduce((sum, tx) => sum + Number(tx.amount), 0))}
                  </span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CALCULATOR CATEGORY TOTAL MODAL */}
      <AnimatePresence>
        {showCategoryCalculator && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[150] p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-base">
                  <Calculator size={18} className="text-indigo-500"/> 
                  Kalkulator Kategori
                </h3>
                <button onClick={() => setShowCategoryCalculator(false)} className="text-slate-400 hover:text-slate-600 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-3 flex-1 bg-white">
                <p className="text-xs font-bold text-slate-500 mb-2">Pilih kategori yang ingin ditotal:</p>
                {categoryTotals.map(cat => (
                  <label key={cat.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300"
                      checked={selectedCategoriesForCalc.includes(cat.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategoriesForCalc([...selectedCategoriesForCalc, cat.id]);
                        } else {
                          setSelectedCategoriesForCalc(selectedCategoriesForCalc.filter(id => id !== cat.id));
                        }
                      }}
                    />
                    <div className="flex-1 flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <span className="text-lg bg-slate-100 p-1 rounded-lg">{cat.icon}</span> {cat.label}
                      </span>
                      <span className="text-xs font-black text-slate-600">
                        {formatRupiah(cat.amount)}
                      </span>
                    </div>
                  </label>
                ))}
                {categoryTotals.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">Belum ada pengeluaran.</p>
                )}
              </div>
              
              <div className="p-5 border-t border-slate-200 bg-indigo-50 flex justify-between items-center shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                <span className="font-black text-[10px] text-indigo-600 uppercase tracking-widest">Total Terpilih</span>
                <span className="font-black text-xl text-indigo-700">
                  {formatRupiah(selectedCategoriesForCalc.reduce((sum, catId) => {
                    const cat = categoryTotals.find(c => c.id === catId);
                    return sum + (cat ? cat.amount : 0);
                  }, 0))}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DIRECT TRANSACTION RECORD EDIT SHEET */}
      <AnimatePresence>
        {editingTx && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[200] p-4">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200"
            >
              <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                <h3 className="font-extrabold text-slate-800 flex items-center gap-1.5 text-base">✏️ Edit Riwayat Transaksi</h3>
                <button onClick={() => setEditingTx(null)} className="text-slate-400 hover:text-slate-600 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full cursor-pointer"><X size={16} /></button>
              </div>

              <form onSubmit={saveEditedHistory} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 tracking-wider mb-1 uppercase">Tanggal Transaksi</label>
                  <input 
                    type="date" 
                    value={editingTx?.date || ''} 
                    onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })} 
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl font-medium outline-none focus:border-blue-500" 
                    required 
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-black text-slate-500 tracking-wider mb-1 uppercase">Keterangan</label>
                    <input 
                      type="text" 
                      value={editingTx?.description || ''} 
                      onChange={(e) => setEditingTx({ ...editingTx, description: e.target.value })} 
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl font-medium outline-none focus:border-blue-500" 
                      required 
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-black text-slate-500 tracking-wider mb-1 uppercase">Qty</label>
                    <input 
                      type="text" 
                      value={editingTx?.qtyStr || ''} 
                      onChange={(e) => setEditingTx({ ...editingTx, qtyStr: e.target.value })} 
                      onBlur={() => setEditingTx({ ...editingTx, qtyStr: formatQtyWithUnit(editingTx.qtyStr, editingTx.description) })}
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl font-bold outline-none focus:border-blue-500 text-center" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 tracking-wider mb-1 uppercase">Total Nominal Akhir (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3.5 text-slate-500 font-bold text-sm">Rp</span>
                    <input 
                      type="text" 
                      inputMode="numeric" 
                      value={editingTx?.amountStr || ''} 
                      onChange={(e) => setEditingTx({ ...editingTx, amountStr: formatInputNumber(e.target.value) })} 
                      className="w-full pl-10 p-3 bg-slate-50 border border-slate-350 rounded-2xl font-extrabold focus:ring-4 focus:ring-blue-105 outline-none focus:border-blue-500 text-base" 
                      required 
                    />
                  </div>
                </div>

                {(editingTx.type === 'expense' || editingTx.type === 'expense-bank') && (
                  <div>
                    <label className="block text-xs font-black text-slate-500 tracking-wider mb-1 uppercase">Kelompok Kategori</label>
                    <select 
                      value={editingTx.kategori || 'lainnya'} 
                      onChange={(e) => setEditingTx({ ...editingTx, kategori: e.target.value })} 
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl font-bold bg-white cursor-pointer"
                    >
                      {EXPENSE_CATEGORIES.map(cat => (
                        <option key={`edit-${cat.id}`} value={cat.id}>{cat.icon} &nbsp;{cat.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setEditingTx(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl cursor-pointer transition-colors">Batal</button>
                  <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl cursor-pointer transition-all shadow-md">Simpan Perubahan</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION / NOTIFICATION UTILITY OVERLAY MODAL */}
      <AnimatePresence>
        {dialog.isOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[300] p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 flex flex-col items-center text-center">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-sm ${dialog.type === 'confirm' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                  <AlertCircle size={28} />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-1.5">
                  {dialog.type === 'confirm' ? 'Permintaan Konfirmasi' : 'Informasi Aplikasi'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-normal mb-6 px-1">{dialog.message}</p>
                
                <div className="flex gap-2.5 w-full">
                  {dialog.type === 'confirm' && (
                    <button onClick={closeDialog} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl transition-all cursor-pointer text-sm">
                      Batal
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (dialog.onConfirm) dialog.onConfirm();
                      closeDialog();
                    }} 
                    className={`flex-1 py-3 text-white font-black rounded-2xl transition-all text-sm cursor-pointer ${dialog.type === 'confirm' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {dialog.type === 'confirm' ? 'Lanjutkan' : 'Mengerti'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
