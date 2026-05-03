import { useState, useEffect } from 'react';
import {
  calculateEarnedAmount,
  calculateExpectedTutorExpense,
  calculateHourlyRate,
  calculatePaymentStatus,
  calculateProfit,
  calculateTutorExpense,
  getTuitionRecordsForMonth,
  generateTuitionRecordsForMonth,
  saveTuitionRecord
} from '../services/tuitionService';
import { ChevronLeft, ChevronRight, Loader2, DollarSign, AlertCircle, CheckCircle2, X, Save } from 'lucide-react';

const centerStatusStyles = {
  unpaid: 'bg-brand-red/10 text-brand-red border-brand-red/20 focus:ring-brand-red/20',
  partial: 'bg-brand-yellow/20 text-[#765300] border-brand-yellow/45 focus:ring-brand-yellow/25',
  paid: 'bg-brand-green/10 text-brand-green border-brand-green/20 focus:ring-brand-green/20'
};

const formatCurrency = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : '—';
};

const formatNumber = (value) => {
  if (value === '' || value === null || value === undefined) {
    return '—';
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : '—';
};

const getStatusLabel = (status) => {
  if (status === 'paid') return 'Paid';
  if (status === 'partial') return 'Partial';
  return 'Unpaid';
};

const getEarnedAmount = (record) => {
  if (record.earnedAmount !== '' && record.earnedAmount !== null && record.earnedAmount !== undefined) {
    return Number(record.earnedAmount) || 0;
  }

  const hourlyRate = record.hourlyRate !== '' && record.hourlyRate !== null && record.hourlyRate !== undefined
    ? Number(record.hourlyRate)
    : calculateHourlyRate(record.expectedAmount, record.expectedTutoringHours);

  return calculateEarnedAmount(record.completedTutoringHours, hourlyRate) || 0;
};

const getOneOnOneMetrics = (record) => {
  const hourlyRate = calculateHourlyRate(record.expectedAmount, record.expectedTutoringHours);
  const earnedAmount = record.earnedAmount ?? calculateEarnedAmount(record.completedTutoringHours, hourlyRate);
  const expectedTutorExpense = record.expectedTutorExpense ?? calculateExpectedTutorExpense(record.expectedTutoringHours, record.tutorHourlyPay);
  const tutorExpense = record.tutorExpense ?? calculateTutorExpense(record.completedTutoringHours, record.tutorHourlyPay);
  const expectedProfit = record.expectedProfit ?? calculateProfit(record.expectedAmount, expectedTutorExpense);
  const earnedProfit = record.earnedProfit ?? calculateProfit(earnedAmount, tutorExpense);

  return {
    hourlyRate,
    earnedAmount,
    expectedTutorExpense,
    tutorExpense,
    expectedProfit,
    earnedProfit,
  };
};

const DetailValue = ({ label, value, tone = 'text-slate-800' }) => (
  <div className="rounded-3xl border border-brand-blue/10 bg-white/70 p-4 shadow-sm">
    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
    <p className={`mt-2 text-base font-black ${tone}`}>{value}</p>
  </div>
);

const Tuition = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState([]);
  const [activeTab, setActiveTab] = useState('center');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState('');
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [drawerSaving, setDrawerSaving] = useState(false);

  const tabs = [
    { id: 'center', label: 'Center', setupLabel: 'Set up Center Tuition' },
    { id: 'one-on-one', label: '1:1', setupLabel: 'Set up 1:1 Tuition' },
  ];
  const activeTabConfig = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const displayedRecords = records.filter((record) => record.studentType === activeTab);
  const selectedRecord = selectedRecordId ? records.find((record) => record.id === selectedRecordId) : null;

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getTuitionRecordsForMonth(monthKey);
      data.sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));
      setRecords(data);
    } catch (err) {
      console.error("Failed to load tuition data", err);
      setError("Failed to load records. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (delta) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const handleSetupMonth = async () => {
    setGenerating(activeTab);
    setError('');
    try {
      await generateTuitionRecordsForMonth(monthKey, activeTab);
      await loadData();
      showSavedFeedback(`${activeTabConfig.label} setup complete`);
    } catch (err) {
      console.error("Failed to setup month", err);
      setError("Failed to set up month. Please try again.");
    } finally {
      setGenerating('');
    }
  };

  const showSavedFeedback = (msg = 'Saved') => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const handleRecordChange = (recordId, field, value) => {
    const newRecords = [...records];
    const recordIndex = newRecords.findIndex((record) => record.id === recordId);

    if (recordIndex === -1) {
      return;
    }

    newRecords[recordIndex] = { ...newRecords[recordIndex], [field]: value };
    
    // Auto-update status based on paid amount
    if (field === 'paidAmount') {
      newRecords[recordIndex].paymentStatus = calculatePaymentStatus(value, newRecords[recordIndex].expectedAmount);
    }

    if (newRecords[recordIndex].studentType === 'one-on-one') {
      const hourlyRate = calculateHourlyRate(
        newRecords[recordIndex].expectedAmount,
        newRecords[recordIndex].expectedTutoringHours
      );
      newRecords[recordIndex].hourlyRate = hourlyRate;
      newRecords[recordIndex].earnedAmount = calculateEarnedAmount(
        newRecords[recordIndex].completedTutoringHours,
        hourlyRate
      );
      newRecords[recordIndex].expectedTutorExpense = calculateExpectedTutorExpense(
        newRecords[recordIndex].expectedTutoringHours,
        newRecords[recordIndex].tutorHourlyPay
      );
      newRecords[recordIndex].tutorExpense = calculateTutorExpense(
        newRecords[recordIndex].completedTutoringHours,
        newRecords[recordIndex].tutorHourlyPay
      );
      if (field === 'tutorExpense') {
        newRecords[recordIndex].tutorExpense = value;
      }
      newRecords[recordIndex].expectedProfit = calculateProfit(
        newRecords[recordIndex].expectedAmount,
        newRecords[recordIndex].expectedTutorExpense
      );
      newRecords[recordIndex].earnedProfit = calculateProfit(
        newRecords[recordIndex].earnedAmount,
        newRecords[recordIndex].tutorExpense
      );
    }
    
    setRecords(newRecords);
  };

  const handleOpenDetails = (recordId) => {
    setSelectedRecordId(recordId);
    setError('');
  };

  const handleCloseDetails = () => {
    setSelectedRecordId(null);
  };

  const handleRecordBlur = async (recordId) => {
    const record = records.find((item) => item.id === recordId);

    if (!record) {
      return;
    }

    try {
      await saveTuitionRecord(record);
      showSavedFeedback();
    } catch (err) {
      console.error("Failed to update record", err);
      setError("Failed to save changes.");
    }
  };

  const handleDrawerSave = async () => {
    if (!selectedRecord) {
      return;
    }

    setDrawerSaving(true);
    setError('');

    try {
      const savedRecord = await saveTuitionRecord(selectedRecord);
      setRecords((prevRecords) => prevRecords.map((record) => (
        record.id === savedRecord.id ? { ...record, ...savedRecord } : record
      )));
      await loadData();
      setSelectedRecordId(savedRecord.id);
      showSavedFeedback('Details saved');
    } catch (err) {
      console.error("Failed to save drawer record", err);
      setError("Failed to save changes.");
    } finally {
      setDrawerSaving(false);
    }
  };

  // Calculations
  const expectedTotal = displayedRecords.reduce((sum, r) => sum + (Number(r.expectedAmount) || 0), 0);
  const collectedTotal = displayedRecords.reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);
  const remainingTotal = expectedTotal - collectedTotal;
  const earnedTotal = displayedRecords.reduce((sum, r) => sum + getEarnedAmount(r), 0);
  const expectedHoursTotal = displayedRecords.reduce((sum, r) => sum + (Number(r.expectedTutoringHours) || 0), 0);
  const completedHoursTotal = displayedRecords.reduce((sum, r) => sum + (Number(r.completedTutoringHours) || 0), 0);
  const expectedTutorExpenseTotal = displayedRecords.reduce((sum, r) => sum + (Number(getOneOnOneMetrics(r).expectedTutorExpense) || 0), 0);
  const tutorExpenseTotal = displayedRecords.reduce((sum, r) => sum + (Number(getOneOnOneMetrics(r).tutorExpense) || 0), 0);
  const expectedProfitTotal = displayedRecords.reduce((sum, r) => sum + (Number(getOneOnOneMetrics(r).expectedProfit) || 0), 0);
  const earnedProfitTotal = displayedRecords.reduce((sum, r) => sum + (Number(getOneOnOneMetrics(r).earnedProfit) || 0), 0);
  const selectedMetrics = selectedRecord ? getOneOnOneMetrics(selectedRecord) : null;

  return (
    <div className="space-y-7 pb-12">
      <header className="glass-card overflow-hidden rounded-4xl border border-white/70 p-6 shadow-podium-glass">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-blue/10 bg-white/65 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-brand-blue shadow-sm">
              <span className="h-2 w-2 rounded-full bg-brand-yellow shadow-[0_0_0_4px_rgba(254,195,29,0.18)]" />
              Tuition
            </div>
            <h1 className="text-4xl font-black tracking-tight text-brand-ink">Tuition Tracking</h1>
            <p className="mt-3 text-base font-medium leading-7 text-slate-600">
              Manage monthly student payments, spot outstanding balances, and keep revenue status current.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
            <div className={`flex items-center gap-2 rounded-full border border-brand-green/15 bg-white/65 px-3 py-2 text-brand-green shadow-sm transition-opacity duration-300 ${saveMessage ? 'opacity-100' : 'opacity-0'}`}>
              <CheckCircle2 size={18} />
              <span className="text-sm font-bold">{saveMessage}</span>
            </div>

            <div className="flex w-fit shrink-0 items-center gap-2 rounded-full border border-brand-blue/10 bg-white/75 p-1.5 shadow-sm">
              <button
                onClick={() => handleMonthChange(-1)}
                className="focus-ring rounded-full p-2.5 text-slate-600 transition-all hover:bg-brand-blue/10 hover:text-brand-blue"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="min-w-[152px] text-center text-sm font-bold text-slate-800">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => handleMonthChange(1)}
                className="focus-ring rounded-full p-2.5 text-slate-600 transition-all hover:bg-brand-blue/10 hover:text-brand-blue"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <button
              onClick={handleSetupMonth}
              disabled={Boolean(generating) || loading}
              className="btn-primary min-w-[190px] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {generating === activeTab ? <Loader2 size={16} className="animate-spin" /> : null}
              {activeTabConfig.setupLabel}
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 font-medium flex items-center">
          <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
          {error}
        </div>
      )}

      <div className="inline-flex rounded-full border border-brand-blue/10 bg-white/65 p-1.5 shadow-sm backdrop-blur">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`focus-ring rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-200 ${activeTab === tab.id ? 'bg-gradient-to-r from-brand-blue to-blue-700 text-white shadow-podium-soft' : 'text-slate-500 hover:bg-white/80 hover:text-brand-blue'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      {activeTab === 'center' ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="summary-card p-6">
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-500">Expected Revenue</p>
                <h3 className="mt-3 text-3xl font-black tracking-tight text-brand-ink">${expectedTotal.toFixed(2)}</h3>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-blue/65">Projected for month</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/10">
                <DollarSign size={23} strokeWidth={2.25} />
              </div>
            </div>
          </div>
          <div className="summary-card p-6">
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-500">Collected Revenue</p>
                <h3 className="mt-3 text-3xl font-black tracking-tight text-brand-green">${collectedTotal.toFixed(2)}</h3>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-green/70">Payments received</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green ring-1 ring-brand-green/10">
                <CheckCircle2 size={23} strokeWidth={2.25} />
              </div>
            </div>
          </div>
          <div className="summary-card p-6">
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-500">Remaining Balance</p>
                <h3 className="mt-3 text-3xl font-black tracking-tight text-brand-red">${remainingTotal > 0 ? remainingTotal.toFixed(2) : '0.00'}</h3>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-red/65">Still outstanding</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-yellow/20 text-[#765300] ring-1 ring-brand-yellow/30">
                <AlertCircle size={23} strokeWidth={2.25} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="summary-card p-5">
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-500">Expected Revenue</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/10">
                  <DollarSign size={18} />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-brand-ink">${expectedTotal.toFixed(2)}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-brand-blue/60">Scheduled</p>
              </div>
            </div>
          </div>
          <div className="summary-card p-5">
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-500">Earned Revenue</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-yellow/20 text-[#765300] ring-1 ring-brand-yellow/30">
                  <DollarSign size={18} />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-[#765300]">${earnedTotal.toFixed(2)}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#765300]/65">Hours earned</p>
              </div>
            </div>
          </div>
          <div className="summary-card p-5">
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-500">Collected Revenue</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green ring-1 ring-brand-green/10">
                  <CheckCircle2 size={18} />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-brand-green">${collectedTotal.toFixed(2)}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-brand-green/65">Received</p>
              </div>
            </div>
          </div>
          <div className="summary-card p-5">
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-500">Expected Tutor Expense</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red ring-1 ring-brand-red/10">
                  <DollarSign size={18} />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-brand-red">${expectedTutorExpenseTotal.toFixed(2)}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-brand-red/60">Planned payout</p>
              </div>
            </div>
          </div>
          <div className="summary-card p-5">
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-500">Tutor Expense</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red ring-1 ring-brand-red/10">
                  <DollarSign size={18} />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-brand-red">${tutorExpenseTotal.toFixed(2)}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-brand-red/60">Earned payout</p>
              </div>
            </div>
          </div>
          <div className="summary-card p-5">
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-500">Expected Profit</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-green/10 text-sm font-black text-brand-green ring-1 ring-brand-green/10">
                  $
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-brand-green">${expectedProfitTotal.toFixed(2)}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-brand-green/65">After tutor pay</p>
              </div>
            </div>
          </div>
          <div className="summary-card p-5">
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-500">Earned Profit</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-green/10 text-sm font-black text-brand-green ring-1 ring-brand-green/10">
                  $
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-brand-green">${earnedProfitTotal.toFixed(2)}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-brand-green/65">Revenue minus payout</p>
              </div>
            </div>
          </div>
          <div className="summary-card p-5">
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-500">Completed Hours</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-green/10 text-sm font-black text-brand-green ring-1 ring-brand-green/10">
                  H
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-brand-green">{completedHoursTotal.toFixed(2)}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-brand-green/65">Logged</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card flex flex-col overflow-hidden rounded-4xl border border-white/70 shadow-podium-glass">
        <div className="flex items-center justify-between border-b border-brand-blue/10 bg-white/35 px-6 py-5">
          <div>
            <h2 className="text-lg font-black tracking-tight text-brand-ink">
              {activeTabConfig.label} Tuition Records
            </h2>
            {activeTab === 'center' && (
              <p className="mt-1 text-sm font-medium text-slate-500">
                Review payment status, update collected amounts, and save edits inline.
              </p>
            )}
            {activeTab === 'one-on-one' && (
              <p className="mt-1 text-sm font-medium text-slate-500">
                Track completed tutoring hours, earned revenue, and payment collection in one view.
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 size={32} className="animate-spin text-blue-500 mb-4" />
            <p className="text-slate-500 font-medium">Loading records...</p>
          </div>
        ) : displayedRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 p-8 text-center bg-white">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <DollarSign size={32} className="text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-700">No records found.</h2>
            <p className="text-slate-500 mt-2 max-w-md">
              Click "{activeTabConfig.setupLabel}" to automatically generate tuition records for active {activeTabConfig.label} students.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'center' ? (
              <table className="w-full min-w-max border-separate border-spacing-0 text-left">
              <thead>
                <tr className="bg-brand-blue/[0.035]">
                  <th className="sticky left-0 z-20 bg-[#fbfcff] px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500 shadow-[1px_0_0_0_rgba(7,49,149,0.08)]">Student</th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Type</th>
                  <th className="w-28 px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Expected</th>
                  <th className="w-36 px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Paid</th>
                  <th className="w-40 px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Status</th>
                  <th className="w-44 px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Payment Date</th>
                  <th className="w-40 px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Method</th>
                  <th className="min-w-[220px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-blue/5">
                {displayedRecords.map((record) => {
                  return (
                    <tr key={record.id} className="group transition-colors hover:bg-white/65">
                      <td className="sticky left-0 z-10 bg-white/85 px-6 py-4 font-semibold text-slate-800 shadow-[1px_0_0_0_rgba(7,49,149,0.06)] backdrop-blur group-hover:bg-[#fffdf8]">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-brand-blue/10 text-sm font-black text-brand-blue ring-1 ring-brand-blue/10">
                            {record.studentName?.charAt(0) || 'S'}
                          </span>
                          <span>{record.studentName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="status-badge status-badge-blue capitalize">
                          {record.studentType}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center text-sm font-bold text-slate-800">
                          <span className="mr-1 text-slate-400">$</span>
                          {record.expectedAmount}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="relative flex items-center">
                          <span className="pointer-events-none absolute left-3 text-sm font-semibold text-slate-400">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={record.paidAmount}
                            onChange={(e) => handleRecordChange(record.id, 'paidAmount', e.target.value)}
                            onBlur={() => handleRecordBlur(record.id)}
                            className="w-full rounded-2xl border border-brand-blue/10 bg-white/80 py-2.5 pl-7 pr-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition-all focus:border-brand-blue/50 focus:bg-white focus:ring-4 focus:ring-brand-blue/10"
                          />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={record.paymentStatus}
                          onChange={(e) => handleRecordChange(record.id, 'paymentStatus', e.target.value)}
                          onBlur={() => handleRecordBlur(record.id)}
                          className={`w-full rounded-full border px-3.5 py-2 text-sm font-black outline-none transition-all focus:ring-4 ${centerStatusStyles[record.paymentStatus]}`}
                        >
                          <option value="unpaid">Unpaid</option>
                          <option value="partial">Partial</option>
                          <option value="paid">Paid</option>
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <input
                          type="date"
                          value={record.paymentDate || ''}
                          onChange={(e) => handleRecordChange(record.id, 'paymentDate', e.target.value)}
                          onBlur={() => handleRecordBlur(record.id)}
                          className="w-full rounded-2xl border border-brand-blue/10 bg-white/80 px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-all focus:border-brand-blue/50 focus:bg-white focus:ring-4 focus:ring-brand-blue/10"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={record.paymentMethod || ''}
                          onChange={(e) => handleRecordChange(record.id, 'paymentMethod', e.target.value)}
                          onBlur={() => handleRecordBlur(record.id)}
                          className="w-full rounded-2xl border border-brand-blue/10 bg-white/80 px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-all focus:border-brand-blue/50 focus:bg-white focus:ring-4 focus:ring-brand-blue/10"
                        >
                          <option value="">- Select -</option>
                          <option value="cash">Cash</option>
                          <option value="zelle">Zelle</option>
                          <option value="check">Check</option>
                          <option value="card">Card</option>
                          <option value="other">Other</option>
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <input
                          type="text"
                          value={record.note || ''}
                          onChange={(e) => handleRecordChange(record.id, 'note', e.target.value)}
                          onBlur={() => handleRecordBlur(record.id)}
                          placeholder="Add note..."
                          className="w-full rounded-2xl border border-brand-blue/10 bg-white/80 px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-brand-blue/50 focus:bg-white focus:ring-4 focus:ring-brand-blue/10"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            ) : (
              <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="bg-brand-blue/[0.035]">
                    <th className="sticky left-0 z-20 bg-[#fbfcff] px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500 shadow-[1px_0_0_0_rgba(7,49,149,0.08)]">Student</th>
                    <th className="min-w-[150px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Tutor</th>
                    <th className="w-36 border-l border-brand-blue/10 bg-brand-blue/[0.025] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Expected Revenue</th>
                    <th className="w-36 bg-brand-blue/[0.025] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Expected Profit</th>
                    <th className="w-36 bg-brand-yellow/[0.07] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Earned Revenue</th>
                    <th className="w-36 bg-brand-yellow/[0.07] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Earned Profit</th>
                    <th className="w-32 border-l border-brand-green/15 bg-brand-green/[0.045] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Paid</th>
                    <th className="w-32 bg-brand-green/[0.045] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Status</th>
                    <th className="w-32 px-5 py-4 text-right text-xs font-black uppercase tracking-[0.14em] text-slate-500">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-blue/5">
                  {displayedRecords.map((record) => {
                    const metrics = getOneOnOneMetrics(record);

                    return (
                      <tr key={record.id} className="group transition-colors hover:bg-white/65">
                        <td className="sticky left-0 z-10 bg-white/85 px-6 py-4 font-semibold text-slate-800 shadow-[1px_0_0_0_rgba(7,49,149,0.06)] backdrop-blur group-hover:bg-[#fffdf8]">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-brand-blue/10 text-sm font-black text-brand-blue ring-1 ring-brand-blue/10">
                              {record.studentName?.charAt(0) || 'S'}
                            </span>
                            <span>{record.studentName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-slate-800">{record.tutorName || '—'}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-400">{record.tutorHourlyPay ? `${formatCurrency(record.tutorHourlyPay)}/hr` : 'No rate'}</p>
                        </td>
                        <td className="border-l border-brand-blue/5 bg-white/25 px-5 py-4 text-sm font-black text-slate-800">
                          {formatCurrency(record.expectedAmount)}
                        </td>
                        <td className="bg-white/25 px-5 py-4 text-sm font-black text-brand-green">
                          {metrics.expectedProfit === null ? '—' : formatCurrency(metrics.expectedProfit)}
                        </td>
                        <td className="bg-brand-yellow/[0.045] px-5 py-4 text-sm font-black text-[#765300]">
                          {metrics.earnedAmount === null ? '—' : formatCurrency(metrics.earnedAmount)}
                        </td>
                        <td className="bg-brand-yellow/[0.045] px-5 py-4 text-sm font-black text-slate-800">
                          {metrics.earnedProfit === null ? '—' : formatCurrency(metrics.earnedProfit)}
                        </td>
                        <td className="border-l border-brand-green/10 bg-brand-green/[0.03] px-5 py-4 text-sm font-black text-brand-green">
                          {formatCurrency(record.paidAmount)}
                        </td>
                        <td className="bg-brand-green/[0.03] px-5 py-4">
                          <span className={`inline-flex rounded-full border px-3.5 py-2 text-sm font-black ${centerStatusStyles[record.paymentStatus] || centerStatusStyles.unpaid}`}>
                            {getStatusLabel(record.paymentStatus)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(record.id)}
                            className="focus-ring inline-flex items-center justify-center rounded-full border border-brand-blue/10 bg-white/80 px-4 py-2 text-sm font-black text-brand-blue shadow-sm transition-all hover:-translate-y-0.5 hover:bg-brand-blue hover:text-white hover:shadow-podium-soft"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {selectedRecord && selectedMetrics && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close tuition details"
            onClick={handleCloseDetails}
            className="absolute inset-0 cursor-default"
          />
          <aside className="relative flex h-full w-full max-w-3xl flex-col overflow-hidden border-l border-white/70 bg-[#fbfcff] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-brand-blue/10 bg-white/75 p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-blue/60">1:1 Tuition Details</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-brand-ink">{selectedRecord.studentName}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
              </div>
              <button
                type="button"
                onClick={handleCloseDetails}
                className="focus-ring rounded-full p-2.5 text-slate-400 transition-colors hover:bg-brand-blue/10 hover:text-brand-blue"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Student & Tutor</h4>
                  <span className={`inline-flex rounded-full border px-3.5 py-2 text-sm font-black ${centerStatusStyles[selectedRecord.paymentStatus] || centerStatusStyles.unpaid}`}>
                    {getStatusLabel(selectedRecord.paymentStatus)}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <DetailValue label="Student" value={selectedRecord.studentName || '—'} />
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Tutor Name</label>
                    <input
                      type="text"
                      value={selectedRecord.tutorName || ''}
                      onChange={(e) => handleRecordChange(selectedRecord.id, 'tutorName', e.target.value)}
                      className="input-field"
                      placeholder="Tutor name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Tutor Hourly Pay</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={selectedRecord.tutorHourlyPay ?? ''}
                        onChange={(e) => handleRecordChange(selectedRecord.id, 'tutorHourlyPay', e.target.value)}
                        className="input-field pl-10"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Revenue & Hours</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <DetailValue label="Expected Amount" value={formatCurrency(selectedRecord.expectedAmount)} />
                  <DetailValue label="Expected Tutoring Hours" value={formatNumber(selectedRecord.expectedTutoringHours)} />
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Completed Tutoring Hours</label>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={selectedRecord.completedTutoringHours ?? ''}
                      onChange={(e) => handleRecordChange(selectedRecord.id, 'completedTutoringHours', e.target.value)}
                      className="input-field"
                      placeholder="0"
                    />
                  </div>
                  <DetailValue label="Client Hourly Rate" value={selectedMetrics.hourlyRate === null ? '—' : formatCurrency(selectedMetrics.hourlyRate)} />
                  <DetailValue label="Earned Revenue" value={selectedMetrics.earnedAmount === null ? '—' : formatCurrency(selectedMetrics.earnedAmount)} tone="text-[#765300]" />
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Tutor Expense & Profit</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <DetailValue label="Expected Tutor Expense" value={selectedMetrics.expectedTutorExpense === null ? '—' : formatCurrency(selectedMetrics.expectedTutorExpense)} />
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Tutor Expense</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={selectedRecord.tutorExpense ?? ''}
                        onChange={(e) => handleRecordChange(selectedRecord.id, 'tutorExpense', e.target.value)}
                        className="input-field pl-10"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <DetailValue label="Expected Profit" value={selectedMetrics.expectedProfit === null ? '—' : formatCurrency(selectedMetrics.expectedProfit)} tone="text-brand-green" />
                  <DetailValue label="Earned Profit" value={selectedMetrics.earnedProfit === null ? '—' : formatCurrency(selectedMetrics.earnedProfit)} tone="text-brand-green" />
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Payment</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Paid Amount</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={selectedRecord.paidAmount}
                        onChange={(e) => handleRecordChange(selectedRecord.id, 'paidAmount', e.target.value)}
                        className="input-field pl-10"
                      />
                    </div>
                  </div>
                  <DetailValue label="Payment Status" value={getStatusLabel(selectedRecord.paymentStatus)} />
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Payment Date</label>
                    <input
                      type="date"
                      value={selectedRecord.paymentDate || ''}
                      onChange={(e) => handleRecordChange(selectedRecord.id, 'paymentDate', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Payment Method</label>
                    <select
                      value={selectedRecord.paymentMethod || ''}
                      onChange={(e) => handleRecordChange(selectedRecord.id, 'paymentMethod', e.target.value)}
                      className="select-field"
                    >
                      <option value="">- Select -</option>
                      <option value="cash">Cash</option>
                      <option value="zelle">Zelle</option>
                      <option value="check">Check</option>
                      <option value="card">Card</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Note</label>
                    <textarea
                      value={selectedRecord.note || ''}
                      onChange={(e) => handleRecordChange(selectedRecord.id, 'note', e.target.value)}
                      rows={4}
                      className="input-field resize-y"
                      placeholder="Add note..."
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-brand-blue/10 bg-white/80 p-5">
              <button
                type="button"
                onClick={handleCloseDetails}
                className="btn-secondary"
                disabled={drawerSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDrawerSave}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-55"
                disabled={drawerSaving}
              >
                {drawerSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Save Details
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default Tuition;
