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
  Grid, Calculator, List, Search, SlidersHorizontal, Settings, Info, BarChart2, Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Cell,
  PieChart as RechartsPieChart,
  Pie,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

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
    localStorage.setItem('show_analysis_chart', JSON.stringify(showAnalysis));
  }, [showAnalysis]);
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8; // Increased slightly for desktop list efficiency

  const currentMonth = (new Date().getMonth() + 1).toString();
  const currentYear = new Date().getFullYear().toString();
  const [expenseFilterMonth, setExpenseFilterMonth] = useState<string>(currentMonth);
  const [expenseFilterYear, setExpenseFilterYear] = useState<string>(currentYear);
  const [showTips, setShowTips] = useState<boolean>(false);
  const [showCategorySettings, setShowCategorySettings] = useState<boolean>(false);
  const [selectedTotalCategories, setSelectedTotalCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('selected_expense_categories_for_total');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return EXPENSE_CATEGORIES.map(c => c.id);
  });
  const [chartType, setChartType] = useState<string>('bar');

  useEffect(() => {
    localStorage.setItem('selected_expense_categories_for_total', JSON.stringify(selectedTotalCategories));
  }, [selectedTotalCategories]);

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

  const [activeForm, setActiveForm] = useState<'expense' | 'motor' | null>(null); 
  const toggleForm = (formName: 'expense' | 'motor') => {
    setActiveForm(prev => prev === formName ? null : formName);
  };

  const [expenseForm, setExpenseForm] = useState({ amount: '', description: '', qty: '', kategori: 'makanan' });
  const [motorFormType, setMotorFormType] = useState<'oli' | 'servis'>('oli'); 
  const [motorForm, setMotorForm] = useState({ jenisOli: '', kmAwal: '', kmNambah: '', deskripsiServis: '', amount: '' });

  const [editingTx, setEditingTx] = useState<any | null>(null);

  // --- FUNGSI AUTO-FORMAT BENSIN/BBM ---
  const handleExpenseDescriptionChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const lowerVal = val.toLowerCase();
    
    let currentAmount = expenseForm.amount;
    if (lowerVal.includes('pertalit')) currentAmount = '10.000';
    else if (lowerVal.includes('pertamax')) currentAmount = '16.650';
    setExpenseForm({ ...expenseForm, description: val, amount: currentAmount });
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

  const processedHistory = useMemo(() => {
    return [...transactions].sort((a, b) => {
      if (a.timestamp && b.timestamp) {
        return b.timestamp - a.timestamp;
      }
      return 0;
    });
  }, [transactions]);

  // --- STATE MODAL RINCIAN TOTAL TAHUN INI ---
  const [showYearTotalDetails, setShowYearTotalDetails] = useState<boolean>(false);

  // --- MEMO UNTUK ASAL-USUL RINCIAN TOTAL PENGELUARAN TAHUN INI ---
  const yearExpenseDetails = useMemo(() => {
    const targetYear = expenseFilterYear === 'all' ? new Date().getFullYear().toString() : expenseFilterYear;
    const monthNamesFull = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    const yearExpenses = processedHistory.filter(tx => {
      if (tx.type !== 'expense' && tx.type !== 'expense-bank') return false;
      if (!tx.date) return false;
      
      let yearStr = '';
      const parts = tx.date.split('-');
      if (parts.length === 3) {
        yearStr = parts[0];
      } else {
        const dateObj = new Date(tx.date);
        if (!isNaN(dateObj.getTime())) yearStr = dateObj.getFullYear().toString();
      }
      
      if (expenseFilterYear === 'all') return true;
      return yearStr === targetYear;
    });

    const totalAmount = yearExpenses.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const totalCount = yearExpenses.length;

    // Breakdown by source
    let cashAmount = 0;
    let cashCount = 0;
    let bankAmount = 0;
    let bankCount = 0;

    // Breakdown by category
    const catMap: Record<string, { amount: number; count: number }> = {};
    EXPENSE_CATEGORIES.forEach(c => {
      catMap[c.id] = { amount: 0, count: 0 };
    });

    // Breakdown by month
    const monthSums = Array(12).fill(0);
    const monthCounts = Array(12).fill(0);

    yearExpenses.forEach(tx => {
      const amt = Number(tx.amount || 0);
      const cat = tx.kategori && catMap[tx.kategori] !== undefined ? tx.kategori : 'lainnya';
      if (!catMap[cat]) catMap[cat] = { amount: 0, count: 0 };
      catMap[cat].amount += amt;
      catMap[cat].count += 1;

      if (tx.type === 'expense-bank') {
        bankAmount += amt;
        bankCount += 1;
      } else {
        cashAmount += amt;
        cashCount += 1;
      }

      let monthIdx = -1;
      const parts = tx.date.split('-');
      if (parts.length === 3) {
        monthIdx = parseInt(parts[1], 10) - 1;
      } else {
        const dateObj = new Date(tx.date);
        if (!isNaN(dateObj.getTime())) monthIdx = dateObj.getMonth();
      }
      if (monthIdx >= 0 && monthIdx < 12) {
        monthSums[monthIdx] += amt;
        monthCounts[monthIdx] += 1;
      }
    });

    const categoryBreakdown = EXPENSE_CATEGORIES.map(c => ({
      ...c,
      amount: catMap[c.id]?.amount || 0,
      count: catMap[c.id]?.count || 0,
      percentage: totalAmount > 0 ? Number((((catMap[c.id]?.amount || 0) / totalAmount) * 100).toFixed(1)) : 0
    })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);

    const monthBreakdown = monthNamesFull.map((name, idx) => ({
      name,
      amount: monthSums[idx],
      count: monthCounts[idx],
      percentage: totalAmount > 0 ? Number(((monthSums[idx] / totalAmount) * 100).toFixed(1)) : 0
    })).filter(m => m.amount > 0);

    const topTransactions = [...yearExpenses]
      .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
      .slice(0, 5);

    return {
      yearLabel: expenseFilterYear === 'all' ? 'Semua Tahun' : `Tahun ${targetYear}`,
      totalAmount,
      totalCount,
      cashAmount,
      cashCount,
      bankAmount,
      bankCount,
      categoryBreakdown,
      monthBreakdown,
      topTransactions
    };
  }, [processedHistory, expenseFilterYear]);

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
  const { displayedExpense, availableYears, categoryTotals, categoryBreakdownData, rawCatTotals } = useMemo(() => {
    const years = new Set<string>([new Date().getFullYear().toString()]); 
    let allCategoriesSum = 0;
    let selectedCategoriesSum = 0;
    
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
           const amountNum = Number(tx.amount);
           allCategoriesSum += amountNum;
           const cat = tx.kategori && catTotals[tx.kategori] !== undefined ? tx.kategori : 'lainnya';
           catTotals[cat] += amountNum;
           catTransactions[cat].push(tx);
           if (selectedTotalCategories.includes(cat)) {
              selectedCategoriesSum += amountNum;
           }
        }
      }
    });

    const catArray = EXPENSE_CATEGORIES.map(c => ({
      ...c,
      amount: catTotals[c.id] || 0,
      percentage: allCategoriesSum > 0 ? Number((((catTotals[c.id] || 0) / allCategoriesSum) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.amount - a.amount);

    return {
      displayedExpense: selectedCategoriesSum,
      availableYears: Array.from(years).sort((a, b) => Number(b) - Number(a)),
      categoryTotals: catArray,
      categoryBreakdownData: catTransactions,
      rawCatTotals: catTotals
    };
  }, [processedHistory, expenseFilterMonth, expenseFilterYear, selectedTotalCategories]);

  // --- MENGHITUNG CHART DIAGRAM BATANG PENGELUARAN BULANAN ---
  const { monthlyExpenseData, chartStats } = useMemo(() => {
    const targetYear = expenseFilterYear === 'all' ? new Date().getFullYear().toString() : expenseFilterYear;
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthNamesFull = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    const monthlySums = Array(12).fill(0);

    processedHistory.forEach(tx => {
      if ((tx.type === 'expense' || tx.type === 'expense-bank') && tx.date) {
        let yearStr = '';
        let monthIdx = -1;
        const parts = tx.date.split('-');
        if (parts.length === 3) {
          yearStr = parts[0];
          monthIdx = parseInt(parts[1], 10) - 1;
        } else {
          const dateObj = new Date(tx.date);
          if (!isNaN(dateObj.getTime())) {
            yearStr = dateObj.getFullYear().toString();
            monthIdx = dateObj.getMonth();
          }
        }

        if (monthIdx >= 0 && monthIdx < 12) {
          if (expenseFilterYear === 'all' || yearStr === targetYear) {
            monthlySums[monthIdx] += Number(tx.amount);
          }
        }
      }
    });

    const totalYearExpense = monthlySums.reduce((acc, curr) => acc + curr, 0);
    const avgMonthlyExpense = Math.round(totalYearExpense / 12);
    
    let maxIdx = 0;
    monthlySums.forEach((val, idx) => {
      if (val > monthlySums[maxIdx]) maxIdx = idx;
    });

    const currentMonthIdx = new Date().getMonth();

    const data = monthNamesShort.map((shortName, idx) => ({
      month: shortName,
      fullMonth: monthNamesFull[idx],
      amount: monthlySums[idx],
      isCurrentMonth: idx === currentMonthIdx,
      isMaxMonth: monthlySums[idx] > 0 && idx === maxIdx
    }));

    return {
      monthlyExpenseData: data,
      chartStats: {
        totalYearExpense,
        avgMonthlyExpense,
        maxMonthName: monthNamesFull[maxIdx],
        maxMonthAmount: monthlySums[maxIdx]
      }
    };
  }, [processedHistory, expenseFilterYear]);

  const formatYAxis = (value: number) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}M`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}jt`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}rb`;
    return value.toString();
  };

  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 px-4 rounded-2xl shadow-xl border border-slate-700/50 text-xs font-bold space-y-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-300 font-bold">{data.fullMonth}</span>
            {data.isCurrentMonth && (
              <span className="bg-rose-500/30 text-rose-300 text-[10px] px-2 py-0.5 rounded-full font-black uppercase border border-rose-500/30">
                Bulan Ini
              </span>
            )}
          </div>
          <p className="text-base font-black text-rose-400">
            {formatRupiah(data.amount)}
          </p>
        </div>
      );
    }
    return null;
  };

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

  const handleAddExpense = (e: FormEvent) => {
    e.preventDefault();
    const baseAmount = unformatNumber(expenseForm.amount);
    if (baseAmount <= 0 || !expenseForm.description) return showMessage('Isi keterangan dan nominal dengan benar!');
    
    const qtyMultiplier = getQtyMultiplier(expenseForm.qty);
    const totalAmount = baseAmount * qtyMultiplier;
    const finalQty = formatQtyWithUnit(expenseForm.qty, expenseForm.description);

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
    setActiveForm(null);
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
    setActiveForm(null);
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
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">Perhitungan Pengeluaran</h2>
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
            P
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Perhitungan Pengeluaran</span>
        </div>

        {/* User Account Info Info Profile Section */}
        <div className="p-4 mx-4 mt-4 bg-slate-850/50 bg-slate-800 border border-slate-800 rounded-xl">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 leading-none">PENGGUNA AKTIF</p>
          <p className="text-xs font-semibold text-white truncate" title={userEmail}>
            {userEmail}
          </p>
        </div>

        {/* Sidebar Nav buttons */}
        <nav className="flex-1 px-4 space-y-2 mt-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-extrabold transition-all text-left cursor-pointer overflow-hidden ${
              activeTab === 'dashboard' 
                ? 'text-white' 
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            {activeTab === 'dashboard' && (
              <motion.div
                layoutId="active-sidebar-pill"
                className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 rounded-2xl shadow-md shadow-indigo-600/30 border border-indigo-400/20"
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              />
            )}
            <PieChart size={18} className={`relative z-10 ${activeTab === 'dashboard' ? 'text-white' : 'text-slate-400'}`} />
            <span className="relative z-10">Dashboard</span>
          </button>
          
          <button
            onClick={() => setActiveTab('record')}
            className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-extrabold transition-all text-left cursor-pointer overflow-hidden ${
              activeTab === 'record' 
                ? 'text-white' 
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            {activeTab === 'record' && (
              <motion.div
                layoutId="active-sidebar-pill"
                className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 rounded-2xl shadow-md shadow-indigo-600/30 border border-indigo-400/20"
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              />
            )}
            <PlusCircle size={18} className={`relative z-10 ${activeTab === 'record' ? 'text-white' : 'text-slate-400'}`} />
            <span className="relative z-10">Catat</span>
          </button>
          
          <button
            onClick={() => setActiveTab('history')}
            className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-extrabold transition-all text-left cursor-pointer overflow-hidden ${
              activeTab === 'history' 
                ? 'text-white' 
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            {activeTab === 'history' && (
              <motion.div
                layoutId="active-sidebar-pill"
                className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 rounded-2xl shadow-md shadow-indigo-600/30 border border-indigo-400/20"
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              />
            )}
            <Eye size={18} className={`relative z-10 ${activeTab === 'history' ? 'text-white' : 'text-slate-400'}`} />
            <span className="relative z-10">Preview</span>
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
            P
          </div>
          <span className="font-bold text-base tracking-tight">Perhitungan Pengeluaran</span>
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
          {/* INITIAL LOADING STATE SKELETON */}
          {isSyncing && transactions.length === 0 ? (
            <div className="space-y-6 w-full animate-pulse">
              <div className="h-32 md:h-40 bg-slate-200 rounded-3xl w-full"></div>
              <div className="h-80 md:h-96 bg-slate-200 rounded-3xl w-full mt-6"></div>
              <div className="h-40 bg-slate-200 rounded-3xl w-full mt-6"></div>
            </div>
          ) : (
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
              {/* TOTAL EXPENSES STATS CARD */}
              <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-700/50 relative group z-10">
                <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <TrendingDown size={140} />
                  </div>
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-slate-300">
                      <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                        <TrendingDown size={20} />
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-300">Total Pengeluaran Bulan Ini</p>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-1">
                      {formatRupiah(displayedExpense)}
                    </h3>

                    {/* FILTER STATUS BADGE */}
                    {selectedTotalCategories.length < EXPENSE_CATEGORIES.length && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-300 font-bold bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-xl w-fit">
                        <span>Filter aktif: {selectedTotalCategories.length} dari {EXPENSE_CATEGORIES.length} kategori</span>
                        <button
                          type="button"
                          onClick={() => setSelectedTotalCategories(EXPENSE_CATEGORIES.map(c => c.id))}
                          className="text-white hover:underline text-[10px] ml-1 bg-white/20 px-1.5 py-0.5 rounded-md cursor-pointer font-bold"
                        >
                          Reset
                        </button>
                      </div>
                    )}

                    {/* ACTION BUTTONS: TIPS & FILTER KATEGORI */}
                    <div className="relative mt-3 flex flex-wrap items-center gap-2">
                      {/* BUTTON 1: TIPS KEUANGAN */}
                      <div className="relative">
                        <button
                          onClick={() => {
                            setShowTips(!showTips);
                            if (showCategorySettings) setShowCategorySettings(false);
                          }}
                          className="flex items-center gap-1.5 text-[11px] text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1.5 rounded-full transition-all cursor-pointer font-bold border border-indigo-500/20"
                        >
                          <Lightbulb size={12} className={showTips ? "text-amber-400" : ""} />
                          <span>Tips Keuangan</span>
                          <ChevronDown size={12} className={`transition-transform duration-300 ${showTips ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {showTips && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowTips(false)} />
                              <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="absolute left-0 top-full mt-2 w-72 md:w-80 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200 p-4 z-50 origin-top-left"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="p-2 bg-amber-100 text-amber-600 rounded-xl shrink-0">
                                    <Lightbulb size={18} />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-1">Tips Menghemat</h4>
                                    <p className="text-[11px] leading-relaxed text-slate-600 font-medium">
                                      Pantau terus pengeluaran harian Anda. Pastikan sisa anggaran bulan ini cukup untuk menutupi kebutuhan wajib seperti servis motor dan tagihan bulanan. Jangan lupa sisihkan setidaknya 20% untuk tabungan!
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* BUTTON 2: ATUR KATEGORI TOTAL (ICON KECIL DENGAN COMBOBOX) */}
                      <div className="relative">
                        <button
                          onClick={() => {
                            setShowCategorySettings(!showCategorySettings);
                            if (showTips) setShowTips(false);
                          }}
                          className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-full transition-all cursor-pointer font-bold border ${
                            selectedTotalCategories.length < EXPENSE_CATEGORIES.length
                              ? 'text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40'
                              : 'text-teal-300 hover:text-teal-200 bg-teal-500/10 hover:bg-teal-500/20 border-teal-500/20'
                          }`}
                          title="Pilih kategori yang akan dihitung dan ditampilkan di total pengeluaran"
                        >
                          <SlidersHorizontal size={12} className={showCategorySettings ? "text-teal-400" : ""} />
                          <span>Kategori ({selectedTotalCategories.length}/{EXPENSE_CATEGORIES.length})</span>
                          <ChevronDown size={12} className={`transition-transform duration-300 ${showCategorySettings ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {showCategorySettings && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowCategorySettings(false)} />
                              <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="absolute left-0 top-full mt-2 w-[calc(100vw-3rem)] max-w-sm sm:w-96 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 origin-top-left"
                              >
                                {/* HEADER */}
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-teal-100 text-teal-700 rounded-xl">
                                      <SlidersHorizontal size={15} />
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Pilih Kategori</h4>
                                      <p className="text-[10px] text-slate-500 font-medium">Hanya kategori terpilih yang dihitung ke total</p>
                                    </div>
                                  </div>
                                  <button 
                                    type="button" 
                                    onClick={() => setShowCategorySettings(false)}
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                  >
                                    <X size={15} />
                                  </button>
                                </div>

                                {/* QUICK ACTIONS */}
                                <div className="flex items-center justify-between gap-2 mb-2.5 px-0.5">
                                  <span className="text-[11px] font-bold text-slate-500">
                                    {selectedTotalCategories.length} dari {EXPENSE_CATEGORIES.length} dipilih
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedTotalCategories(EXPENSE_CATEGORIES.map(c => c.id))}
                                      className="text-[10px] font-extrabold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                    >
                                      Pilih Semua
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedTotalCategories([])}
                                      className="text-[10px] font-extrabold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                    >
                                      Hapus Semua
                                    </button>
                                  </div>
                                </div>

                                {/* CATEGORIES LIST */}
                                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                                  {EXPENSE_CATEGORIES.map(cat => {
                                    const isSelected = selectedTotalCategories.includes(cat.id);
                                    const catAmount = rawCatTotals[cat.id] || 0;
                                    return (
                                      <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedTotalCategories(prev =>
                                            prev.includes(cat.id)
                                              ? prev.filter(id => id !== cat.id)
                                              : [...prev, cat.id]
                                          );
                                        }}
                                        className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                          isSelected
                                            ? 'bg-teal-50/70 border-teal-200 text-slate-800 shadow-2xs'
                                            : 'bg-slate-50/50 border-slate-200/70 text-slate-400 hover:bg-slate-100/60'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                                            isSelected ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300 bg-white'
                                          }`}>
                                            {isSelected && <Check size={13} strokeWidth={3} />}
                                          </div>
                                          <span className="text-base">{cat.icon}</span>
                                          <span className={`text-xs font-bold truncate ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>
                                            {cat.label}
                                          </span>
                                        </div>
                                        <span className={`text-xs font-black shrink-0 ${isSelected ? 'text-teal-700' : 'text-slate-400'}`}>
                                          {formatRupiah(catAmount)}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* FOOTER */}
                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-slate-500">Total Terhitung:</span>
                                  <span className="text-sm font-black text-slate-900">{formatRupiah(displayedExpense)}</span>
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2.5 w-full md:w-auto bg-white/10 p-2 rounded-2xl backdrop-blur-md border border-white/10">
                    <select 
                      value={expenseFilterMonth} 
                      onChange={(e) => setExpenseFilterMonth(e.target.value)}
                      className="bg-white/10 text-white text-xs rounded-xl p-2.5 outline-none font-extrabold cursor-pointer hover:bg-white/20 transition-colors w-full md:w-auto"
                    >
                      <option value="all" className="text-slate-900">Semua Bulan</option>
                      <option value="1" className="text-slate-900">Januari</option>
                      <option value="2" className="text-slate-900">Februari</option>
                      <option value="3" className="text-slate-900">Maret</option>
                      <option value="4" className="text-slate-900">April</option>
                      <option value="5" className="text-slate-900">Mei</option>
                      <option value="6" className="text-slate-900">Juni</option>
                      <option value="7" className="text-slate-900">Juli</option>
                      <option value="8" className="text-slate-900">Agustus</option>
                      <option value="9" className="text-slate-900">September</option>
                      <option value="10" className="text-slate-900">Oktober</option>
                      <option value="11" className="text-slate-900">November</option>
                      <option value="12" className="text-slate-900">Desember</option>
                    </select>
                    <select 
                      value={expenseFilterYear} 
                      onChange={(e) => setExpenseFilterYear(e.target.value)}
                      className="bg-white/10 text-white text-xs rounded-xl p-2.5 outline-none font-extrabold cursor-pointer hover:bg-white/20 transition-colors w-full md:w-auto"
                    >
                      <option value="all" className="text-slate-900">Semua Tahun</option>
                      {availableYears.map(year => (
                        <option key={year} value={year} className="text-slate-900">{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* DIAGRAM BATANG PENGELUARAN PER BULAN (MODERN RECHARTS) */}
              <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <BarChart2 size={20} className="text-rose-500" /> Grafik Pengeluaran
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      Visualisasi pengeluaran {expenseFilterYear === 'all' ? 'semua tahun' : `tahun ${expenseFilterYear}`}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 self-start sm:self-auto">
                    <select 
                      value={chartType} 
                      onChange={(e) => setChartType(e.target.value)}
                      className="bg-slate-50 text-slate-700 font-bold text-xs rounded-xl px-3 py-2 border border-slate-200 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <option value="bar">Diagram Batang</option>
                      <option value="pie">Diagram Lingkaran</option>
                      <option value="line">Diagram Garis</option>
                      <option value="area">Diagram Area</option>
                    </select>
                  </div>
                </div>

                {/* RECHARTS CANVAS OR FALLBACK */}
                <div className="h-64 sm:h-72 w-full pt-2">
                  {chartType === 'bar' ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyExpenseData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="month" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tickFormatter={formatYAxis}
                          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                        />
                        <Tooltip 
                          cursor={{ fill: 'rgba(244, 63, 94, 0.05)', radius: 12 }} 
                          content={<CustomChartTooltip />} 
                        />
                        <Bar dataKey="amount" radius={[10, 10, 0, 0]} maxBarSize={44}>
                          {monthlyExpenseData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={
                                entry.isCurrentMonth && entry.amount > 0 
                                  ? '#e11d48' 
                                  : entry.isMaxMonth 
                                  ? '#f43f5e' 
                                  : entry.amount > 0 
                                  ? '#fb7185' 
                                  : '#e2e8f0'
                              } 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : chartType === 'pie' ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <Tooltip content={<CustomChartTooltip />} />
                        <Pie
                          data={monthlyExpenseData.filter(d => d.amount > 0)}
                          dataKey="amount"
                          nameKey="month"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          stroke="none"
                        >
                          {monthlyExpenseData.filter(d => d.amount > 0).map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.isCurrentMonth ? '#e11d48' : entry.isMaxMonth ? '#f43f5e' : `hsl(340, ${70 - (index * 5)}%, ${65 + (index * 2)}%)`}
                            />
                          ))}
                        </Pie>
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : chartType === 'line' ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyExpenseData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="month" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tickFormatter={formatYAxis}
                          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                        />
                        <Tooltip content={<CustomChartTooltip />} />
                        <Line type="monotone" dataKey="amount" stroke="#e11d48" strokeWidth={3} dot={{ r: 4, fill: '#e11d48', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, fill: '#be123c', stroke: '#fff', strokeWidth: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyExpenseData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="month" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tickFormatter={formatYAxis}
                          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                        />
                        <Tooltip content={<CustomChartTooltip />} />
                        <Area type="monotone" dataKey="amount" stroke="#e11d48" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" activeDot={{ r: 6, fill: '#be123c', stroke: '#fff', strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* BOTTOM METRICS HIGHLIGHT */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                  <div 
                    onClick={() => setShowYearTotalDetails(true)}
                    className="bg-rose-50/70 hover:bg-rose-100/90 p-3 rounded-2xl border border-rose-200/80 hover:border-rose-300 transition-all cursor-pointer flex flex-col group relative shadow-2xs active:scale-[0.98]"
                    title="Klik untuk melihat informasi asal-usul & rincian pengeluaran tahun ini"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider flex items-center gap-1">
                        Total Tahun Ini <Info size={12} className="text-rose-400 group-hover:scale-110 transition-transform" />
                      </span>
                      <span className="text-[10px] font-extrabold text-rose-600 bg-rose-200/60 group-hover:bg-rose-500 group-hover:text-white px-1.5 py-0.5 rounded-md transition-all">
                        Rincian →
                      </span>
                    </div>
                    <span className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5">
                      {formatRupiah(chartStats.totalYearExpense)}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Rata-rata / Bulan</span>
                    <span className="text-sm sm:text-base font-extrabold text-slate-800 mt-0.5">
                      {formatRupiah(chartStats.avgMonthlyExpense)}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Bulan Tertinggi</span>
                    <span className="text-sm sm:text-base font-extrabold text-rose-600 mt-0.5 truncate">
                      {chartStats.maxMonthName} ({formatRupiah(chartStats.maxMonthAmount)})
                    </span>
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

            </motion.div>
          )}

          {/* TAB 2: DETAILED RECORD/TRANSACTIONS MENU */}
          {activeTab === 'record' && (
            <motion.div 
              key="record"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="mb-6">
                  <h3 className="text-xl font-extrabold text-slate-800">Pilih Menu Pencatatan</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Klik pada salah satu menu di bawah untuk membuka formulir popup interaktif.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => setActiveForm('expense')} 
                    className="p-6 rounded-3xl border-2 border-rose-100 hover:border-rose-300 bg-linear-to-br from-rose-50/50 to-white hover:bg-rose-50 text-left transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer group flex flex-col justify-between min-h-[150px]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-3.5 bg-rose-500 text-white rounded-2xl group-hover:scale-110 transition-transform">
                        <MinusCircle size={26} />
                      </div>
                      <span className="text-xs font-black text-rose-600 bg-rose-100 px-3 py-1 rounded-full uppercase tracking-wider">
                        Pengeluaran
                      </span>
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900 mt-4 group-hover:text-rose-600 transition-colors">Catat Pengeluaran</h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">Belanja harian, konsumsi, transportasi & tagihan</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setActiveForm('motor')} 
                    className="p-6 rounded-3xl border-2 border-teal-100 hover:border-teal-300 bg-linear-to-br from-teal-50/50 to-white hover:bg-teal-50 text-left transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer group flex flex-col justify-between min-h-[150px]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-3.5 bg-teal-600 text-white rounded-2xl group-hover:scale-110 transition-transform">
                        <Wrench size={26} />
                      </div>
                      <span className="text-xs font-black text-teal-600 bg-teal-100 px-3 py-1 rounded-full uppercase tracking-wider">
                        Oli & Servis
                      </span>
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900 mt-4 group-hover:text-teal-600 transition-colors">Servis Motor</h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">Ganti oli motor berkala & perbaikan sparepart</p>
                    </div>
                  </button>
                </div>
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
                      <option value="all">Semua Kategori</option>
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
                                {catDetails ? (
                                  <span className="text-[9px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-lg border border-rose-200 uppercase tracking-wider">
                                    {catDetails.label}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200 uppercase tracking-wider">
                                    Pengeluaran
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-right font-black text-base md:text-lg whitespace-nowrap text-rose-500">
                              − {formatRupiah(tx.amount)}
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
          )}
      </main>
    </div>

      {/* LIQUID BOTTOM BAR (FLOATING DOCK FOR MOBILE & TABLET) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md md:hidden">
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-700/70 shadow-[0_16px_40px_rgba(15,23,42,0.5)] rounded-3xl p-1.5 flex justify-between items-center relative overflow-hidden">
          
          {/* LIQUID AMBIENT BACKGROUND GLOW */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-rose-500/15 pointer-events-none rounded-3xl blur-md" />

          {/* TAB 1: DASHBOARD */}
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`relative flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-300 cursor-pointer select-none ${
              activeTab === 'dashboard' ? 'text-white font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'dashboard' && (
              <motion.div 
                layoutId="liquid-bar-pill" 
                className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 rounded-2xl shadow-md shadow-indigo-500/40 border border-indigo-400/30" 
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              />
            )}
            <motion.div 
              animate={{ scale: activeTab === 'dashboard' ? 1.15 : 1, y: activeTab === 'dashboard' ? -1 : 0 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              className="relative z-10 flex items-center justify-center"
            >
              <PieChart size={20} className={activeTab === 'dashboard' ? 'stroke-[2.5px] drop-shadow-xs' : 'stroke-2'} />
            </motion.div>
            <span className="relative z-10 text-[11px] mt-0.5 font-extrabold tracking-tight">
              Dashboard
            </span>
            {activeTab === 'dashboard' && (
              <motion.div 
                layoutId="liquid-bar-droplet" 
                className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-1 bg-indigo-200 rounded-full blur-[0.5px] shadow-xs shadow-indigo-200" 
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              />
            )}
          </button>

          {/* TAB 2: CATAT */}
          <button 
            onClick={() => setActiveTab('record')}
            className={`relative flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-300 cursor-pointer select-none ${
              activeTab === 'record' ? 'text-white font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'record' && (
              <motion.div 
                layoutId="liquid-bar-pill" 
                className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 rounded-2xl shadow-md shadow-indigo-500/40 border border-indigo-400/30" 
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              />
            )}
            <motion.div 
              animate={{ scale: activeTab === 'record' ? 1.15 : 1, y: activeTab === 'record' ? -1 : 0 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              className="relative z-10 flex items-center justify-center"
            >
              <PlusCircle size={20} className={activeTab === 'record' ? 'stroke-[2.5px] drop-shadow-xs' : 'stroke-2'} />
            </motion.div>
            <span className="relative z-10 text-[11px] mt-0.5 font-extrabold tracking-tight">
              Catat
            </span>
            {activeTab === 'record' && (
              <motion.div 
                layoutId="liquid-bar-droplet" 
                className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-1 bg-indigo-200 rounded-full blur-[0.5px] shadow-xs shadow-indigo-200" 
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              />
            )}
          </button>

          {/* TAB 3: PREVIEW */}
          <button 
            onClick={() => setActiveTab('history')}
            className={`relative flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-300 cursor-pointer select-none ${
              activeTab === 'history' ? 'text-white font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'history' && (
              <motion.div 
                layoutId="liquid-bar-pill" 
                className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 rounded-2xl shadow-md shadow-indigo-500/40 border border-indigo-400/30" 
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              />
            )}
            <motion.div 
              animate={{ scale: activeTab === 'history' ? 1.15 : 1, y: activeTab === 'history' ? -1 : 0 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              className="relative z-10 flex items-center justify-center"
            >
              <Eye size={20} className={activeTab === 'history' ? 'stroke-[2.5px] drop-shadow-xs' : 'stroke-2'} />
            </motion.div>
            <span className="relative z-10 text-[11px] mt-0.5 font-extrabold tracking-tight">
              Preview
            </span>
            {activeTab === 'history' && (
              <motion.div 
                layoutId="liquid-bar-droplet" 
                className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-1 bg-indigo-200 rounded-full blur-[0.5px] shadow-xs shadow-indigo-200" 
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
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

      {/* POPUP MODAL FOR RECORDING TRANSACTIONS */}
      <AnimatePresence>
        {activeForm && (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[250] p-4 sm:p-6 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setActiveForm(null);
            }}
          >
            <motion.div 
              key="active-recording-modal"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              style={activeForm === 'motor' ? { 
                backgroundImage: "linear-gradient(to bottom, rgba(255,255,255,0.88), rgba(255,255,255,0.98)), url('https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=1200')", 
                backgroundSize: 'cover', 
                backgroundPosition: 'center' 
              } : undefined}
              className={`relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border-2 overflow-hidden my-auto max-h-[90vh] overflow-y-auto ${
                activeForm === 'expense' ? 'border-rose-100' : 'border-teal-100'
              }`}
            >
              {/* HEADER WITH TITLE & SMALL RED CIRCULAR X BUTTON */}
              <div className={`p-4 px-6 flex items-center justify-between text-white font-extrabold sticky top-0 z-20 ${
                activeForm === 'expense' ? 'bg-rose-500' : 'bg-teal-500'
              }`}>
                <span className="flex items-center gap-2 tracking-wide uppercase text-sm pr-4">
                  {activeForm === 'expense' && <><MinusCircle size={20} /> Formulir Catat Pengeluaran</>}
                  {activeForm === 'motor' && <><Wrench size={20} /> Formulir Servis Motor</>}
                </span>

                {/* SMALL RED CIRCULAR X BUTTON AT TOP RIGHT */}
                <button 
                  type="button" 
                  onClick={() => setActiveForm(null)}
                  className="w-7 h-7 bg-red-500 hover:bg-red-600 active:scale-90 text-white rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer flex-shrink-0 border border-white/20"
                  title="Tutup Formulir"
                >
                  <X size={15} strokeWidth={3} />
                </button>
              </div>

              {/* EXPENSE FORM */}
              {activeForm === 'expense' && (
                <form onSubmit={handleAddExpense} className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1">KETERANGAN PENGELUARAN</label>
                      <input 
                        type="text" 
                        value={expenseForm.description || ''} 
                        onChange={handleExpenseDescriptionChange} 
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
                      <span>Perhitungan Total:</span>
                      <span>
                        {formatRupiah(unformatNumber(expenseForm.amount))} &times; {getQtyMultiplier(expenseForm.qty)} = 
                        <span className="ml-1 text-sm font-black text-rose-600">{formatRupiah(unformatNumber(expenseForm.amount) * getQtyMultiplier(expenseForm.qty))}</span>
                      </span>
                    </div>
                  )}

                  <button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-500/15 cursor-pointer mt-4 hover:scale-[0.99] active:scale-95 transition-all text-base">
                    <Check size={18} /> Simpan Pengeluaran
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
                      <label className="block text-xs font-black text-slate-500 tracking-wider mb-1 uppercase">BIAYA JASA & PRODUK (Rp)</label>
                      <input 
                        type="text" 
                        inputMode="numeric" 
                        value={motorForm.amount || ''} 
                        onChange={(e) => setMotorForm({ ...motorForm, amount: formatInputNumber(e.target.value) })} 
                        className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 outline-none transition-all font-extrabold text-base bg-slate-50 focus:bg-white text-right tracking-wide" 
                      />
                    </div>
                    
                    <button type="submit" className="w-full bg-teal-500 hover:bg-teal-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-teal-500/15 cursor-pointer mt-4 hover:scale-[0.99] active:scale-95 transition-all text-base">
                      <Wrench size={18} /> Simpan Servis
                    </button>
                  </form>
                </div>
              )}
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

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setEditingTx(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl cursor-pointer transition-colors">Batal</button>
                  <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl cursor-pointer transition-all shadow-md">Simpan Perubahan</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL POPUP ASAL-USUL TOTAL PENGELUARAN TAHUN INI */}
      <AnimatePresence>
        {showYearTotalDetails && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[250] p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col"
            >
              {/* MODAL HEADER */}
              <div className="p-4 px-6 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-20 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold">
                    <BarChart2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                      Asal-usul Total Pengeluaran
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {yearExpenseDetails.yearLabel} • Rincian Sumber & Kategori
                    </p>
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={() => setShowYearTotalDetails(false)}
                  className="w-8 h-8 bg-red-500 hover:bg-red-600 active:scale-90 text-white rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer flex-shrink-0 border border-white/20"
                  title="Tutup"
                >
                  <X size={16} strokeWidth={3} />
                </button>
              </div>

              {/* MODAL BODY (SCROLLABLE) */}
              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar">
                
                {/* HERO TOTAL BANNER */}
                <div className="bg-linear-to-br from-rose-500 via-rose-600 to-pink-600 text-white rounded-2xl p-5 shadow-lg shadow-rose-500/20 relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 opacity-15 pointer-events-none text-white">
                    <BarChart2 size={140} />
                  </div>
                  <span className="text-[10px] font-black tracking-widest uppercase bg-white/20 text-white px-2.5 py-1 rounded-full inline-block backdrop-blur-xs">
                    RANGKUMAN TOTAL PENGELUARAN
                  </span>
                  <div className="mt-2 text-2xl sm:text-3xl font-black tracking-tight">
                    {formatRupiah(yearExpenseDetails.totalAmount)}
                  </div>
                  <div className="mt-1 text-xs text-rose-100 font-medium flex items-center gap-2">
                    <span>📊 {yearExpenseDetails.totalCount} x Transaksi Tercatat</span>
                    <span>•</span>
                    <span>Rata-rata {formatRupiah(chartStats.avgMonthlyExpense)} / bulan</span>
                  </div>
                </div>

                {/* BREAKDOWN SUMBER DANA / METODE */}
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Wallet size={14} className="text-indigo-500" /> Asal Sumber Pembayaran
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
                        <Wallet size={15} className="text-emerald-500" />
                        <span>Tunai / Dompet</span>
                      </div>
                      <div className="text-sm sm:text-base font-black text-slate-800">
                        {formatRupiah(yearExpenseDetails.cashAmount)}
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                        {yearExpenseDetails.cashCount} transaksi
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
                        <CreditCard size={15} className="text-blue-500" />
                        <span>Bank / E-Wallet</span>
                      </div>
                      <div className="text-sm sm:text-base font-black text-slate-800">
                        {formatRupiah(yearExpenseDetails.bankAmount)}
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                        {yearExpenseDetails.bankCount} transaksi
                      </span>
                    </div>
                  </div>
                </div>

                {/* BREAKDOWN PER KATEGORI */}
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <PieChart size={14} className="text-rose-500" /> Asal Kategori Terboros
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {yearExpenseDetails.categoryBreakdown.length} Kategori Aktif
                    </span>
                  </h4>

                  {yearExpenseDetails.categoryBreakdown.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-medium">
                      Belum ada transaksi pengeluaran pada periode ini.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {yearExpenseDetails.categoryBreakdown.map(cat => (
                        <div key={`year-cat-${cat.id}`} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{cat.icon}</span>
                              <span className="text-slate-800 font-extrabold">{cat.label}</span>
                              <span className="text-[10px] text-slate-400 font-semibold">({cat.count} tx)</span>
                            </div>
                            <div className="text-right">
                              <span className="text-slate-900 font-black">{formatRupiah(cat.amount)}</span>
                              <span className="ml-1.5 text-[10px] text-rose-500 bg-rose-50 font-black px-1.5 py-0.5 rounded-md border border-rose-100">
                                {cat.percentage}%
                              </span>
                            </div>
                          </div>
                          {/* PROGRESS BAR TRACK */}
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-rose-500 rounded-full transition-all duration-500" 
                              style={{ width: `${Math.min(100, Math.max(2, cat.percentage))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* BREAKDOWN PER BULAN */}
                {yearExpenseDetails.monthBreakdown.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2.5 flex items-center gap-1.5">
                      <Calendar size={14} className="text-blue-500" /> Rincian Pengeluaran per Bulan
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {yearExpenseDetails.monthBreakdown.map((m, idx) => (
                        <div key={`m-detail-${idx}`} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase">{m.name}</span>
                          <span className="text-xs font-extrabold text-slate-800 mt-0.5">{formatRupiah(m.amount)}</span>
                          <span className="text-[9px] text-rose-500 font-bold mt-0.5">{m.percentage}% dari total ({m.count} tx)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TOP 5 TRANSAKSI TERBESAR */}
                {yearExpenseDetails.topTransactions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2.5 flex items-center gap-1.5">
                      <TrendingDown size={14} className="text-rose-500" /> 5 Transaksi Pengeluaran Terbesar
                    </h4>
                    <div className="space-y-2">
                      {yearExpenseDetails.topTransactions.map((tx, idx) => {
                        const catObj = EXPENSE_CATEGORIES.find(c => c.id === tx.kategori);
                        return (
                          <div key={`top-tx-${tx.id || idx}`} className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-600 font-black text-xs flex items-center justify-center shrink-0">
                                #{idx + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-extrabold text-slate-800 truncate">{tx.description || 'Pengeluaran'}</p>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  {tx.date ? displayDate(tx.date) : '-'} • {catObj?.label || 'Lainnya'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-rose-600">{formatRupiah(tx.amount)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

              {/* MODAL FOOTER */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowYearTotalDetails(false)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  Tutup Rincian
                </button>
              </div>
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
