import React, { useEffect, useMemo, useState } from 'react';
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
  Rahat: 'bg-brand-yellow/20 text-yellow-800 border-brand-yellow/40',
  Both: 'bg-brand-green/10 text-brand-green border-brand-green/20',
};

const priorityBadgeStyles = {
  P0: 'bg-brand-red/10 text-brand-red border-brand-red/20',
  P1: 'bg-orange-50 text-orange-700 border-orange-200',
  P2: 'bg-slate-100 text-slate-600 border-slate-200',
};

const priorityCardStyles = {
  P0: {
    article: 'border-brand-red/30 shadow-red-100',
    stripe: 'bg-gradient-to-r from-brand-red via-red-500 to-orange-400',
    progress: 'from-brand-red to-orange-500',
    countdown: 'bg-red-50 text-brand-red border-red-100',
  },
  P1: {
    article: 'border-orange-200 shadow-orange-100',
    stripe: 'bg-gradient-to-r from-orange-500 via-brand-yellow to-brand-blue',
    progress: 'from-orange-500 to-brand-yellow',
    countdown: 'bg-brand-yellow/20 text-yellow-900 border-brand-yellow/30',
  },
  P2: {
    article: 'border-slate-200 shadow-slate-100',
    stripe: 'bg-gradient-to-r from-slate-300 via-brand-blue to-slate-400',
    progress: 'from-brand-blue to-slate-500',
    countdown: 'bg-slate-50 text-slate-700 border-slate-200',
  },
};

const statusBadgeStyles = {
  'Not Started': 'bg-slate-100 text-slate-600 border-slate-200',
  'In Progress': 'bg-blue-50 text-brand-blue border-blue-200',
  Done: 'bg-green-50 text-green-700 border-green-200',
  Blocked: 'bg-red-50 text-brand-red border-red-200',
};

const statusCardStyles = {
  'Not Started': 'bg-slate-50 text-slate-600 border-slate-200',
  'In Progress': 'bg-gradient-to-r from-blue-50 to-brand-yellow/20 text-brand-blue border-blue-200',
  Done: 'bg-green-50 text-green-700 border-green-200',
  Blocked: 'bg-red-50 text-brand-red border-red-200',
};

const summaryCards = [
  { key: 'totalGoals', label: 'Total Goals', icon: Target, color: 'bg-brand-blue/10 text-brand-blue' },
  { key: 'doneGoals', label: 'Done', icon: Flag, color: 'bg-green-50 text-green-700' },
  { key: 'inProgressGoals', label: 'In Progress', icon: TrendingUp, color: 'bg-blue-50 text-brand-blue' },
  { key: 'blockedGoals', label: 'Blocked', icon: AlertCircle, color: 'bg-red-50 text-brand-red' },
  { key: 'averageProgress', label: 'Average Progress', icon: Clock, color: 'bg-brand-yellow/20 text-yellow-800', suffix: '%' },
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
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(getCurrentQuarter());
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState(createEmptyForm(currentDate.getFullYear(), getCurrentQuarter()));
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [manualQuarter, setManualQuarter] = useState(false);
  const [manualYear, setManualYear] = useState(false);
  const [timerTick, setTimerTick] = useState(Date.now());

  const yearOptions = useMemo(() => {
    const currentYear = currentDate.getFullYear();
    const optionSet = new Set([currentYear - 1, currentYear, currentYear + 1, currentYear + 2, selectedYear, Number(formData.year)]);
    return Array.from(optionSet).filter(Number.isInteger).sort((a, b) => a - b);
  }, [currentDate, formData.year, selectedYear]);

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
    <div className="space-y-5 pb-10 sm:space-y-7 sm:pb-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-blue text-white shadow-sm">
              <Target size={22} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-800">Goals</h1>
              <p className="mt-1 text-slate-500">Plan the quarter. Keep the scoreboard visible.</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 sm:w-fit"
        >
          <Plus size={18} />
          Add Goal
        </button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 sm:grid-cols-4">
            {QUARTERS.map((quarter) => (
              <button
                key={quarter}
                type="button"
                onClick={() => setSelectedQuarter(quarter)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  selectedQuarter === quarter
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-brand-blue'
                }`}
              >
                {quarter}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-xl border border-brand-blue/10 bg-brand-blue/5 px-4 py-2 text-sm font-semibold text-brand-blue">
              {goals.length} of 5 goals set for {selectedQuarter}
            </div>

            <label className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm sm:w-fit">
              <CalendarDays size={18} className="text-brand-blue" />
              <span className="text-sm font-medium text-slate-500">Year</span>
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
                className="flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none sm:flex-none"
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
        <div className="flex items-center rounded-xl border border-red-200 bg-red-50 p-4 font-medium text-red-700">
          <AlertCircle className="mr-3 h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="flex items-center rounded-xl border border-green-200 bg-green-50 p-4 font-medium text-green-700">
          <CheckCircle2 className="mr-3 h-5 w-5 shrink-0" />
          {successMessage}
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-5">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}>
                  <Icon size={19} />
                </div>
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
              </div>
              <p className="text-3xl font-bold text-slate-800">
                {summary[card.key]}
                {card.suffix || ''}
              </p>
            </div>
          );
        })}
      </section>

      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
          <Loader2 size={32} className="mb-4 animate-spin text-brand-blue" />
          <p className="font-medium text-slate-500">Loading goals...</p>
        </div>
      ) : goals.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-8 text-center shadow-sm">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
            <Target size={30} />
          </div>
          <h2 className="text-xl font-semibold text-slate-800">No goals for this quarter yet.</h2>
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
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${priorityStyle.article}`}
              >
                <div className={`h-1.5 ${priorityStyle.stripe}`} />
                <div className="space-y-5 p-4 sm:p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${ownerBadgeStyles[goal.owner] || ownerBadgeStyles.Both}`}>
                          {goal.owner}
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${priorityBadgeStyles[goal.priority] || priorityBadgeStyles.P2}`}>
                          {goal.priority}
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusBadgeStyles[goal.status] || statusBadgeStyles['Not Started']}`}>
                          {goal.status}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openEditModal(goal)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-brand-blue hover:bg-brand-blue/10 hover:text-brand-blue"
                        title="Edit goal"
                      >
                        <Edit3 size={16} />
                      </button>
                    </div>

                    <h2 className="text-xl font-bold leading-snug text-slate-800">
                      {goal.goalDescription || 'Untitled goal'}
                    </h2>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-600">Progress</span>
                      <span className="text-sm font-bold text-brand-blue">{progress}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r transition-all ${priorityStyle.progress} ${progressWidthClass}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-400">Start</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{formatDate(goal.startDate)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-400">End</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{formatDate(goal.endDate)}</p>
                    </div>
                    <div className={`rounded-xl border p-3 ${countdownStyle}`}>
                      <p className="text-xs font-semibold uppercase opacity-80">{goal.status === 'Done' ? 'Status' : 'Countdown'}</p>
                      <p key={timerKey} className="mt-1 text-sm font-semibold">{countdownText}</p>
                    </div>
                  </div>

                  <div className={`rounded-xl border p-4 ${statusStyle}`}>
                    <div className="mb-2 flex items-center gap-2 text-slate-500">
                      <UserRound size={16} />
                      <span className="text-xs font-semibold uppercase">Notes</span>
                    </div>
                    <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-3 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {modalMode === 'add' ? 'Add Goal' : 'Edit Goal'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">Quarter and year can be adjusted anytime.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitGoal} className="space-y-5 p-4 sm:p-5">
              {formError && (
                <div className="flex items-center rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  <AlertCircle className="mr-3 h-5 w-5 shrink-0" />
                  {formError}
                </div>
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Goal Description</span>
                <textarea
                  value={formData.goalDescription}
                  onChange={(event) => handleFormChange('goalDescription', event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none transition-shadow focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                  placeholder="Write the outcome you want to hit..."
                />
              </label>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Owner</span>
                  <select
                    value={formData.owner}
                    onChange={(event) => handleFormChange('owner', event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                  >
                    {OWNERS.map((owner) => (
                      <option key={owner} value={owner}>{owner}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Priority</span>
                  <select
                    value={formData.priority}
                    onChange={(event) => handleFormChange('priority', event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Status</span>
                  <select
                    value={formData.status}
                    onChange={(event) => handleFormChange('status', event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Progress</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(event) => handleFormChange('progress', event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Start Date</span>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(event) => handleFormChange('startDate', event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">End Date</span>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(event) => handleFormChange('endDate', event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Quarter</span>
                  <select
                    value={formData.quarter}
                    onChange={(event) => handleManualQuarterChange(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                  >
                    {QUARTERS.map((quarter) => (
                      <option key={quarter} value={quarter}>{quarter}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Year</span>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(event) => handleManualYearChange(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Notes/Updates</span>
                <textarea
                  value={formData.notes}
                  onChange={(event) => handleFormChange('notes', event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none transition-shadow focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                  placeholder="Add useful updates, blockers, or context..."
                />
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
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
