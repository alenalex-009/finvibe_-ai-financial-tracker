/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Sparkles, 
  PieChart as PieChartIcon,
  List,
  ChevronRight,
  AlertCircle,
  Lightbulb,
  Target,
  MessageCircle,
  X,
  Send,
  User as UserIcon,
  Bot,
  LogOut,
  LogIn,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title 
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import Markdown from 'react-markdown';
import { Transaction, TransactionType, CATEGORIES, CURRENCY_SYMBOL, ChatMessage, User } from './types';
import { getFinancialInsights, categorizeDescription, getFinancialAdvice } from './services/geminiService';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budget, setBudget] = useState<number>(50000);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('');
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
  const [isInvestmentLoading, setIsInvestmentLoading] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const [investmentAdvice, setInvestmentAdvice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'profile'>('dashboard');
  
  // Chatbot state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (e) {
      console.error("Auth check failed", e);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [tRes, bRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/budget')
      ]);
      if (tRes.ok) setTransactions(await tRes.json());
      if (bRes.ok) {
        const bData = await bRes.json();
        setBudget(bData.amount);
      }
    } catch (e) {
      console.error("Fetch data failed", e);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        alert("Authentication failed");
      }
    } catch (e) {
      console.error("Auth failed", e);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setTransactions([]);
    setBudget(50000);
    setActiveTab('dashboard');
  };

  const updateBudget = async (newBudget: number) => {
    setBudget(newBudget);
    await fetch('/api/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: newBudget })
    });
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const updateRiskProfile = async (profile: 'low' | 'medium' | 'high') => {
    if (!user) return;
    setUser({ ...user, riskProfile: profile });
    await fetch('/api/auth/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ riskProfile: profile })
    });
  };

  const rule503020Stats = useMemo(() => {
    const stats = { Needs: 0, Wants: 0, Savings: 0 };
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    transactions
      .filter(t => isWithinInterval(new Date(t.date), { start, end }))
      .forEach(t => {
        if (t.type === 'expense') {
          if (CATEGORIES.rule503020.Needs.includes(t.category)) stats.Needs += t.amount;
          else if (CATEGORIES.rule503020.Wants.includes(t.category)) stats.Wants += t.amount;
          else if (CATEGORIES.rule503020.Savings.includes(t.category)) stats.Savings += t.amount;
        }
      });

    const totalIncome = transactions
      .filter(t => t.type === 'income' && isWithinInterval(new Date(t.date), { start, end }))
      .reduce((sum, t) => sum + t.amount, 0);

    return { stats, totalIncome };
  }, [transactions]);

  const totals = useMemo(() => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [transactions]);

  const currentMonthExpenses = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    
    return transactions
      .filter(t => t.type === 'expense' && isWithinInterval(new Date(t.date), { start, end }))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const budgetProgress = Math.min((currentMonthExpenses / budget) * 100, 100);
  const isOverBudget = currentMonthExpenses > budget;

  const chartData = useMemo(() => {
    const expenseByCategory: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
      });

    return {
      labels: Object.keys(expenseByCategory),
      datasets: [
        {
          data: Object.values(expenseByCategory),
          backgroundColor: [
            '#FF3D00', '#2979FF', '#00E676', '#FFD600', '#AA00FF', '#00B8D4', '#64DD17', '#FF6D00'
          ],
          borderWidth: 0,
        },
      ],
    };
  }, [transactions]);

  const barData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return format(d, 'yyyy-MM-dd');
    }).reverse();

    const dailyExpenses = last7Days.map(date => {
      return transactions
        .filter(t => t.type === 'expense' && t.date === date)
        .reduce((sum, t) => sum + t.amount, 0);
    });

    return {
      labels: last7Days.map(d => format(new Date(d), 'EEE')),
      datasets: [
        {
          label: 'Daily Expenses',
          data: dailyExpenses,
          backgroundColor: '#2979FF',
          borderRadius: 8,
        },
      ],
    };
  }, [transactions]);

  const incomeChartData = useMemo(() => {
    const incomeByCategory: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'income')
      .forEach(t => {
        incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
      });

    return {
      labels: Object.keys(incomeByCategory),
      datasets: [
        {
          data: Object.values(incomeByCategory),
          backgroundColor: [
            '#00E676', '#00B8D4', '#64DD17', '#FFD600', '#2979FF', '#AA00FF', '#FF3D00', '#FF6D00'
          ],
          borderWidth: 0,
        },
      ],
    };
  }, [transactions]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !category) return;

    const transactionData = {
      amount: parseFloat(amount),
      description,
      type,
      category,
      date: format(new Date(), 'yyyy-MM-dd'),
    };

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData)
      });
      if (res.ok) {
        const newTransaction = await res.json();
        setTransactions([newTransaction, ...transactions]);
        setAmount('');
        setDescription('');
        setCategory('');
      }
    } catch (e) {
      console.error("Add transaction failed", e);
    }
  };

  const handleAnalyze = async () => {
    if (transactions.length === 0) return;
    setIsAIAnalyzing(true);
    const result = await getFinancialInsights(transactions);
    setInsights(result);
    setIsAIAnalyzing(false);
  };

  const handleGetInvestmentAdvice = async () => {
    if (!user) return;
    setIsInvestmentLoading(true);
    const advice = await getFinancialAdvice(`Give me specific investment suggestions for a ${user.riskProfile} risk profile. Focus on student-friendly options in India.`, transactions, user);
    setInvestmentAdvice(advice);
    setIsInvestmentLoading(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: chatInput,
      timestamp: Date.now(),
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    const history = chatMessages.map(m => ({ role: m.role, text: m.text }));
    const advice = await getFinancialAdvice(chatInput, transactions, user);

    const modelMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'model',
      text: advice || "I'm not sure how to answer that. Let's talk about marketing!",
      timestamp: Date.now(),
    };

    setChatMessages(prev => [...prev, modelMsg]);
    setIsChatLoading(false);
  };

  const deleteTransaction = async (id: string) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTransactions(transactions.filter(t => t.id !== id));
      }
    } catch (e) {
      console.error("Delete transaction failed", e);
    }
  };

  const suggestCategory = async () => {
    if (!description) return;
    const suggested = await categorizeDescription(description);
    if (suggested) {
      const allCats = [...CATEGORIES.income, ...CATEGORIES.expense];
      if (allCats.includes(suggested)) {
        setCategory(suggested);
      } else {
        setCategory('Other');
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-30 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
              <Wallet size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-brand-dark">FinVibe</h1>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <button 
                onClick={() => setActiveTab('profile')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-neutral-50 transition-colors"
              >
                <div className="w-8 h-8 bg-brand-accent/10 text-brand-accent rounded-full flex items-center justify-center">
                  <UserIcon size={18} />
                </div>
                <span className="text-sm font-bold text-brand-dark hidden sm:inline">{user.name}</span>
              </button>
            )}
            <button 
              onClick={handleAnalyze}
              disabled={isAIAnalyzing || transactions.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-brand-dark text-white rounded-full text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              {isAIAnalyzing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles size={16} className="text-brand-secondary" />
              )}
              AI Insights
            </button>
          </div>
        </div>
      </header>

      {!user ? (
        <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl border border-neutral-200 shadow-xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/20 mx-auto mb-4">
              <Wallet size={32} />
            </div>
            <h2 className="text-2xl font-bold text-brand-dark">{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
            <p className="text-neutral-500 text-sm">Manage your finances with AI intelligence</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-400 uppercase">Full Name</label>
                <input 
                  type="text" 
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-brand-accent outline-none"
                  placeholder="John Doe"
                  required
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase">Email Address</label>
              <input 
                type="email" 
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-brand-accent outline-none"
                placeholder="john@example.com"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase">Password</label>
              <input 
                type="password" 
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-brand-accent outline-none"
                placeholder="••••••••"
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-brand-dark text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {authMode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
              {authMode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-sm font-bold text-brand-accent hover:underline"
            >
              {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      ) : (
        <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-gradient p-6 rounded-3xl text-white shadow-xl shadow-brand-primary/20"
          >
            <div className="flex justify-between items-start mb-4">
              <p className="text-white/80 text-sm font-medium">Total Balance</p>
              <Wallet size={20} className="text-white/60" />
            </div>
            <h2 className="text-3xl font-bold">{CURRENCY_SYMBOL}{totals.balance.toLocaleString('en-IN')}</h2>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <p className="text-neutral-500 text-sm font-medium">Income</p>
              <TrendingUp size={20} className="text-brand-secondary" />
            </div>
            <h2 className="text-3xl font-bold text-brand-secondary">+{CURRENCY_SYMBOL}{totals.income.toLocaleString('en-IN')}</h2>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <p className="text-neutral-500 text-sm font-medium">Expenses</p>
              <TrendingDown size={20} className="text-brand-primary" />
            </div>
            <h2 className="text-3xl font-bold text-brand-primary">-{CURRENCY_SYMBOL}{totals.expenses.toLocaleString('en-IN')}</h2>
          </motion.div>
        </div>

        {/* Budget Progress Section */}
        <section className="bg-white rounded-3xl border border-neutral-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Target size={20} className="text-brand-accent" />
              <h3 className="text-lg font-bold">Monthly Budget</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-400 uppercase">Set Budget:</span>
              <input 
                type="number" 
                value={budget}
                onChange={(e) => updateBudget(parseFloat(e.target.value) || 0)}
                className="w-24 px-2 py-1 bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-bold outline-none focus:ring-1 focus:ring-brand-accent"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span className={isOverBudget ? 'text-rose-500' : 'text-neutral-600'}>
                Spent: {CURRENCY_SYMBOL}{currentMonthExpenses.toLocaleString('en-IN')}
              </span>
              <span className="text-neutral-400">
                Budget: {CURRENCY_SYMBOL}{budget.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="h-4 bg-neutral-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${budgetProgress}%` }}
                className={`h-full transition-colors duration-500 ${isOverBudget ? 'bg-rose-500' : budgetProgress > 80 ? 'bg-amber-400' : 'bg-brand-secondary'}`}
              />
            </div>
            <p className="text-xs text-neutral-400 text-right font-medium">
              {isOverBudget 
                ? `Over budget by ${CURRENCY_SYMBOL}${(currentMonthExpenses - budget).toLocaleString('en-IN')}` 
                : `${(100 - budgetProgress).toFixed(0)}% budget remaining`}
            </p>
          </div>
        </section>

        {/* AI Insights Section */}
        <AnimatePresence>
          {insights && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={20} className="text-indigo-600" />
                <h3 className="font-bold text-indigo-900">AI Financial Analysis</h3>
              </div>
              <p className="text-indigo-800 mb-4">{insights.summary}</p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                    <Lightbulb size={12} /> Suggestions
                  </h4>
                  <ul className="space-y-1">
                    {insights.suggestions.map((s: string, i: number) => (
                      <li key={i} className="text-sm text-indigo-700 flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                    <AlertCircle size={12} /> Warnings
                  </h4>
                  <ul className="space-y-1">
                    {insights.warnings.map((w: string, i: number) => (
                      <li key={i} className="text-sm text-rose-700 flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <button 
                onClick={() => setInsights(null)}
                className="mt-4 text-xs font-bold text-indigo-400 hover:text-indigo-600 uppercase tracking-widest"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Transaction Form */}
        <section className="bg-white rounded-3xl border border-neutral-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Plus size={20} className="text-brand-accent" />
            Add Transaction
          </h3>
          <form onSubmit={handleAddTransaction} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">{CURRENCY_SYMBOL}</span>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-brand-accent outline-none transition-all font-bold"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase">Description</label>
              <input 
                type="text" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={suggestCategory}
                placeholder="What was it for?"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-brand-accent outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase">Type & Category</label>
              <div className="flex gap-2">
                <select 
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value as TransactionType);
                    setCategory('');
                  }}
                  className="w-1/3 px-2 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-brand-accent outline-none"
                >
                  <option value="expense">Out</option>
                  <option value="income">In</option>
                </select>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-2/3 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-brand-accent outline-none"
                  required
                >
                  <option value="">Category</option>
                  {CATEGORIES[type].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-end">
              <button 
                type="submit"
                className="w-full py-3 bg-brand-accent text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-brand-accent/20 flex items-center justify-center gap-2"
              >
                <Plus size={20} /> Add
              </button>
            </div>
          </form>
        </section>

        {/* Tabs */}
        <div className="flex bg-neutral-200/50 p-1 rounded-2xl w-fit mx-auto">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-white shadow-sm text-brand-dark' : 'text-neutral-500'}`}
          >
            <PieChartIcon size={16} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'transactions' ? 'bg-white shadow-sm text-brand-dark' : 'text-neutral-500'}`}
          >
            <List size={16} /> History
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'profile' ? 'bg-white shadow-sm text-brand-dark' : 'text-neutral-500'}`}
          >
            <UserIcon size={16} /> Profile
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
                  <h3 className="text-lg font-bold mb-6">Expense Breakdown</h3>
                  <div className="aspect-square max-w-[250px] mx-auto">
                    {transactions.filter(t => t.type === 'expense').length > 0 ? (
                      <Pie data={chartData} options={{ plugins: { legend: { position: 'bottom' } } }} />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-neutral-400 text-center">
                        <PieChartIcon size={48} className="mb-2 opacity-20" />
                        <p className="text-sm">No expenses yet</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
                  <h3 className="text-lg font-bold mb-6">Income Breakdown</h3>
                  <div className="aspect-square max-w-[250px] mx-auto">
                    {transactions.filter(t => t.type === 'income').length > 0 ? (
                      <Pie data={incomeChartData} options={{ plugins: { legend: { position: 'bottom' } } }} />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-neutral-400 text-center">
                        <TrendingUp size={48} className="mb-2 opacity-20" />
                        <p className="text-sm">No income yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
                <h3 className="text-lg font-bold mb-6">50-30-20 Rule Analysis</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Needs (50%)', key: 'Needs', target: 0.5, color: 'bg-blue-500' },
                    { label: 'Wants (30%)', key: 'Wants', target: 0.3, color: 'bg-amber-500' },
                    { label: 'Savings (20%)', key: 'Savings', target: 0.2, color: 'bg-emerald-500' }
                  ].map(rule => {
                    const actual = rule503020Stats.stats[rule.key as keyof typeof rule503020Stats.stats];
                    const targetAmount = rule503020Stats.totalIncome * rule.target;
                    const percentage = rule503020Stats.totalIncome > 0 ? (actual / rule503020Stats.totalIncome) * 100 : 0;
                    const isOver = percentage > (rule.target * 100);

                    return (
                      <div key={rule.key} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                          <span className="text-neutral-500">{rule.label}</span>
                          <span className={isOver && rule.key !== 'Savings' ? 'text-rose-500' : 'text-neutral-400'}>
                            {CURRENCY_SYMBOL}{actual.toLocaleString('en-IN')} / {CURRENCY_SYMBOL}{targetAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(percentage, 100)}%` }}
                            className={`h-full ${rule.color}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-[10px] text-neutral-400 italic">
                    *Needs: Rent, Bills, Food; Wants: Shopping, Entertainment; Savings: Investments.
                  </p>
                </div>
              </div>

              {/* Investment Suggestions Card */}
              <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <TrendingUp size={20} className="text-emerald-500" />
                    Investment Corner
                  </h3>
                  <button 
                    onClick={handleGetInvestmentAdvice}
                    disabled={isInvestmentLoading}
                    className="text-xs font-bold text-brand-accent hover:underline disabled:opacity-50"
                  >
                    {isInvestmentLoading ? 'Thinking...' : 'Get Suggestions'}
                  </button>
                </div>
                
                {investmentAdvice ? (
                  <div className="markdown-body text-sm text-neutral-600 bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                    <Markdown>{investmentAdvice}</Markdown>
                    <button 
                      onClick={() => setInvestmentAdvice(null)}
                      className="mt-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest hover:text-neutral-600"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-neutral-400">
                    <Lightbulb size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs">Select your risk profile in Profile and get AI-powered investment tips!</p>
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
                <h3 className="text-lg font-bold mb-6">Last 7 Days Spending</h3>
                <div className="h-[250px]">
                  <Bar 
                    data={barData} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } }
                    }} 
                  />
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'transactions' ? (
            <motion.div 
              key="transactions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
                <h3 className="text-lg font-bold">Transaction History</h3>
                <span className="text-xs font-bold text-neutral-400 uppercase">{transactions.length} Total</span>
              </div>
              <div className="divide-y divide-neutral-100 max-h-[500px] overflow-y-auto">
                {transactions.length > 0 ? (
                  transactions.map((t) => (
                    <div key={t.id} className="p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                          {t.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        </div>
                        <div>
                          <p className="font-bold text-brand-dark">{t.description}</p>
                          <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium">
                            <span className="px-2 py-0.5 bg-neutral-100 rounded-full">{t.category}</span>
                            <span>•</span>
                            <span>{format(new Date(t.date), 'MMM dd, yyyy')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className={`text-lg font-bold ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {t.type === 'income' ? '+' : '-'}{CURRENCY_SYMBOL}{t.amount.toLocaleString('en-IN')}
                        </p>
                        <button 
                          onClick={() => deleteTransaction(t.id)}
                          className="p-2 text-neutral-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-neutral-400">
                    <List size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No transactions found. Start adding some!</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-3xl border border-neutral-200 p-8 shadow-sm text-center"
            >
              <div className="w-24 h-24 bg-brand-accent/10 text-brand-accent rounded-full flex items-center justify-center mx-auto mb-6">
                <UserIcon size={48} />
              </div>
              <h2 className="text-2xl font-bold text-brand-dark mb-2">{user.name}</h2>
              <p className="text-neutral-500 mb-8">{user.email}</p>
              
              <div className="max-w-sm mx-auto mb-8 space-y-4">
                <div className="p-4 bg-neutral-50 rounded-2xl text-left">
                  <p className="text-xs font-bold text-neutral-400 uppercase mb-2">Investment Risk Profile</p>
                  <div className="flex gap-2">
                    {['low', 'medium', 'high'].map((p) => (
                      <button
                        key={p}
                        onClick={() => updateRiskProfile(p as any)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all ${user.riskProfile === p ? 'bg-brand-dark text-white shadow-lg' : 'bg-white border border-neutral-200 text-neutral-500'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-2">
                    This helps FinVibe AI suggest tailored investment strategies for you.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-neutral-50 rounded-2xl">
                    <p className="text-xs font-bold text-neutral-400 uppercase mb-1">Total Income</p>
                    <p className="text-lg font-bold text-emerald-500">{CURRENCY_SYMBOL}{totals.income.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-4 bg-neutral-50 rounded-2xl">
                    <p className="text-xs font-bold text-neutral-400 uppercase mb-1">Total Spent</p>
                    <p className="text-lg font-bold text-rose-500">{CURRENCY_SYMBOL}{totals.expenses.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-6 py-3 bg-rose-50 text-rose-500 rounded-2xl font-bold hover:bg-rose-100 transition-all mx-auto"
              >
                <LogOut size={20} /> Sign Out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    )}

      {/* AI Marketing Chatbot */}
      <div className="fixed bottom-24 right-6 z-40">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-16 right-0 w-[350px] h-[500px] bg-white rounded-3xl shadow-2xl border border-neutral-200 flex flex-col overflow-hidden"
            >
              {/* Chat Header */}
              <div className="bg-brand-dark p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-brand-secondary rounded-lg flex items-center justify-center text-brand-dark">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">FinVibe AI</h4>
                    <p className="text-[10px] text-white/60">Smart Financial Advisor</p>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-1 hover:bg-white/10 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50">
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
                    <Sparkles size={40} className="mb-4 text-brand-secondary opacity-50" />
                    <p className="text-sm font-medium">Hi! I'm FinVibe AI. Ask me about your spending, the 50-30-20 rule, or investment tips based on your risk profile!</p>
                  </div>
                )}
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-brand-accent text-white rounded-tr-none' 
                        : 'bg-white border border-neutral-200 text-brand-dark rounded-tl-none shadow-sm'
                    }`}>
                      <div className="markdown-body">
                        <Markdown>{msg.text}</Markdown>
                      </div>
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-neutral-200 p-3 rounded-2xl rounded-tl-none shadow-sm">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-neutral-100 flex gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask for financial advice..."
                  className="flex-1 px-4 py-2 bg-neutral-100 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-accent transition-all"
                />
                <button 
                  type="submit" 
                  disabled={!chatInput.trim() || isChatLoading}
                  className="p-2 bg-brand-dark text-white rounded-xl hover:bg-neutral-800 disabled:opacity-50 transition-all"
                >
                  <Send size={18} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all ${isChatOpen ? 'bg-brand-dark text-white' : 'bg-brand-secondary text-brand-dark hover:scale-110'}`}
        >
          {isChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
        </button>
      </div>

      {/* Bottom Nav (Mobile) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-brand-dark/90 backdrop-blur-lg text-white px-6 py-3 rounded-full flex items-center gap-8 shadow-2xl md:hidden">
        <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-brand-secondary' : 'text-white/60'}>
          <PieChartIcon size={24} />
        </button>
        <button onClick={() => setActiveTab('transactions')} className={activeTab === 'transactions' ? 'text-brand-secondary' : 'text-white/60'}>
          <List size={24} />
        </button>
      </div>
    </div>
  );
}
