import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Loader2,
  Plus,
  Save,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import { addTask, getTasksByMonth, markTaskDone, updateTask } from '../services/taskService';
import { calculateTaskSummary, getTaskReminderState, groupTasksByWeek } from '../utils/taskUtils';

const OWNERS = ['Abir', 'Rahat', 'Both'];
const PRIORITIES = ['High', 'Medium', 'Low'];
const STATUSES = ['To Do', 'In Progress', 'Done', 'Blocked'];
const OWNER_FILTERS = ['All', ...OWNERS];
const PRIORITY_FILTERS = ['All', ...PRIORITIES];
const STATUS_FILTERS = ['All', ...STATUSES];
const TIME_FILTERS = ['All', 'Overdue', 'Today', 'This Week', 'Upcoming'];

const ownerBadgeStyles = {
  Abir: 'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
  Rahat: 'bg-brand-yellow/20 text-[#765300] border-brand-yellow/45',
  Both: 'bg-brand-green/10 text-brand-green border-brand-green/20',
};

const priorityBadgeStyles = {
  High: 'bg-brand-red/10 text-brand-red border-brand-red/20',
  Medium: 'bg-brand-yellow/20 text-[#765300] border-brand-yellow/45',
  Low: 'bg-brand-blue/10 text-slate-600 border-brand-blue/15',
};

const statusBadgeStyles = {
  'To Do': 'bg-white/80 text-slate-600 border-slate-200',
  'In Progress': 'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
  Done: 'bg-brand-green/10 text-brand-green border-brand-green/20',
  Blocked: 'bg-brand-red/10 text-brand-red border-brand-red/20',
};

const reminderStateStyles = {
  overdue: {
    label: 'Overdue',
    badge: 'bg-brand-red/10 text-brand-red border-brand-red/20',
    card: 'border-brand-red/25 shadow-red-100',
    stripe: 'bg-brand-red',
    icon: 'bg-brand-red/10 text-brand-red ring-brand-red/10',
  },
  dueToday: {
    label: 'Due Today',
    badge: 'bg-brand-yellow/20 text-[#765300] border-brand-yellow/45',
    card: 'border-brand-yellow/35 shadow-yellow-100',
    stripe: 'bg-brand-yellow',
    icon: 'bg-brand-yellow/20 text-[#765300] ring-brand-yellow/20',
  },
  dueThisWeek: {
    label: 'Due This Week',
    badge: 'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
    card: 'border-brand-blue/20 shadow-blue-100',
    stripe: 'bg-brand-blue',
    icon: 'bg-brand-blue/10 text-brand-blue ring-brand-blue/10',
  },
  upcoming: {
    label: 'Upcoming',
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
    card: 'border-white/70',
    stripe: 'bg-slate-300',
    icon: 'bg-slate-100 text-slate-500 ring-slate-200',
  },
  done: {
    label: 'Done',
    badge: 'bg-brand-green/10 text-brand-green border-brand-green/20',
    card: 'border-brand-green/25 shadow-green-100',
    stripe: 'bg-brand-green',
    icon: 'bg-brand-green/10 text-brand-green ring-brand-green/10',
  },
};

const textInputClasses = 'input-field text-sm text-slate-700';
const selectInputClasses = 'select-field text-sm font-bold text-slate-700';

const parseDateOnly = (dateString) => {
  if (!dateString) {
    return null;
  }

  const [year, month, day] = dateString.split('-').map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const formatDate = (dateString) => {
  const date = parseDateOnly(dateString);

  if (!date) {
    return 'Not set';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatWeekRange = (startDate, endDate) => `${formatDate(startDate)} - ${formatDate(endDate)}`;

const getTaskPreview = (task) => {
  const preview = task.description || task.notes || '';

  if (!preview.trim()) {
    return 'No description or notes yet.';
  }

  return preview;
};

const createEmptyTaskForm = () => ({
  title: '',
  description: '',
  owner: 'Both',
  priority: 'Medium',
  status: 'To Do',
  dueDate: '',
  notes: '',
});

const createTaskFormFromTask = (task) => ({
  title: task.title || '',
  description: task.description || '',
  owner: task.owner || 'Both',
  priority: task.priority || 'Medium',
  status: task.status || 'To Do',
  dueDate: task.dueDate || '',
  notes: task.notes || '',
});

const Badge = ({ value, styles }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black ${styles[value] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
    {value || 'Not set'}
  </span>
);

const FormField = ({ label, required = false, children }) => (
  <label className="flex flex-col gap-1.5 text-sm font-bold text-slate-700">
    <span>
      {label}
      {required && <span className="text-brand-red"> *</span>}
    </span>
    {children}
  </label>
);

const FilterSelect = ({ label, value, options, onChange }) => (
  <label className="flex min-w-[150px] flex-col gap-1.5 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
    {label}
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="select-field text-sm font-bold normal-case tracking-normal text-slate-700"
    >
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  </label>
);

const SummaryCard = ({ label, value, icon: Icon, tone }) => (
  <div className="glass-card rounded-3xl border border-white/70 p-4 shadow-podium-glass">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <p className="mt-2 text-3xl font-black tracking-tight text-brand-ink">{value}</p>
      </div>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${tone}`}>
        <Icon size={22} />
      </div>
    </div>
  </div>
);

const TaskCard = ({ task, onOpenEdit, onMarkDone, markingDone }) => (
  (() => {
    const reminderState = getTaskReminderState(task);
    const reminderStyle = reminderStateStyles[reminderState] || reminderStateStyles.upcoming;

    return (
      <article
        role="button"
        tabIndex={0}
        onClick={() => onOpenEdit(task)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpenEdit(task);
          }
        }}
        className={`group relative w-full cursor-pointer overflow-hidden rounded-3xl border bg-white/75 p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-podium-soft focus-ring ${reminderStyle.card}`}
      >
        <div className={`absolute inset-y-0 left-0 w-1.5 ${reminderStyle.stripe}`} />
        <div className="flex flex-col gap-4 pl-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className={`hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 sm:flex ${reminderStyle.icon}`}>
              <ClipboardCheck size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
                <h3 className="text-lg font-black tracking-tight text-brand-ink">{task.title || 'Untitled task'}</h3>
                <span className="flex shrink-0 items-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  <UserRound size={14} />
                  {task.owner || 'Both'}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-slate-600">{getTaskPreview(task)}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:w-[360px] xl:w-[420px]">
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Badge value={task.owner} styles={ownerBadgeStyles} />
              <Badge value={task.priority} styles={priorityBadgeStyles} />
              <Badge value={task.status} styles={statusBadgeStyles} />
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black ${reminderStyle.badge}`}>
                {reminderStyle.label}
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
              <span className="flex min-w-0 items-center gap-2 rounded-2xl border border-brand-blue/10 bg-brand-cream/55 px-3 py-2.5 text-sm font-bold text-slate-700">
                <CalendarDays size={16} className="shrink-0 text-brand-blue" />
                <span className="truncate">Due {formatDate(task.dueDate)}</span>
              </span>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onMarkDone(task);
                }}
                disabled={task.status === 'Done' || markingDone}
                className="focus-ring flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-brand-green/15 bg-white/75 px-4 py-2.5 text-sm font-black text-brand-green shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-green/10 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
              >
                {markingDone ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
                <span>{task.status === 'Done' ? 'Done' : 'Mark Done'}</span>
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  })()
);

const Tasks = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState(createEmptyTaskForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [markingDoneId, setMarkingDoneId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [timeFilter, setTimeFilter] = useState('All');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthKey = getMonthKey(currentDate);

  const summary = useMemo(() => {
    const baseSummary = calculateTaskSummary(tasks);

    return {
      ...baseSummary,
      doneThisMonth: tasks.filter((task) => task.status === 'Done').length,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return tasks.filter((task) => {
      const searchableText = `${task.title || ''} ${task.description || ''} ${task.notes || ''}`.toLowerCase();
      const reminderState = getTaskReminderState(task);
      const matchesSearch = !normalizedSearchTerm || searchableText.includes(normalizedSearchTerm);
      const matchesOwner = ownerFilter === 'All' || task.owner === ownerFilter;
      const matchesStatus = statusFilter === 'All' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;
      const matchesTime =
        timeFilter === 'All' ||
        (timeFilter === 'Overdue' && reminderState === 'overdue') ||
        (timeFilter === 'Today' && reminderState === 'dueToday') ||
        (timeFilter === 'This Week' && reminderState === 'dueThisWeek') ||
        (timeFilter === 'Upcoming' && reminderState === 'upcoming');

      return matchesSearch && matchesOwner && matchesStatus && matchesPriority && matchesTime;
    });
  }, [ownerFilter, priorityFilter, searchTerm, statusFilter, tasks, timeFilter]);

  const groupedWeeks = useMemo(() => {
    const sortedTasks = [...filteredTasks].sort((taskA, taskB) => (taskA.dueDate || '').localeCompare(taskB.dueDate || ''));
    return groupTasksByWeek(sortedTasks, year, month);
  }, [filteredTasks, month, year]);

  const visibleWeeks = groupedWeeks.filter((week) => week.tasks.length > 0);
  const isModalOpen = Boolean(modalMode);
  const modalTitle = modalMode === 'edit' ? 'Edit Task' : 'Add Task';

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getTasksByMonth(monthKey);
      setTasks(data);
    } catch (err) {
      console.error("Failed to load tasks", err);
      setError('Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!isModalOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isModalOpen]);

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 2500);
  };

  const handleMonthChange = (delta) => {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + delta);
    setCurrentDate(nextDate);
  };

  const openAddModal = () => {
    setFormData(createEmptyTaskForm());
    setEditingTask(null);
    setFormError('');
    setModalMode('add');
  };

  const openEditModal = (task) => {
    setFormData(createTaskFormFromTask(task));
    setEditingTask(task);
    setFormError('');
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingTask(null);
    setFormError('');
    setSaving(false);
  };

  const updateFormField = (field, value) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      return 'Title is required.';
    }

    if (!formData.dueDate) {
      return 'Due Date is required.';
    }

    return '';
  };

  const handleSaveTask = async (event) => {
    event.preventDefault();
    const validationMessage = validateForm();

    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    setSaving(true);
    setFormError('');
    setError('');

    const payload = {
      title: formData.title.trim(),
      description: formData.description,
      owner: formData.owner,
      priority: formData.priority,
      status: formData.status,
      dueDate: formData.dueDate,
      notes: formData.notes,
    };

    try {
      if (modalMode === 'edit' && editingTask?.id) {
        await updateTask(editingTask.id, payload);
        showSuccess('Task updated.');
      } else {
        await addTask(payload);
        showSuccess('Task added.');
      }

      closeModal();
      await loadTasks();
    } catch (err) {
      console.error("Failed to save task", err);
      setFormError('Failed to save task. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkDone = async (task) => {
    if (task.status === 'Done') {
      return;
    }

    setMarkingDoneId(task.id);
    setError('');

    try {
      await markTaskDone(task.id);
      await loadTasks();
      showSuccess('Task updated.');
    } catch (err) {
      console.error("Failed to mark task done", err);
      setError('Failed to mark task done. Please try again.');
    } finally {
      setMarkingDoneId('');
    }
  };

  return (
    <div className="space-y-7 pb-12">
      <header className="glass-card relative overflow-hidden rounded-4xl border border-white/70 p-6 shadow-podium-glass md:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue via-brand-yellow to-brand-green" />
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-blue/10 bg-white/65 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-brand-blue shadow-sm">
              <span className="h-2 w-2 rounded-full bg-brand-yellow shadow-[0_0_0_4px_rgba(254,195,29,0.18)]" />
              Tasks
            </div>
            <h1 className="text-4xl font-black tracking-tight text-brand-ink">Tasks</h1>
            <p className="mt-3 text-base font-medium leading-7 text-slate-600">Review standalone team tasks by month and weekly due date.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
            <button
              type="button"
              onClick={openAddModal}
              className="focus-ring flex items-center justify-center gap-2 rounded-full bg-brand-blue px-5 py-3 text-sm font-black text-white shadow-podium-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-blue/90"
            >
              <Plus size={18} />
              <span>Add Task</span>
            </button>

            <div className="flex w-fit shrink-0 items-center gap-2 rounded-full border border-brand-blue/10 bg-white/75 p-1.5 shadow-sm">
              <button
                onClick={() => handleMonthChange(-1)}
                className="focus-ring rounded-full p-2.5 text-slate-600 transition-all hover:bg-brand-blue/10 hover:text-brand-blue"
                title="Previous Month"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="min-w-[152px] text-center text-sm font-black text-slate-800">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => handleMonthChange(1)}
                className="focus-ring rounded-full p-2.5 text-slate-600 transition-all hover:bg-brand-blue/10 hover:text-brand-blue"
                title="Next Month"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="rounded-3xl border border-brand-blue/10 bg-white/65 px-4 py-3 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Month Key</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-black text-brand-ink">
                <Clock size={16} className="text-brand-blue" />
                {monthKey}
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Overdue" value={summary.overdue} icon={AlertCircle} tone={reminderStateStyles.overdue.icon} />
        <SummaryCard label="Due Today" value={summary.dueToday} icon={CalendarDays} tone={reminderStateStyles.dueToday.icon} />
        <SummaryCard label="Due This Week" value={summary.dueThisWeek} icon={Clock} tone={reminderStateStyles.dueThisWeek.icon} />
        <SummaryCard label="In Progress" value={summary.inProgress} icon={Loader2} tone="bg-brand-blue/10 text-brand-blue ring-brand-blue/10" />
        <SummaryCard label="Done This Month" value={summary.doneThisMonth} icon={CheckCircle2} tone={reminderStateStyles.done.icon} />
      </section>

      <section className="glass-card rounded-4xl border border-white/70 p-5 shadow-podium-glass md:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-end">
          <label className="flex flex-col gap-1.5 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            Search
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className={`${textInputClasses} pl-10`}
                placeholder="Search title, description, or notes"
              />
            </div>
          </label>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FilterSelect label="Owner" value={ownerFilter} options={OWNER_FILTERS} onChange={setOwnerFilter} />
            <FilterSelect label="Status" value={statusFilter} options={STATUS_FILTERS} onChange={setStatusFilter} />
            <FilterSelect label="Priority" value={priorityFilter} options={PRIORITY_FILTERS} onChange={setPriorityFilter} />
            <FilterSelect label="Time" value={timeFilter} options={TIME_FILTERS} onChange={setTimeFilter} />
          </div>
        </div>
      </section>

      {successMessage && (
        <div className="flex items-center rounded-3xl border border-brand-green/20 bg-brand-green/10 p-4 font-bold text-brand-green shadow-sm">
          <CheckCircle2 className="mr-3 h-5 w-5 shrink-0" />
          {successMessage}
        </div>
      )}

      {error && (
        <div className="flex items-center rounded-3xl border border-brand-red/20 bg-brand-red/10 p-4 font-bold text-brand-red shadow-sm">
          <AlertCircle className="mr-3 h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="glass-card flex h-64 flex-col items-center justify-center rounded-4xl border border-white/70 shadow-podium-glass">
          <Loader2 size={32} className="mb-4 animate-spin text-brand-blue" />
          <p className="font-bold text-slate-500">Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="glass-card flex h-64 flex-col items-center justify-center rounded-4xl border border-white/70 p-8 text-center shadow-podium-glass">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/10">
            <ClipboardCheck size={26} />
          </div>
          <h2 className="text-xl font-black text-brand-ink">No tasks for this month yet.</h2>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="glass-card flex h-64 flex-col items-center justify-center rounded-4xl border border-white/70 p-8 text-center shadow-podium-glass">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-500 ring-1 ring-slate-200">
            <Search size={26} />
          </div>
          <h2 className="text-xl font-black text-brand-ink">No matching tasks.</h2>
        </div>
      ) : (
        <section className="space-y-5">
          {visibleWeeks.map((week) => (
            <div key={`${week.startDate}-${week.endDate}`} className="glass-card rounded-4xl border border-white/70 p-5 shadow-podium-glass md:p-6">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-brand-ink">{formatWeekRange(week.startDate, week.endDate)}</h2>
                </div>
                <span className="w-fit rounded-full border border-brand-blue/10 bg-white/70 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-500 shadow-sm">
                  {week.tasks.length} {week.tasks.length === 1 ? 'task' : 'tasks'}
                </span>
              </div>

              <div className="space-y-3">
                {week.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onOpenEdit={openEditModal}
                    onMarkDone={handleMarkDone}
                    markingDone={markingDoneId === task.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-brand-ink/45 p-4 backdrop-blur-sm sm:items-center">
          <div className="glass-card max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-4xl border border-white/75 p-5 shadow-podium-glass md:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-blue">Tasks</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-brand-ink">{modalTitle}</h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="focus-ring rounded-full p-2.5 text-slate-500 transition-all hover:bg-brand-red/10 hover:text-brand-red"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-5 flex items-center rounded-3xl border border-brand-red/20 bg-brand-red/10 p-4 text-sm font-bold text-brand-red">
                <AlertCircle className="mr-3 h-5 w-5 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveTask} className="space-y-5">
              <FormField label="Title" required>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(event) => updateFormField('title', event.target.value)}
                  className={textInputClasses}
                  placeholder="Task title"
                />
              </FormField>

              <FormField label="Description">
                <textarea
                  value={formData.description}
                  onChange={(event) => updateFormField('description', event.target.value)}
                  className={`${textInputClasses} min-h-24 resize-y`}
                  placeholder="Brief task description"
                />
              </FormField>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Owner">
                  <select
                    value={formData.owner}
                    onChange={(event) => updateFormField('owner', event.target.value)}
                    className={selectInputClasses}
                  >
                    {OWNERS.map((owner) => (
                      <option key={owner} value={owner}>{owner}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Priority">
                  <select
                    value={formData.priority}
                    onChange={(event) => updateFormField('priority', event.target.value)}
                    className={selectInputClasses}
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Status">
                  <select
                    value={formData.status}
                    onChange={(event) => updateFormField('status', event.target.value)}
                    className={selectInputClasses}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Due Date" required>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(event) => updateFormField('dueDate', event.target.value)}
                    className={textInputClasses}
                  />
                </FormField>
              </div>

              <FormField label="Notes">
                <textarea
                  value={formData.notes}
                  onChange={(event) => updateFormField('notes', event.target.value)}
                  className={`${textInputClasses} min-h-28 resize-y`}
                  placeholder="Internal notes"
                />
              </FormField>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="focus-ring rounded-2xl border border-brand-blue/10 bg-white/75 px-5 py-3 text-sm font-black text-slate-600 shadow-sm transition-all hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="focus-ring flex items-center justify-center gap-2 rounded-2xl bg-brand-blue px-5 py-3 text-sm font-black text-white shadow-podium-soft transition-all hover:-translate-y-0.5 hover:bg-brand-blue/90 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  <span>{saving ? 'Saving...' : 'Save Task'}</span>
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

export default Tasks;
