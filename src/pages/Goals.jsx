import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, Clock, Edit3, Flag, Loader2, Plus, Save, Target, TrendingUp, UserRound, X } from 'lucide-react';
import { addGoal, getGoalsByQuarter, updateGoal } from '../services/goalService';
import { calculateGoalSummary, getCurrentQuarter, getQuarterFromDate, getTimeRemaining } from '../utils/goalUtils';
import { useAuth } from '../context/AuthContext';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const OWNERS = ['Abir', 'Rahat', 'Both'];
const PRIORITIES = ['P0', 'P1', 'P2'];
const STATUSES = ['Not Started', 'In Progress', 'Done', 'Blocked'];
const PROGRESS_WIDTH_CLASSES = {
  0: 'w-0',
  5: 'w-[5%]',
  10: 'w-[10%]',
  15: 'w-[15%]',
  20: 'w-1/5',
  25: 'w-1/4',
  30: 'w-[30%]',
  35: 'w-[35%]',
  40: 'w-2/5',
  45: 'w-[45%]',
  50: 'w-1/2',
  55: 'w-[55%]',
  60: 'w-3/5',
  65: 'w-[65%]',
  70: 'w-[70%]',
  75: 'w-3/4',
  80: 'w-4/5',
  85: 'w-[85%]',
  90: 'w-[90%]',
  95: 'w-[95%]',
  100: 'w-full',
};

const ownerBadgeStyles = {
  Abir: 'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
  Rahat: 'bg-brand-yellow/20 text-[#765300] border-brand-yellow/45',
  Both: 'bg-brand-green/10 text-brand-green border-brand-green/20',
};

const priorityBadgeStyles = {
  P0: 'bg-brand-red/10 text-brand-red border-brand-red/20',
  P1: 'bg-brand-yellow/20 text-[#765300] border-brand-yellow/45',
  P2: 'bg-brand-blue/10 text-slate-600 border-brand-blue/15',
};

const priorityCardStyles = {
  P0: {
    article: 'border-brand-red/20 shadow-red-100',
    stripe: 'bg-gradient-to-r from-brand-red via-red-500 to-orange-400',
    progress: 'from-brand-red to-orange-500',
    countdown: 'bg-brand-red/10 text-brand-red border-brand-red/20',
  },
  P1: {
    article: 'border-brand-yellow/35 shadow-yellow-100',
    stripe: 'bg-gradient-to-r from-orange-500 via-brand-yellow to-brand-blue',
    progress: 'from-orange-500 to-brand-yellow',
    countdown: 'bg-brand-yellow/20 text-yellow-900 border-brand-yellow/30',
  },
  P2: {
    article: 'border-brand-blue/10 shadow-blue-100',
    stripe: 'bg-gradient-to-r from-slate-300 via-brand-blue to-slate-400',
    progress: 'from-brand-blue to-slate-500',
    countdown: 'bg-white/70 text-slate-700 border-brand-blue/10',
  },
};

const statusBadgeStyles = {
  'Not Started': 'bg-slate-100 text-slate-600 border-slate-200',
  'In Progress': 'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
  Done: 'bg-brand-green/10 text-brand-green border-brand-green/20',
  Blocked: 'bg-brand-red/10 text-brand-red border-brand-red/20',
};

const statusCardStyles = {
  'Not Started': 'bg-white/70 text-slate-600 border-brand-blue/10',
  'In Progress': 'bg-gradient-to-r from-brand-blue/10 to-brand-yellow/20 text-brand-blue border-brand-blue/20',
  Done: 'bg-brand-green/10 text-brand-green border-brand-green/20',
  Blocked: 'bg-brand-red/10 text-brand-red border-brand-red/20',
};

const summaryCards = [
  { key: 'totalGoals', label: 'Total Goals', icon: Target, color: 'bg-brand-blue/10 text-brand-blue ring-brand-blue/10' },
  { key: 'doneGoals', label: 'Done', icon: Flag, color: 'bg-brand-green/10 text-brand-green ring-brand-green/10' },
  { key: 'inProgressGoals', label: 'In Progress', icon: TrendingUp, color: 'bg-brand-blue/10 text-brand-blue ring-brand-blue/10' },
  { key: 'blockedGoals', label: 'Blocked', icon: AlertCircle, color: 'bg-brand-red/10 text-brand-red ring-brand-red/10' },
  { key: 'averageProgress', label: 'Average Progress', icon: Clock, color: 'bg-brand-yellow/20 text-[#765300] ring-brand-yellow/20', suffix: '%' },
];

const formatDate = (dateString) => {
  if (!dateString) {
    return 'Not set';
  }

  const [year, month, day] = dateString.split('-').map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return 'Not set';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatCountdown = (endDate, status) => {
  if (status === 'Done') {
    return 'Completed';
  }

  if (!endDate) {
    return 'No deadline set';
  }

  try {
    const timeRemaining = getTimeRemaining(endDate);
    const { months, days, hours, isOverdue } = timeRemaining;

    if (isOverdue) {
      return `Overdue by ${days} days, ${hours} hours`;
    }

    return `${months} months, ${days} days, ${hours} hours left`;
  } catch (error) {
    console.error("Failed to calculate goal countdown", error);
    return 'Deadline unavailable';
  }
};

const getProgressWidthClass = (progress) => {
  const roundedProgress = Math.round(progress / 5) * 5;
  return PROGRESS_WIDTH_CLASSES[roundedProgress] || PROGRESS_WIDTH_CLASSES[0];
};

const getDateParts = (dateString) => {
  if (!dateString) {
    return null;
  }

  const [year] = dateString.split('-').map(Number);

  if (!Number.isInteger(year)) {
    return null;
  }

  return {
    quarter: getQuarterFromDate(dateString),
    year,
  };
};

const getDetectedQuarterYear = (startDate, endDate) => {
  try {
    return getDateParts(startDate) || getDateParts(endDate);
  } catch (error) {
    console.error("Failed to detect goal quarter/year", error);
    return null;
  }
};

const createEmptyForm = (year, quarter) => ({
  goalDescription: '',
  owner: 'Both',
  priority: 'P1',
  progress: 0,
  startDate: '',
  endDate: '',
  status: 'Not Started',
  notes: '',
  quarter,
  year,
});

const Goals = () => {
  const { currentUser } = useAuth();
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(getCurrentQuarter());
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState(() => createEmptyForm(new Date().getFullYear(), getCurrentQuarter()));
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [manualQuarter, setManualQuarter] = useState(false);
  const [manualYear, setManualYear] = useState(false);
  const [timerTick, setTimerTick] = useState(Date.now());

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const optionSet = new Set([currentYear - 1, currentYear, currentYear + 1, currentYear + 2, selectedYear, Number(formData.year)]);
    return Array.from(optionSet).filter(Number.isInteger).sort((a, b) => a - b);
  }, [formData.year, selectedYear]);

  const summary = useMemo(() => calculateGoalSummary(goals), [goals]);

  const loadGoals = async (year = selectedYear, quarter = selectedQuarter) => {
    setLoading(true);
    setError('');

    try {
      const data = await getGoalsByQuarter(year, quarter);
      setGoals(data);
    } catch (err) {
      console.error("Failed to load goals", err);
      setError('Failed to load goals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedQuarter]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimerTick(Date.now());
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 2500);
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingGoal(null);
    setFormError('');
    setSaving(false);
  };

  const openAddModal = () => {
    setFormData(createEmptyForm(selectedYear, selectedQuarter));
    setManualQuarter(false);
    setManualYear(false);
    setFormError('');
    setEditingGoal(null);
    setModalMode('add');
  };

  const openEditModal = (goal) => {
    setFormData({
      goalDescription: goal.goalDescription || '',
      owner: goal.owner || 'Both',
      priority: goal.priority || 'P1',
      progress: Number(goal.progress) || 0,
      startDate: goal.startDate || '',
      endDate: goal.endDate || '',
      status: goal.status || 'Not Started',
      notes: goal.notes || '',
      quarter: goal.quarter || selectedQuarter,
      year: Number(goal.year) || selectedYear,
    });
    setManualQuarter(false);
    setManualYear(false);
    setFormError('');
    setEditingGoal(goal);
    setModalMode('edit');
  };

  const applyDetectedQuarterYear = (nextFormData) => {
    const detected = getDetectedQuarterYear(nextFormData.startDate, nextFormData.endDate);

    if (!detected) {
      return nextFormData;
    }

    return {
      ...nextFormData,
      quarter: manualQuarter ? nextFormData.quarter : detected.quarter,
      year: manualYear ? nextFormData.year : detected.year,
    };
  };

  const handleFormChange = (field, value) => {
    setFormData((previousData) => {
      const nextData = {
        ...previousData,
        [field]: field === 'progress' || field === 'year' ? Number(value) : value,
      };

      if (field === 'startDate' || field === 'endDate') {
        return applyDetectedQuarterYear(nextData);
      }

      return nextData;
    });
  };

  const handleManualQuarterChange = (quarter) => {
    setManualQuarter(true);
    handleFormChange('quarter', quarter);
  };

  const handleManualYearChange = (year) => {
    setManualYear(true);
    handleFormChange('year', year);
  };

  const getUserName = () => currentUser?.displayName || currentUser?.email || 'system';

  const handleSubmitGoal = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');

    const payload = {
      goalDescription: formData.goalDescription.trim(),
      owner: formData.owner,
      priority: formData.priority,
      progress: Number(formData.progress),
      startDate: formData.startDate,
      endDate: formData.endDate,
      status: formData.status,
      notes: formData.notes.trim(),
      quarter: formData.quarter,
      year: Number(formData.year),
      updatedBy: getUserName(),
    };

    if (!payload.goalDescription) {
      setFormError('Goal description is required.');
      setSaving(false);
      return;
    }

    try {
      if (modalMode === 'add') {
        await addGoal({
          ...payload,
          createdBy: getUserName(),
        });
      } else if (editingGoal?.id) {
        await updateGoal(editingGoal.id, payload);
      }

      const nextYear = payload.year;
      const nextQuarter = payload.quarter;
      const shouldSwitchView = nextYear !== selectedYear || nextQuarter !== selectedQuarter;

      closeModal();
      showSuccess(modalMode === 'add' ? 'Goal added.' : 'Goal updated.');

      if (shouldSwitchView) {
        setSelectedYear(nextYear);
        setSelectedQuarter(nextQuarter);
      } else {
        await loadGoals(nextYear, nextQuarter);
      }
    } catch (err) {
      console.error("Failed to save goal", err);
      const isGoalLimitError = err?.message?.includes('Cannot add more than 5 goals');
      setFormError(isGoalLimitError ? 'You already have 5 goals for this quarter.' : 'Failed to save goal. Please try again.');
    } finally {
      setSaving(false);
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
              Quarterly Goals
            </div>
            <h1 className="text-4xl font-black tracking-tight text-brand-ink">Goals</h1>
            <p className="mt-3 text-base font-medium leading-7 text-slate-600">Plan the quarter, track momentum, and keep the scoreboard visible.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
            <div className="rounded-3xl border border-brand-blue/10 bg-white/65 px-4 py-3 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Selected</p>
              <p className="mt-1 text-sm font-black text-brand-ink">{selectedQuarter} {selectedYear}</p>
            </div>
            <button
              type="button"
              onClick={openAddModal}
              className="btn-primary w-full sm:w-fit"
            >
              <Plus size={18} />
              Add Goal
            </button>
          </div>
        </div>
      </header>

      <section className="glass-card rounded-4xl border border-white/70 p-4 shadow-podium-glass md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-2 gap-2 rounded-[1.75rem] border border-brand-blue/10 bg-white/70 p-1.5 shadow-sm sm:grid-cols-4">
            {QUARTERS.map((quarter) => (
              <button
                key={quarter}
                type="button"
                onClick={() => setSelectedQuarter(quarter)}
                className={`focus-ring rounded-full px-4 py-2.5 text-sm font-black transition-all ${
                  selectedQuarter === quarter
                    ? 'bg-brand-blue text-white shadow-podium-soft'
                    : 'text-slate-600 hover:bg-white hover:text-brand-blue'
                }`}
              >
                {quarter}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-full border border-brand-blue/10 bg-brand-blue/10 px-4 py-2.5 text-sm font-black text-brand-blue shadow-sm">
              {goals.length} of 5 goals set for {selectedQuarter}
            </div>

            <label className="flex w-full items-center gap-3 rounded-full border border-brand-blue/10 bg-white/75 px-4 py-2.5 shadow-sm sm:w-fit">
              <CalendarDays size={18} className="text-brand-blue" />
              <span className="text-sm font-bold text-slate-500">Year</span>
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
                className="flex-1 bg-transparent text-sm font-black text-slate-800 outline-none sm:flex-none"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-center rounded-3xl border border-brand-red/20 bg-brand-red/10 p-4 font-bold text-brand-red shadow-sm">
          <AlertCircle className="mr-3 h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="flex items-center rounded-3xl border border-brand-green/20 bg-brand-green/10 p-4 font-bold text-brand-green shadow-sm">
          <CheckCircle2 className="mr-3 h-5 w-5 shrink-0" />
          {successMessage}
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-5">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className="bento-card p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${card.color}`}>
                  <Icon size={19} />
                </div>
                <p className="text-sm font-bold text-slate-500">{card.label}</p>
              </div>
              <p className="text-3xl font-black tracking-tight text-brand-ink">
                {summary[card.key]}
                {card.suffix || ''}
              </p>
            </div>
          );
        })}
      </section>

      {loading ? (
        <div className="glass-card flex h-64 flex-col items-center justify-center rounded-4xl border border-white/70 shadow-podium-glass">
          <Loader2 size={32} className="mb-4 animate-spin text-brand-blue" />
          <p className="font-bold text-slate-500">Loading goals...</p>
        </div>
      ) : goals.length === 0 ? (
        <div className="glass-card flex h-64 flex-col items-center justify-center rounded-4xl border border-white/70 p-8 text-center shadow-podium-glass">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/10">
            <Target size={30} />
          </div>
          <h2 className="text-xl font-black tracking-tight text-brand-ink">No goals for this quarter yet.</h2>
          <p className="mt-2 max-w-md text-slate-500">Pick the quarter, then add your first goal.</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {goals.map((goal) => {
            const progress = Math.min(Math.max(Number(goal.progress) || 0, 0), 100);
            const progressWidthClass = getProgressWidthClass(progress);
            const countdownText = formatCountdown(goal.endDate, goal.status);
            const priorityStyle = priorityCardStyles[goal.priority] || priorityCardStyles.P2;
            const statusStyle = statusCardStyles[goal.status] || statusCardStyles['Not Started'];
            const countdownStyle = goal.status === 'Done' ? statusCardStyles.Done : goal.status === 'Blocked' ? statusCardStyles.Blocked : priorityStyle.countdown;
            const timerKey = timerTick;

            return (
              <article
                key={goal.id}
                className={`glass-card overflow-hidden rounded-4xl border border-white/70 shadow-podium-glass transition-all hover:-translate-y-0.5 hover:shadow-podium-lift ${priorityStyle.article}`}
              >
                <div className={`h-1.5 ${priorityStyle.stripe}`} />
                <div className="space-y-5 p-4 sm:p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-xs font-black ${ownerBadgeStyles[goal.owner] || ownerBadgeStyles.Both}`}>
                          {goal.owner}
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-xs font-black ${priorityBadgeStyles[goal.priority] || priorityBadgeStyles.P2}`}>
                          {goal.priority}
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusBadgeStyles[goal.status] || statusBadgeStyles['Not Started']}`}>
                          {goal.status}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openEditModal(goal)}
                        className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-brand-blue/10 bg-white/70 text-slate-500 shadow-sm transition-colors hover:border-brand-blue/20 hover:bg-brand-blue/10 hover:text-brand-blue"
                        title="Edit goal"
                      >
                        <Edit3 size={16} />
                      </button>
                    </div>

                    <h2 className="text-xl font-black leading-snug tracking-tight text-brand-ink">
                      {goal.goalDescription || 'Untitled goal'}
                    </h2>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-600">Progress</span>
                      <span className="rounded-full bg-brand-blue/10 px-2.5 py-1 text-xs font-black text-brand-blue">{progress}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full border border-brand-blue/10 bg-white/70 shadow-inner">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r transition-all ${priorityStyle.progress} ${progressWidthClass}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-brand-blue/10 bg-white/60 p-3 shadow-sm">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Start</p>
                      <p className="mt-1 text-sm font-bold text-slate-700">{formatDate(goal.startDate)}</p>
                    </div>
                    <div className="rounded-2xl border border-brand-blue/10 bg-white/60 p-3 shadow-sm">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">End</p>
                      <p className="mt-1 text-sm font-bold text-slate-700">{formatDate(goal.endDate)}</p>
                    </div>
                    <div className={`rounded-2xl border p-3 shadow-sm ${countdownStyle}`}>
                      <p className="text-xs font-black uppercase tracking-[0.12em] opacity-80">{goal.status === 'Done' ? 'Status' : 'Countdown'}</p>
                      <p key={timerKey} className="mt-1 text-sm font-bold">{countdownText}</p>
                    </div>
                  </div>

                  <div className={`rounded-3xl border p-4 shadow-sm ${statusStyle}`}>
                    <div className="mb-2 flex items-center gap-2">
                      <UserRound size={16} />
                      <span className="text-xs font-black uppercase tracking-[0.14em]">Notes</span>
                    </div>
                    <p className="whitespace-pre-line text-sm font-medium leading-7 text-slate-700">
                      {goal.notes || 'No notes yet.'}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="glass-card max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-4xl border border-white/70 shadow-podium-glass">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-brand-blue/10 bg-white/80 p-5 backdrop-blur">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-blue/10 bg-white/70 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-brand-blue shadow-sm">
                  <Target size={13} />
                  Goal Details
                </div>
                <h2 className="text-xl font-black tracking-tight text-brand-ink">
                  {modalMode === 'add' ? 'Add Goal' : 'Edit Goal'}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">Quarter and year can be adjusted anytime.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="focus-ring flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white hover:text-slate-800"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitGoal} className="space-y-5 p-4 sm:p-5">
              {formError && (
                <div className="flex items-center rounded-3xl border border-brand-red/20 bg-brand-red/10 p-4 text-sm font-bold text-brand-red">
                  <AlertCircle className="mr-3 h-5 w-5 shrink-0" />
                  {formError}
                </div>
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Goal Description</span>
                <textarea
                  value={formData.goalDescription}
                  onChange={(event) => handleFormChange('goalDescription', event.target.value)}
                  rows={3}
                  className="input-field text-sm"
                  placeholder="Write the outcome you want to hit..."
                />
              </label>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">Owner</span>
                  <select
                    value={formData.owner}
                    onChange={(event) => handleFormChange('owner', event.target.value)}
                    className="select-field text-sm font-bold"
                  >
                    {OWNERS.map((owner) => (
                      <option key={owner} value={owner}>{owner}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">Priority</span>
                  <select
                    value={formData.priority}
                    onChange={(event) => handleFormChange('priority', event.target.value)}
                    className="select-field text-sm font-bold"
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">Status</span>
                  <select
                    value={formData.status}
                    onChange={(event) => handleFormChange('status', event.target.value)}
                    className="select-field text-sm font-bold"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">Progress</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(event) => handleFormChange('progress', event.target.value)}
                    className="input-field text-sm font-bold"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">Start Date</span>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(event) => handleFormChange('startDate', event.target.value)}
                    className="input-field text-sm font-bold"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">End Date</span>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(event) => handleFormChange('endDate', event.target.value)}
                    className="input-field text-sm font-bold"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">Quarter</span>
                  <select
                    value={formData.quarter}
                    onChange={(event) => handleManualQuarterChange(event.target.value)}
                    className="select-field text-sm font-bold"
                  >
                    {QUARTERS.map((quarter) => (
                      <option key={quarter} value={quarter}>{quarter}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">Year</span>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(event) => handleManualYearChange(event.target.value)}
                    className="input-field text-sm font-bold"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Notes/Updates</span>
                <textarea
                  value={formData.notes}
                  onChange={(event) => handleFormChange('notes', event.target.value)}
                  rows={4}
                  className="input-field text-sm"
                  placeholder="Add useful updates, blockers, or context..."
                />
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-brand-blue/10 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                  {saving ? 'Saving...' : 'Save Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;
