import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  Loader2,
  Plus,
  ReceiptText,
  RefreshCw,
  Save,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
} from 'lucide-react';
import { getTuitionRecordsForMonth } from '../services/tuitionService';
import {
  EXPENSE_CATEGORIES,
  addMonthlyExpense,
  deleteMonthlyExpense,
  ensureDefaultMonthlyExpenses,
  getExpensesByMonth,
  updateMonthlyExpense,
} from '../services/expenseService';
import {
  calculateMonthlyEarnings,
  calculateYearlyEarnings,
  formatMonthLabel,
  getMonthKeysForYear,
} from '../utils/earningsUtils';
import { useAuth } from '../context/AuthContext';

const createEmptyExpenseForm = () => ({
  category: 'Rent',
  amount: '',
  note: '',
});

const formatCurrency = (value) => {
  const amount = Number(value) || 0;

  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
};

const getEarningsTone = (value) => {
  const amount = Number(value) || 0;

  if (amount > 0) {
    return 'text-brand-green';
  }

  if (amount < 0) {
    return 'text-brand-red';
  }

  return 'text-slate-600';
};

const getEarningsBadge = (value) => {
  const amount = Number(value) || 0;

  if (amount > 0) {
    return 'border-brand-green/20 bg-brand-green/10 text-brand-green';
  }

  if (amount < 0) {
    return 'border-brand-red/20 bg-brand-red/10 text-brand-red';
  }

  return 'border-slate-200 bg-slate-100 text-slate-600';
};

const getMonthTrend = (summary, compare) => {
  if (!summary) {
    return null;
  }

  return {
    label: formatMonthLabel(summary.monthKey),
    value: Number(summary.totalEarnings) || 0,
    compare,
  };
};

const YearlySummaryCard = ({ label, value, icon: Icon, tone = 'text-slate-700', helper }) => (
  <div className="summary-card p-5">
    <div className="relative flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <p className={`mt-3 text-2xl font-black tracking-tight ${tone}`}>{formatCurrency(value)}</p>
        {helper && <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{helper}</p>}
      </div>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-brand-blue ring-1 ring-brand-blue/10">
        <Icon size={20} />
      </div>
    </div>
  </div>
);

const Earnings = () => {
  const { currentUser } = useAuth();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [monthSummaries, setMonthSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseForm, setExpenseForm] = useState(createEmptyExpenseForm);
  const [formError, setFormError] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState('');

  const yearSummary = useMemo(() => calculateYearlyEarnings(monthSummaries), [monthSummaries]);
  const monthTrends = useMemo(() => {
    if (monthSummaries.length === 0) {
      return {
        bestMonth: null,
        lowestMonth: null,
      };
    }

    const sortedByEarnings = [...monthSummaries].sort((monthA, monthB) => (
      (Number(monthB.totalEarnings) || 0) - (Number(monthA.totalEarnings) || 0)
    ));

    return {
      bestMonth: getMonthTrend(sortedByEarnings[0], 'Best'),
      lowestMonth: getMonthTrend(sortedByEarnings[sortedByEarnings.length - 1], 'Lowest'),
    };
  }, [monthSummaries]);
  const selectedMonth = useMemo(
    () => monthSummaries.find((summary) => summary.monthKey === selectedMonthKey) || monthSummaries[0] || null,
    [monthSummaries, selectedMonthKey]
  );
  const hasAnyData = monthSummaries.some((summary) => (
    summary.tuitionRecordCount > 0 || summary.expenseCount > 0
  ));

  const loadEarnings = async (year = selectedYear) => {
    setLoading(true);
    setError('');

    try {
      const monthKeys = getMonthKeysForYear(year);
      const summaries = await Promise.all(monthKeys.map(async (monthKey) => {
        await ensureDefaultMonthlyExpenses(monthKey, getUserName());
        const [tuitionRecords, expenses] = await Promise.all([
          getTuitionRecordsForMonth(monthKey),
          getExpensesByMonth(monthKey),
        ]);
        const earnings = calculateMonthlyEarnings({ tuitionRecords, expenses });

        return {
          monthKey,
          ...earnings,
          expensesList: Array.isArray(expenses) ? expenses : [],
          tuitionRecordCount: Array.isArray(tuitionRecords) ? tuitionRecords.length : 0,
          expenseCount: Array.isArray(expenses) ? expenses.length : 0,
        };
      }));

      setMonthSummaries(summaries);

      if (!summaries.some((summary) => summary.monthKey === selectedMonthKey)) {
        setSelectedMonthKey(`${year}-01`);
      }
    } catch (err) {
      console.error("Failed to load earnings ledger", err);
      setError('Failed to load earnings. Please try again.');
      setMonthSummaries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEarnings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  useEffect(() => {
    if (!isExpenseModalOpen && !isDetailOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isDetailOpen, isExpenseModalOpen]);

  const handleYearChange = (delta) => {
    const nextYear = selectedYear + delta;
    setSelectedYear(nextYear);
    setSelectedMonthKey(`${nextYear}-01`);
    setIsDetailOpen(false);
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 2500);
  };

  const getUserName = () => currentUser?.displayName || currentUser?.email || 'system';

  const openMonthDetails = (monthKey) => {
    setSelectedMonthKey(monthKey);
    setIsDetailOpen(true);
  };

  const closeMonthDetails = () => {
    if (savingExpense || deletingExpenseId) {
      return;
    }

    setIsDetailOpen(false);
  };

  const openAddExpenseModal = () => {
    setEditingExpense(null);
    setExpenseForm(createEmptyExpenseForm());
    setFormError('');
    setIsExpenseModalOpen(true);
  };

  const openEditExpenseModal = (expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      category: expense.category || 'Other',
      amount: expense.amount ?? '',
      note: expense.note || '',
    });
    setFormError('');
    setIsExpenseModalOpen(true);
  };

  const closeExpenseModal = () => {
    if (savingExpense) {
      return;
    }

    setIsExpenseModalOpen(false);
    setEditingExpense(null);
    setExpenseForm(createEmptyExpenseForm());
    setFormError('');
  };

  const updateExpenseForm = (field, value) => {
    setExpenseForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const handleSaveExpense = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!selectedMonth) {
      setFormError('Select a month before saving an expense.');
      return;
    }

    if (!expenseForm.category) {
      setFormError('Category is required.');
      return;
    }

    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) {
      setFormError('Amount must be greater than 0.');
      return;
    }

    setSavingExpense(true);

    try {
      if (editingExpense?.id) {
        await updateMonthlyExpense(editingExpense.id, {
          category: expenseForm.category,
          amount: expenseForm.amount,
          note: expenseForm.note,
          updatedBy: getUserName(),
        });
        showSuccess('Expense updated.');
      } else {
        await addMonthlyExpense({
          monthKey: selectedMonth.monthKey,
          category: expenseForm.category,
          amount: expenseForm.amount,
          note: expenseForm.note,
          createdBy: getUserName(),
          updatedBy: getUserName(),
        });
        showSuccess('Expense added.');
      }

      setIsExpenseModalOpen(false);
      setEditingExpense(null);
      setExpenseForm(createEmptyExpenseForm());
      setFormError('');
      await loadEarnings();
    } catch (err) {
      console.error("Failed to save expense", err);
      setFormError(err.message || 'Failed to save expense. Please try again.');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (expense) => {
    const confirmed = window.confirm(`Delete ${expense.category} expense for ${formatCurrency(expense.amount)}?`);

    if (!confirmed) {
      return;
    }

    setDeletingExpenseId(expense.id);
    setError('');

    try {
      await deleteMonthlyExpense(expense.id);
      showSuccess('Expense deleted.');
      await loadEarnings();
    } catch (err) {
      console.error("Failed to delete expense", err);
      setError('Failed to delete expense. Please try again.');
    } finally {
      setDeletingExpenseId('');
    }
  };

  return (
    <div className="space-y-7 pb-12">
      <header className="glass-card relative overflow-hidden rounded-4xl border border-white/70 p-6 shadow-podium-glass md:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue via-brand-yellow to-brand-green" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-blue/10 bg-white/65 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-brand-blue shadow-sm">
              <span className="h-2 w-2 rounded-full bg-brand-yellow shadow-[0_0_0_4px_rgba(254,195,29,0.18)]" />
              Earnings
            </div>
            <h1 className="text-4xl font-black tracking-tight text-brand-ink">Earnings Ledger</h1>
            <p className="mt-3 text-base font-medium leading-7 text-slate-600">
              Review center revenue, 1:1 profit, expenses, and total earnings month by month.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
            <div className="flex w-fit shrink-0 items-center gap-2 rounded-full border border-brand-blue/10 bg-white/75 p-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => handleYearChange(-1)}
                className="focus-ring rounded-full p-2.5 text-slate-600 transition-all hover:bg-brand-blue/10 hover:text-brand-blue"
                title="Previous year"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="flex min-w-[128px] items-center justify-center gap-2 text-center text-sm font-black text-slate-800">
                <CalendarDays size={16} className="text-brand-blue" />
                {selectedYear}
              </span>
              <button
                type="button"
                onClick={() => handleYearChange(1)}
                className="focus-ring rounded-full p-2.5 text-slate-600 transition-all hover:bg-brand-blue/10 hover:text-brand-blue"
                title="Next year"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => loadEarnings()}
              disabled={loading}
              className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
              Refresh
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="flex items-center rounded-3xl border border-brand-red/20 bg-brand-red/10 p-4 font-bold text-brand-red shadow-sm">
          <AlertCircle className="mr-3 h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="flex items-center rounded-3xl border border-brand-green/20 bg-brand-green/10 p-4 font-bold text-brand-green shadow-sm">
          <TrendingUp className="mr-3 h-5 w-5 shrink-0" />
          {successMessage}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <YearlySummaryCard
          label="Yearly Center Actual"
          value={yearSummary.centerActualRevenue}
          icon={WalletCards}
          tone="text-brand-green"
          helper="Collected center revenue"
        />
        <YearlySummaryCard
          label="Yearly 1:1 Actual Profit"
          value={yearSummary.oneOnOneActualProfit}
          icon={TrendingUp}
          tone="text-brand-blue"
          helper="After tutor costs"
        />
        <YearlySummaryCard
          label="Yearly Expenses"
          value={yearSummary.expenses}
          icon={ReceiptText}
          tone="text-brand-red"
          helper="Logged expenses"
        />
        <YearlySummaryCard
          label="Yearly Total Earnings"
          value={yearSummary.totalEarnings}
          icon={yearSummary.totalEarnings < 0 ? TrendingDown : TrendingUp}
          tone={getEarningsTone(yearSummary.totalEarnings)}
          helper="Actual revenue + profit - expenses"
        />
      </section>

      {loading ? (
        <div className="glass-card flex h-64 flex-col items-center justify-center rounded-4xl border border-white/70 shadow-podium-glass">
          <Loader2 size={32} className="mb-4 animate-spin text-brand-blue" />
          <p className="font-bold text-slate-500">Loading earnings ledger...</p>
        </div>
      ) : (
        <>
          {!hasAnyData && (
            <div className="flex items-center rounded-3xl border border-brand-blue/15 bg-brand-blue/10 p-4 text-brand-blue shadow-sm">
              <AlertCircle className="mr-3 h-5 w-5 shrink-0" />
              <p className="text-sm font-bold">No tuition records or expenses found for {selectedYear}. The ledger is showing safe zero values.</p>
            </div>
          )}

          <section className="glass-card overflow-hidden rounded-4xl border border-white/70 shadow-podium-glass">
            <div className="border-b border-brand-blue/10 bg-white/55 px-5 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-blue/65">Yearly Finance</p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-brand-ink">{selectedYear} Month-by-Month Ledger</h2>
                </div>
                <p className="text-sm font-bold text-slate-500">Paused tuition records are excluded.</p>
              </div>
            </div>

            <div className="overflow-x-auto overscroll-x-contain [scrollbar-color:rgba(7,49,149,0.35)_rgba(255,255,255,0.6)] [scrollbar-width:thin]">
              <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="bg-white/78">
                    <th className="border-b border-brand-blue/10 px-5 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-500">Month</th>
                    <th className="border-b border-brand-blue/10 px-5 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-500">Center Expected</th>
                    <th className="border-b border-brand-blue/10 px-5 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-500">Center Actual</th>
                    <th className="border-b border-brand-blue/10 px-5 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-500">1:1 Expected Profit</th>
                    <th className="border-b border-brand-blue/10 px-5 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-500">1:1 Actual Profit</th>
                    <th className="border-b border-brand-blue/10 px-5 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-500">Expenses</th>
                    <th className="border-b border-brand-blue/10 px-5 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-500">Total Earnings</th>
                    <th className="border-b border-brand-blue/10 px-5 py-4 text-right text-xs font-black uppercase tracking-[0.15em] text-slate-500">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {monthSummaries.map((summary) => {
                    const isSelected = summary.monthKey === selectedMonthKey;

                    return (
                      <tr
                        key={summary.monthKey}
                        className={`transition-colors ${isSelected ? 'bg-brand-blue/10' : 'hover:bg-white/70'}`}
                      >
                        <td className="border-t border-brand-blue/10 px-5 py-4 align-top">
                          <button
                            type="button"
                            onClick={() => setSelectedMonthKey(summary.monthKey)}
                            className="focus-ring rounded-2xl px-2 py-1 text-left transition-colors hover:bg-white/80"
                          >
                            <span className="block text-sm font-black text-brand-ink">{formatMonthLabel(summary.monthKey)}</span>
                            <span className="mt-1 block text-xs font-bold text-slate-400">{summary.monthKey}</span>
                          </button>
                        </td>
                        <td className="border-t border-brand-blue/10 px-5 py-4 align-top text-sm font-black text-slate-700">{formatCurrency(summary.centerExpectedRevenue)}</td>
                        <td className="border-t border-brand-blue/10 px-5 py-4 align-top text-sm font-black text-brand-green">{formatCurrency(summary.centerActualRevenue)}</td>
                        <td className="border-t border-brand-blue/10 px-5 py-4 align-top text-sm font-black text-slate-700">{formatCurrency(summary.oneOnOneExpectedProfit)}</td>
                        <td className="border-t border-brand-blue/10 px-5 py-4 align-top text-sm font-black text-brand-blue">{formatCurrency(summary.oneOnOneActualProfit)}</td>
                        <td className="border-t border-brand-blue/10 px-5 py-4 align-top text-sm font-black text-brand-red">{formatCurrency(summary.expenses)}</td>
                        <td className="border-t border-brand-blue/10 px-5 py-4 align-top">
                          <span className={`inline-flex rounded-full border px-3 py-1.5 text-sm font-black ${getEarningsBadge(summary.totalEarnings)}`}>
                            {formatCurrency(summary.totalEarnings)}
                          </span>
                        </td>
                        <td className="border-t border-brand-blue/10 px-5 py-4 align-top text-right">
                          <button
                            type="button"
                            onClick={() => openMonthDetails(summary.monthKey)}
                            className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-brand-blue/10 bg-white/75 px-3 py-2 text-sm font-black text-brand-blue shadow-sm transition-all hover:bg-brand-blue hover:text-white hover:shadow-podium-soft"
                          >
                            <Eye size={16} />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-brand-blue/10 bg-white/60 p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Yearly Center Expected</p>
              <p className="mt-2 text-lg font-black text-slate-700">{formatCurrency(yearSummary.centerExpectedRevenue)}</p>
            </div>
            <div className="rounded-3xl border border-brand-blue/10 bg-white/60 p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Yearly 1:1 Expected Profit</p>
              <p className="mt-2 text-lg font-black text-slate-700">{formatCurrency(yearSummary.oneOnOneExpectedProfit)}</p>
            </div>
            <div className="rounded-3xl border border-brand-green/10 bg-white/60 p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Best Month</p>
              <p className="mt-2 text-sm font-black text-brand-ink">{monthTrends.bestMonth?.label || 'Not available'}</p>
              <p className={`mt-1 text-lg font-black ${getEarningsTone(monthTrends.bestMonth?.value)}`}>
                {formatCurrency(monthTrends.bestMonth?.value)}
              </p>
            </div>
            <div className="rounded-3xl border border-brand-red/10 bg-white/60 p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Lowest Month</p>
              <p className="mt-2 text-sm font-black text-brand-ink">{monthTrends.lowestMonth?.label || 'Not available'}</p>
              <p className={`mt-1 text-lg font-black ${getEarningsTone(monthTrends.lowestMonth?.value)}`}>
                {formatCurrency(monthTrends.lowestMonth?.value)}
              </p>
            </div>
          </section>
        </>
      )}

      {isDetailOpen && selectedMonth && createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close selected month details"
            onClick={closeMonthDetails}
            className="absolute inset-0 cursor-default"
          />
          <section className="glass-card relative max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-4xl border border-white/70 shadow-podium-glass">
            <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-brand-blue/10 bg-white/80 p-5 backdrop-blur md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-blue/65">Selected Month</p>
                <h2 className="mt-1 text-3xl font-black tracking-tight text-brand-ink">{formatMonthLabel(selectedMonth.monthKey)}</h2>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={openAddExpenseModal}
                  className="btn-primary w-full sm:w-fit"
                >
                  <Plus size={18} />
                  Add Expense
                </button>
                <button
                  type="button"
                  onClick={closeMonthDetails}
                  className="focus-ring flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white hover:text-slate-800"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-6 p-5 md:p-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl border border-brand-blue/10 bg-white/65 p-4 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Center Expected Revenue</p>
                  <p className="mt-2 text-2xl font-black text-slate-700">{formatCurrency(selectedMonth.centerExpectedRevenue)}</p>
                </div>
                <div className="rounded-3xl border border-brand-blue/10 bg-white/65 p-4 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Center Actual Revenue</p>
                  <p className="mt-2 text-2xl font-black text-brand-green">{formatCurrency(selectedMonth.centerActualRevenue)}</p>
                </div>
                <div className="rounded-3xl border border-brand-blue/10 bg-white/65 p-4 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">1:1 Expected Profit</p>
                  <p className="mt-2 text-2xl font-black text-slate-700">{formatCurrency(selectedMonth.oneOnOneExpectedProfit)}</p>
                </div>
                <div className="rounded-3xl border border-brand-blue/10 bg-white/65 p-4 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">1:1 Actual Profit</p>
                  <p className="mt-2 text-2xl font-black text-brand-blue">{formatCurrency(selectedMonth.oneOnOneActualProfit)}</p>
                </div>
                <div className="rounded-3xl border border-brand-blue/10 bg-white/65 p-4 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Tuition Records</p>
                  <p className="mt-2 flex items-center gap-2 text-2xl font-black text-brand-ink">
                    <WalletCards size={20} className="text-brand-blue" />
                    {selectedMonth.tuitionRecordCount}
                  </p>
                </div>
                <div className="rounded-3xl border border-brand-blue/10 bg-white/65 p-4 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Expense Entries</p>
                  <p className="mt-2 flex items-center gap-2 text-2xl font-black text-brand-ink">
                    <ReceiptText size={20} className="text-brand-red" />
                    {selectedMonth.expenseCount}
                  </p>
                </div>
                <div className="rounded-3xl border border-brand-blue/10 bg-white/65 p-4 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Expense Total</p>
                  <p className="mt-2 text-2xl font-black text-brand-red">
                    {formatCurrency(selectedMonth.expenses)}
                  </p>
                </div>
                <div className="rounded-3xl border border-brand-blue/10 bg-white/65 p-4 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Total Earnings</p>
                  <p className={`mt-2 text-2xl font-black ${getEarningsTone(selectedMonth.totalEarnings)}`}>
                    {formatCurrency(selectedMonth.totalEarnings)}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-4xl border border-brand-blue/10 bg-white/60 shadow-sm">
                <div className="flex flex-col gap-3 border-b border-brand-blue/10 bg-white/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-blue/65">Monthly Expenses</p>
                    <h3 className="mt-1 text-xl font-black tracking-tight text-brand-ink">{formatCurrency(selectedMonth.expenses)}</h3>
                  </div>
                  <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-black ${getEarningsBadge(selectedMonth.totalEarnings)}`}>
                    {selectedMonth.totalEarnings >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {formatCurrency(selectedMonth.totalEarnings)}
                  </span>
                </div>

                {!selectedMonth.expensesList || selectedMonth.expensesList.length === 0 ? (
                  <div className="p-5">
                    <div className="rounded-3xl border border-dashed border-brand-blue/20 bg-white/70 p-5 text-sm font-bold text-slate-500">
                      No expenses logged for this month yet.
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left">
                      <thead>
                        <tr className="bg-white/75">
                          <th className="border-b border-brand-blue/10 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Category</th>
                          <th className="border-b border-brand-blue/10 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Amount</th>
                          <th className="border-b border-brand-blue/10 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Note</th>
                          <th className="border-b border-brand-blue/10 px-5 py-3 text-right text-xs font-black uppercase tracking-[0.14em] text-slate-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedMonth.expensesList.map((expense) => (
                          <tr key={expense.id} className="transition-colors hover:bg-white/70">
                            <td className="border-t border-brand-blue/10 px-5 py-4 align-top text-sm font-black text-brand-ink">{expense.category}</td>
                            <td className="border-t border-brand-blue/10 px-5 py-4 align-top text-sm font-black text-brand-red">{formatCurrency(expense.amount)}</td>
                            <td className="border-t border-brand-blue/10 px-5 py-4 align-top text-sm font-semibold leading-6 text-slate-600">
                              {expense.note || <span className="text-slate-400">No note</span>}
                            </td>
                            <td className="border-t border-brand-blue/10 px-5 py-4 align-top">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditExpenseModal(expense)}
                                  className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-blue/10 bg-white/75 text-brand-blue shadow-sm transition-colors hover:bg-brand-blue hover:text-white"
                                  title="Edit expense"
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteExpense(expense)}
                                  disabled={deletingExpenseId === expense.id}
                                  className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-red/10 bg-white/75 text-brand-red shadow-sm transition-colors hover:bg-brand-red/10 disabled:cursor-not-allowed disabled:opacity-60"
                                  title="Delete expense"
                                >
                                  {deletingExpenseId === expense.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>,
        document.body
      )}

      {isExpenseModalOpen && selectedMonth && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="glass-card w-full max-w-xl overflow-hidden rounded-4xl border border-white/70 shadow-podium-glass">
            <div className="relative flex items-start justify-between gap-4 border-b border-brand-blue/10 bg-white/70 p-5 backdrop-blur">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue via-brand-yellow to-brand-green" />
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-blue/10 bg-white/70 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-brand-blue shadow-sm">
                  <ReceiptText size={13} />
                  Expense
                </div>
                <h2 className="text-xl font-black tracking-tight text-brand-ink">
                  {editingExpense ? 'Edit Expense' : 'Add Expense'}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">{formatMonthLabel(selectedMonth.monthKey)}</p>
              </div>
              <button
                type="button"
                onClick={closeExpenseModal}
                disabled={savingExpense}
                className="focus-ring flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-5 p-5">
              {formError && (
                <div className="flex items-center rounded-3xl border border-brand-red/20 bg-brand-red/10 p-4 text-sm font-bold text-brand-red">
                  <AlertCircle className="mr-3 h-5 w-5 shrink-0" />
                  {formError}
                </div>
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Text</span>
                <input
                  type="text"
                  list="expense-category-options"
                  value={expenseForm.category}
                  onChange={(event) => updateExpenseForm('category', event.target.value)}
                  className="input-field text-sm font-bold"
                  placeholder="Expense label"
                  disabled={savingExpense}
                />
                <datalist id="expense-category-options">
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(event) => updateExpenseForm('amount', event.target.value)}
                  className="input-field text-sm font-bold"
                  placeholder="0.00"
                  disabled={savingExpense}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Note</span>
                <textarea
                  value={expenseForm.note}
                  onChange={(event) => updateExpenseForm('note', event.target.value)}
                  rows={4}
                  className="input-field text-sm"
                  placeholder="Optional detail"
                  disabled={savingExpense}
                />
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-brand-blue/10 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeExpenseModal}
                  disabled={savingExpense}
                  className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingExpense}
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingExpense ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                  {savingExpense ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Earnings;
