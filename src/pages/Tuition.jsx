import { useState, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  calculateEarnedAmount,
  calculateExpectedTutorExpense,
  calculateHourlyRate,
  calculatePaymentStatus,
  calculateProfit,
  calculateTutorExpense,
  getTuitionRecordsForMonth,
  generateTuitionRecordsForMonth,
  isRecordPaused,
  pauseTuitionRecord,
  resumeTuitionRecord,
  saveTuitionRecord
} from '../services/tuitionService';
import { ChevronLeft, ChevronRight, Loader2, DollarSign, AlertCircle, CheckCircle2, X, Save, PauseCircle, PlayCircle, CircleHelp } from 'lucide-react';

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

const formatCompactNumber = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '—';
  }

  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
};

const getProfitTone = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount === 0) {
    return 'text-slate-500';
  }

  return amount > 0 ? 'text-brand-green' : 'text-brand-red';
};

const getStudentSubline = (record) => {
  const details = [];

  if (record.grade) {
    details.push(`Grade ${record.grade}`);
  }

  if (Array.isArray(record.subjects) && record.subjects.length > 0) {
    details.push(record.subjects.join(', '));
  } else if (record.subject) {
    details.push(record.subject);
  }

  return details.join(' / ');
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

const oneOnOneSummaryTooltips = {
  expectedRevenue: {
    title: 'Expected Revenue',
    description: 'Total amount expected from active 1:1 students for the selected month.',
    formula: 'Sum of Expected Amount for active 1:1 records.',
    note: 'Paused students are excluded.',
  },
  earnedRevenue: {
    title: 'Earned Revenue',
    description: 'Revenue earned so far based on completed tutoring hours.',
    formula: 'Completed Hours x Client Hourly Rate.',
    note: 'Client Hourly Rate = Expected Amount / Expected Hours. Paused students are excluded.',
  },
  collected: {
    title: 'Collected',
    description: 'Total amount actually paid by parents so far this month.',
    formula: 'Sum of Paid Amount.',
    note: 'Paused students are excluded.',
  },
  expectedProfit: {
    title: 'Expected Profit',
    description: 'Projected monthly profit after expected tutor cost.',
    formula: 'Expected Revenue - Expected Tutor Expense.',
    note: 'Expected Tutor Expense = Expected Hours x Tutor Hourly Pay.',
  },
  earnedProfit: {
    title: 'Earned Profit',
    description: 'Profit earned so far based on completed tutoring hours and tutor cost.',
    formula: 'Earned Revenue - Tutor Expense.',
    note: 'Tutor Expense defaults to Completed Hours x Tutor Hourly Pay, but it may be manually edited.',
  },
  paused: {
    title: 'Paused',
    description: 'Number of paused 1:1 tuition records for the selected month.',
    formula: 'Count of records where Paused = true.',
    note: 'Paused students remain visible but do not count toward totals.',
  },
};

const drawerMetricTooltips = {
  clientHourlyRate: {
    title: 'Client Hourly Rate',
    description: 'Revenue rate charged to the student per tutoring hour.',
    formula: 'Expected Amount / Expected Hours.',
  },
  earnedRevenue: {
    title: 'Earned Revenue',
    description: 'Revenue earned so far from this student based on completed hours.',
    formula: 'Completed Hours x Client Hourly Rate.',
  },
  expectedTutorExpense: {
    title: 'Expected Tutor Expense',
    description: 'Projected tutor cost for the full month.',
    formula: 'Expected Hours x Tutor Hourly Pay.',
  },
  tutorExpense: {
    title: 'Tutor Expense',
    description: 'Actual tutor cost used for earned profit calculation.',
    formula: 'Defaults to Completed Hours x Tutor Hourly Pay.',
    note: 'This field can be manually edited.',
  },
  expectedProfit: {
    title: 'Expected Profit',
    description: 'Projected monthly profit for this student.',
    formula: 'Expected Amount - Expected Tutor Expense.',
  },
  earnedProfit: {
    title: 'Earned Profit',
    description: 'Profit earned so far for this student.',
    formula: 'Earned Revenue - Tutor Expense.',
  },
  completedHours: {
    title: 'Completed Hours',
    description: 'Number of tutoring hours completed so far this month.',
    formula: 'Manually entered.',
    note: 'This affects earned revenue, tutor expense, and earned profit.',
  },
};

const MetricInfoTooltip = ({ title, description, formula, note }) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const buttonRef = useRef(null);
  const tooltipRef = useRef(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!open || typeof window === 'undefined') {
      return undefined;
    }

    const updatePosition = () => {
      if (!buttonRef.current) {
        return;
      }

      const iconRect = buttonRef.current.getBoundingClientRect();
      const tooltipWidth = 288;
      const tooltipHeight = tooltipRef.current?.offsetHeight || 180;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const viewportGap = 12;
      const iconGap = 10;

      const maxLeft = Math.max(viewportGap, viewportWidth - tooltipWidth - viewportGap);
      const centeredLeft = iconRect.left + (iconRect.width / 2) - (tooltipWidth / 2);
      const nextLeft = Math.min(Math.max(centeredLeft, viewportGap), maxLeft);
      const belowTop = iconRect.bottom + iconGap;
      const aboveTop = iconRect.top - tooltipHeight - iconGap;
      const hasRoomBelow = belowTop + tooltipHeight <= viewportHeight - viewportGap;
      const hasRoomAbove = aboveTop >= viewportGap;
      const preferredTop = hasRoomBelow || !hasRoomAbove ? belowTop : aboveTop;
      const maxTop = Math.max(viewportGap, viewportHeight - tooltipHeight - viewportGap);
      const nextTop = Math.min(Math.max(preferredTop, viewportGap), maxTop);

      setPosition({ left: nextLeft, top: nextTop });
    };

    const handlePointerDown = (event) => {
      if (
        buttonRef.current?.contains(event.target)
        || tooltipRef.current?.contains(event.target)
      ) {
        return;
      }

      setOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    updatePosition();
    const animationFrame = window.requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const tooltipContent = open && typeof document !== 'undefined'
    ? createPortal(
      <div
        ref={tooltipRef}
        id={tooltipId}
        role="tooltip"
        style={{ left: `${position.left}px`, top: `${position.top}px` }}
        className="pointer-events-none fixed z-[9999] w-72 rounded-3xl border border-white/80 bg-[#fffdf8]/95 p-4 text-left opacity-100 shadow-podium-glass backdrop-blur"
      >
        <span className="block text-sm font-black text-brand-ink">{title}</span>
        {description && (
          <span className="mt-2 block text-xs font-semibold leading-5 text-slate-600">{description}</span>
        )}
        {formula && (
          <span className="mt-3 block rounded-2xl border border-brand-blue/10 bg-white/70 px-3 py-2 text-xs font-bold leading-5 text-brand-blue">
            {formula}
          </span>
        )}
        {note && (
          <span className="mt-2 block text-xs font-semibold leading-5 text-slate-500">{note}</span>
        )}
      </div>,
      document.body
    )
    : null;

  return (
    <span
      className="inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={`More info about ${title}`}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        onFocus={() => setOpen(true)}
        className="focus-ring inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-brand-blue/10 hover:text-brand-blue focus:bg-brand-blue/10 focus:text-brand-blue"
      >
        <CircleHelp size={14} strokeWidth={2.4} />
      </button>
      {tooltipContent}
    </span>
  );
};

const MetricLabel = ({ children, tooltip }) => (
  <span className="inline-flex items-center gap-1.5">
    <span>{children}</span>
    {tooltip && <MetricInfoTooltip {...tooltip} />}
  </span>
);

const DetailValue = ({ label, value, tone = 'text-slate-800', tooltip }) => (
  <div className="rounded-3xl border border-brand-blue/10 bg-white/70 p-4 shadow-sm">
    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
      <MetricLabel tooltip={tooltip}>{label}</MetricLabel>
    </p>
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
  const [pauseTargetRecord, setPauseTargetRecord] = useState(null);
  const [pauseReason, setPauseReason] = useState('');
  const [pauseNote, setPauseNote] = useState('');
  const [pauseSaving, setPauseSaving] = useState(false);
  const [pauseError, setPauseError] = useState('');

  const tabs = [
    { id: 'center', label: 'Center', setupLabel: 'Set up Center Tuition' },
    { id: 'one-on-one', label: '1:1', setupLabel: 'Set up 1:1 Tuition' },
  ];
  const activeTabConfig = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const displayedRecords = records.filter((record) => record.studentType === activeTab);
  const activeDisplayedRecords = displayedRecords.filter(record => !isRecordPaused(record));
  const pausedDisplayedCount = displayedRecords.filter(record => isRecordPaused(record)).length;
  const selectedRecord = selectedRecordId ? records.find((record) => record.id === selectedRecordId) : null;
  const isOverlayOpen = Boolean(selectedRecord) || Boolean(pauseTargetRecord);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  useEffect(() => {
    if (!isOverlayOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOverlayOpen]);

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

  const mergeRecordUpdate = (recordId, update) => {
    setRecords((prevRecords) => prevRecords.map((record) => (
      record.id === recordId ? { ...record, ...update } : record
    )));
  };

  const handleOpenPauseModal = (record) => {
    setPauseTargetRecord(record);
    setPauseReason(record.pauseReason || '');
    setPauseNote(record.pauseNote || '');
    setPauseError('');
  };

  const handleClosePauseModal = () => {
    if (pauseSaving) {
      return;
    }

    setPauseTargetRecord(null);
    setPauseReason('');
    setPauseNote('');
    setPauseError('');
  };

  const handleConfirmPause = async () => {
    if (!pauseTargetRecord) {
      return;
    }

    setPauseSaving(true);
    setPauseError('');

    try {
      const pauseUpdate = await pauseTuitionRecord(pauseTargetRecord.id, {
        pauseReason,
        pauseNote,
      });
      mergeRecordUpdate(pauseTargetRecord.id, pauseUpdate);
      showSavedFeedback('Paused');
      setPauseTargetRecord(null);
      setPauseReason('');
      setPauseNote('');
    } catch (err) {
      console.error("Failed to pause tuition record", err);
      setPauseError("Failed to pause record. Please try again.");
    } finally {
      setPauseSaving(false);
    }
  };

  const handleResumeRecord = async (record) => {
    const confirmed = window.confirm(`Resume tuition record for ${record.studentName}?`);

    if (!confirmed) {
      return;
    }

    setError('');

    try {
      const resumeUpdate = await resumeTuitionRecord(record.id);
      mergeRecordUpdate(record.id, resumeUpdate);
      showSavedFeedback('Resumed');
    } catch (err) {
      console.error("Failed to resume tuition record", err);
      setError("Failed to resume record. Please try again.");
    }
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
  const expectedTotal = activeDisplayedRecords.reduce((sum, r) => sum + (Number(r.expectedAmount) || 0), 0);
  const collectedTotal = activeDisplayedRecords.reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);
  const remainingTotal = expectedTotal - collectedTotal;
  const earnedTotal = activeDisplayedRecords.reduce((sum, r) => sum + getEarnedAmount(r), 0);
  const expectedHoursTotal = activeDisplayedRecords.reduce((sum, r) => sum + (Number(r.expectedTutoringHours) || 0), 0);
  const completedHoursTotal = activeDisplayedRecords.reduce((sum, r) => sum + (Number(r.completedTutoringHours) || 0), 0);
  const expectedTutorExpenseTotal = activeDisplayedRecords.reduce((sum, r) => sum + (Number(getOneOnOneMetrics(r).expectedTutorExpense) || 0), 0);
  const tutorExpenseTotal = activeDisplayedRecords.reduce((sum, r) => sum + (Number(getOneOnOneMetrics(r).tutorExpense) || 0), 0);
  const expectedProfitTotal = activeDisplayedRecords.reduce((sum, r) => sum + (Number(getOneOnOneMetrics(r).expectedProfit) || 0), 0);
  const earnedProfitTotal = activeDisplayedRecords.reduce((sum, r) => sum + (Number(getOneOnOneMetrics(r).earnedProfit) || 0), 0);
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
        <span className="ml-2 inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
          Paused: {pausedDisplayedCount}
        </span>
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="summary-card p-5">
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-500">
                  <MetricLabel tooltip={oneOnOneSummaryTooltips.expectedRevenue}>Expected Revenue</MetricLabel>
                </p>
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
                <p className="text-sm font-bold text-slate-500">
                  <MetricLabel tooltip={oneOnOneSummaryTooltips.earnedRevenue}>Earned Revenue</MetricLabel>
                </p>
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
                <p className="text-sm font-bold text-slate-500">
                  <MetricLabel tooltip={oneOnOneSummaryTooltips.collected}>Collected</MetricLabel>
                </p>
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
                <p className="text-sm font-bold text-slate-500">
                  <MetricLabel tooltip={oneOnOneSummaryTooltips.expectedProfit}>Expected Profit</MetricLabel>
                </p>
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
                <p className="text-sm font-bold text-slate-500">
                  <MetricLabel tooltip={oneOnOneSummaryTooltips.earnedProfit}>Earned Profit</MetricLabel>
                </p>
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
                <p className="text-sm font-bold text-slate-500">
                  <MetricLabel tooltip={oneOnOneSummaryTooltips.paused}>Paused</MetricLabel>
                </p>
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                  <PauseCircle size={18} />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-slate-600">{pausedDisplayedCount}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Excluded from totals</p>
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
                  <th className="w-36 px-5 py-4 text-right text-xs font-black uppercase tracking-[0.14em] text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-blue/5">
                {displayedRecords.map((record) => {
                  const paused = isRecordPaused(record);

                  return (
                    <tr key={record.id} className={`group transition-colors hover:bg-white/65 ${paused ? 'bg-slate-100/60 text-slate-500' : ''}`}>
                      <td className={`sticky left-0 z-10 px-6 py-4 font-semibold shadow-[1px_0_0_0_rgba(7,49,149,0.06)] backdrop-blur group-hover:bg-[#fffdf8] ${paused ? 'bg-slate-100/90 text-slate-500' : 'bg-white/85 text-slate-800'}`}>
                        <div className="flex items-center gap-3">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm font-black ring-1 ${paused ? 'bg-slate-200 text-slate-500 ring-slate-300' : 'bg-brand-blue/10 text-brand-blue ring-brand-blue/10'}`}>
                            {record.studentName?.charAt(0) || 'S'}
                          </span>
                          <span>{record.studentName}</span>
                          {paused && (
                            <span className="inline-flex rounded-full border border-slate-300 bg-slate-200 px-2.5 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                              Paused
                            </span>
                          )}
                        </div>
                        {paused && (
                          <p className="mt-2 text-xs font-bold text-slate-400">Excluded from this month&apos;s totals</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`status-badge capitalize ${paused ? 'border-slate-300 bg-slate-100 text-slate-500' : 'status-badge-blue'}`}>
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
                      <td className="px-5 py-4 text-right">
                        {paused ? (
                          <button
                            type="button"
                            onClick={() => handleResumeRecord(record)}
                            className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-brand-green/20 bg-white/85 px-4 py-2 text-sm font-black text-brand-green shadow-sm transition-all hover:-translate-y-0.5 hover:bg-brand-green hover:text-white hover:shadow-podium-soft"
                          >
                            <PlayCircle size={16} />
                            Resume
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenPauseModal(record)}
                            className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-black text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800"
                          >
                            <PauseCircle size={16} />
                            Pause
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            ) : (
              <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="bg-brand-blue/[0.035]">
                    <th className="sticky left-0 z-20 bg-[#fbfcff] px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500 shadow-[1px_0_0_0_rgba(7,49,149,0.08)]">Student</th>
                    <th className="min-w-[150px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Tutor</th>
                    <th className="w-32 px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Hours</th>
                    <th className="w-32 px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Expected</th>
                    <th className="w-32 px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Earned</th>
                    <th className="w-36 px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Expected Profit</th>
                    <th className="w-36 px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Earned Profit</th>
                    <th className="w-40 px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Paid</th>
                    <th className="w-32 px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Status</th>
                    <th className="w-32 px-5 py-4 text-right text-xs font-black uppercase tracking-[0.14em] text-slate-500">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-blue/5">
                  {displayedRecords.map((record) => {
                    const metrics = getOneOnOneMetrics(record);
                    const paused = isRecordPaused(record);
                    const studentSubline = getStudentSubline(record);
                    const expectedProfitTone = paused ? 'text-slate-500' : getProfitTone(metrics.expectedProfit);
                    const earnedProfitTone = paused ? 'text-slate-500' : getProfitTone(metrics.earnedProfit);

                    return (
                      <tr key={record.id} className={`group transition-colors hover:bg-white/60 ${paused ? 'bg-slate-100/60 text-slate-500' : 'bg-white/35'}`}>
                        <td className={`sticky left-0 z-10 px-6 py-4 font-semibold shadow-[1px_0_0_0_rgba(7,49,149,0.06)] backdrop-blur group-hover:bg-[#fffdf8] ${paused ? 'bg-slate-100/90 text-slate-500' : 'bg-white/85 text-slate-800'}`}>
                          <div className="flex items-start gap-3">
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm font-black ring-1 ${paused ? 'bg-slate-200 text-slate-500 ring-slate-300' : 'bg-brand-blue/10 text-brand-blue ring-brand-blue/10'}`}>
                              {record.studentName?.charAt(0) || 'S'}
                            </span>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span>{record.studentName}</span>
                                {paused && (
                                  <span className="inline-flex rounded-full border border-slate-300 bg-slate-200 px-2.5 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                                    Paused
                                  </span>
                                )}
                              </div>
                              {studentSubline && (
                                <p className="mt-1 text-xs font-semibold text-slate-400">{studentSubline}</p>
                              )}
                            </div>
                          </div>
                          {paused && (
                            <p className="mt-2 text-xs font-bold text-slate-400">Excluded from this month&apos;s totals</p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <p className={`text-sm font-bold ${paused ? 'text-slate-500' : 'text-slate-800'}`}>{record.tutorName || '—'}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-400">{record.tutorHourlyPay ? `${formatCurrency(record.tutorHourlyPay)}/hr` : 'No rate'}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className={`text-sm font-black ${paused ? 'text-slate-500' : 'text-slate-800'}`}>
                            {formatCompactNumber(record.completedTutoringHours)} / {formatCompactNumber(record.expectedTutoringHours)} hrs
                          </p>
                        </td>
                        <td className={`px-5 py-4 text-sm font-black ${paused ? 'text-slate-500' : 'text-slate-800'}`}>
                          {formatCurrency(record.expectedAmount)}
                        </td>
                        <td className={`px-5 py-4 text-sm font-black ${paused ? 'text-slate-500' : 'text-[#765300]'}`}>
                          {metrics.earnedAmount === null ? '—' : formatCurrency(metrics.earnedAmount)}
                        </td>
                        <td className={`px-5 py-4 text-sm font-black ${expectedProfitTone}`}>
                          {metrics.expectedProfit === null ? '—' : formatCurrency(metrics.expectedProfit)}
                        </td>
                        <td className={`px-5 py-4 text-sm font-black ${earnedProfitTone}`}>
                          {metrics.earnedProfit === null ? '—' : formatCurrency(metrics.earnedProfit)}
                        </td>
                        <td className={`px-5 py-4 text-sm font-black ${paused ? 'text-slate-500' : 'text-brand-green'}`}>
                          {formatCurrency(record.paidAmount)} <span className="text-slate-400">/ {formatCurrency(record.expectedAmount)}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full border px-3.5 py-2 text-sm font-black ${paused ? 'border-slate-300 bg-slate-100 text-slate-500' : centerStatusStyles[record.paymentStatus] || centerStatusStyles.unpaid}`}>
                            {paused ? 'Paused' : getStatusLabel(record.paymentStatus)}
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

      {selectedRecord && selectedMetrics && createPortal(
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
              <section className={`rounded-3xl border p-4 ${isRecordPaused(selectedRecord) ? 'border-slate-300 bg-slate-100/80' : 'border-brand-blue/10 bg-white/70'}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Pause Status</h4>
                      {isRecordPaused(selectedRecord) && (
                        <span className="inline-flex rounded-full border border-slate-300 bg-slate-200 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                          Paused
                        </span>
                      )}
                    </div>
                    {isRecordPaused(selectedRecord) ? (
                      <p className="mt-2 text-sm font-bold text-slate-500">Excluded from this month&apos;s totals.</p>
                    ) : (
                      <p className="mt-2 text-sm font-semibold text-slate-500">Active for this month.</p>
                    )}
                  </div>
                  {isRecordPaused(selectedRecord) ? (
                    <button
                      type="button"
                      onClick={() => handleResumeRecord(selectedRecord)}
                      className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-brand-green/20 bg-white/85 px-4 py-2 text-sm font-black text-brand-green shadow-sm transition-all hover:-translate-y-0.5 hover:bg-brand-green hover:text-white hover:shadow-podium-soft"
                    >
                      <PlayCircle size={16} />
                      Resume
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenPauseModal(selectedRecord)}
                      className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-black text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800"
                    >
                      <PauseCircle size={16} />
                      Pause
                    </button>
                  )}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Student & Tutor</h4>
                  <div className="flex flex-wrap justify-end gap-2">
                    {isRecordPaused(selectedRecord) && (
                      <span className="inline-flex rounded-full border border-slate-300 bg-slate-200 px-3.5 py-2 text-sm font-black text-slate-600">
                        Paused
                      </span>
                    )}
                    <span className={`inline-flex rounded-full border px-3.5 py-2 text-sm font-black ${centerStatusStyles[selectedRecord.paymentStatus] || centerStatusStyles.unpaid}`}>
                      {getStatusLabel(selectedRecord.paymentStatus)}
                    </span>
                  </div>
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
                    <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      <MetricLabel tooltip={drawerMetricTooltips.completedHours}>Completed Tutoring Hours</MetricLabel>
                    </label>
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
                  <DetailValue label="Client Hourly Rate" value={selectedMetrics.hourlyRate === null ? '—' : formatCurrency(selectedMetrics.hourlyRate)} tooltip={drawerMetricTooltips.clientHourlyRate} />
                  <DetailValue label="Earned Revenue" value={selectedMetrics.earnedAmount === null ? '—' : formatCurrency(selectedMetrics.earnedAmount)} tone="text-[#765300]" tooltip={drawerMetricTooltips.earnedRevenue} />
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Tutor Expense & Profit</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <DetailValue label="Expected Tutor Expense" value={selectedMetrics.expectedTutorExpense === null ? '—' : formatCurrency(selectedMetrics.expectedTutorExpense)} tooltip={drawerMetricTooltips.expectedTutorExpense} />
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      <MetricLabel tooltip={drawerMetricTooltips.tutorExpense}>Tutor Expense</MetricLabel>
                    </label>
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
                  <DetailValue label="Expected Profit" value={selectedMetrics.expectedProfit === null ? '—' : formatCurrency(selectedMetrics.expectedProfit)} tone="text-brand-green" tooltip={drawerMetricTooltips.expectedProfit} />
                  <DetailValue label="Earned Profit" value={selectedMetrics.earnedProfit === null ? '—' : formatCurrency(selectedMetrics.earnedProfit)} tone="text-brand-green" tooltip={drawerMetricTooltips.earnedProfit} />
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
        </div>,
        document.body
      )}

      {pauseTargetRecord && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close pause modal"
            onClick={handleClosePauseModal}
            className="absolute inset-0 cursor-default"
          />
          <div className="relative w-full max-w-lg rounded-4xl border border-white/70 bg-[#fbfcff] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-blue/60">Pause Tuition Record</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-brand-ink">{pauseTargetRecord.studentName}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">Excluded from this month&apos;s totals</p>
              </div>
              <button
                type="button"
                onClick={handleClosePauseModal}
                className="focus-ring rounded-full p-2.5 text-slate-400 transition-colors hover:bg-brand-blue/10 hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-50"
                disabled={pauseSaving}
              >
                <X size={20} />
              </button>
            </div>

            {pauseError && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                {pauseError}
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Pause Reason</label>
                <input
                  type="text"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  className="input-field"
                  placeholder="Optional reason"
                  disabled={pauseSaving}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Pause Note</label>
                <textarea
                  value={pauseNote}
                  onChange={(e) => setPauseNote(e.target.value)}
                  rows={4}
                  className="input-field resize-y"
                  placeholder="Optional note"
                  disabled={pauseSaving}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClosePauseModal}
                className="btn-secondary"
                disabled={pauseSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPause}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-55"
                disabled={pauseSaving}
              >
                {pauseSaving ? <Loader2 size={18} className="animate-spin" /> : <PauseCircle size={18} />}
                Pause
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Tuition;
