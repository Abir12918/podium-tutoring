import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ClipboardList, Eye, Flame, Loader2, MessageSquarePlus, Plus, Save, Search, Target, TrendingUp, UserCheck, X } from 'lucide-react';
import { addLead, addLeadActivity, getLeads, updateLead } from '../services/leadService';
import {
  LEAD_GRADES,
  LEAD_OBJECTIONS,
  LEAD_OWNERS,
  LEAD_PRIORITIES,
  LEAD_SERVICE_INTERESTS,
  LEAD_SOURCES,
  LEAD_STATUSES,
  LEAD_SUBJECTS,
} from '../utils/leadUtils';

const ACTIVE_LEAD_STATUSES = ['New', 'Reached Out', 'Follow-Up Needed', 'Trial Scheduled'];
const STATUS_GROUPS = ['Active', 'Converted', 'Closed', 'Not Interested', 'All'];
const OWNER_OPTIONS = ['All', ...LEAD_OWNERS];
const PRIORITY_OPTIONS = ['All', ...LEAD_PRIORITIES];
const STATUS_OPTIONS = ['All', ...LEAD_STATUSES];
const SERVICE_INTEREST_OPTIONS = ['All', ...LEAD_SERVICE_INTERESTS];
const LEAD_SOURCE_OPTIONS = ['All', ...LEAD_SOURCES];

const createEmptyLeadForm = () => ({
  studentName: '',
  grade: '',
  subjects: [],
  parentName: '',
  parentPhone: '',
  serviceInterests: [],
  serviceInterestOtherNotes: '',
  leadSource: '',
  leadSourceOtherNotes: '',
  owner: '',
  priority: 'Warm',
  status: 'New',
  nextFollowUpDate: '',
  lastContactedDate: '',
  objection: '',
  objectionOtherNotes: '',
  generalNotes: '',
});

const createLeadFormFromLead = (lead) => ({
  studentName: lead.studentName || '',
  grade: lead.grade || '',
  subjects: Array.isArray(lead.subjects) ? lead.subjects : [],
  parentName: lead.parentName || '',
  parentPhone: lead.parentPhone || '',
  serviceInterests: Array.isArray(lead.serviceInterests) ? lead.serviceInterests : [],
  serviceInterestOtherNotes: lead.serviceInterestOtherNotes || '',
  leadSource: lead.leadSource || '',
  leadSourceOtherNotes: lead.leadSourceOtherNotes || '',
  owner: lead.owner || '',
  priority: lead.priority || 'Warm',
  status: lead.status || 'New',
  nextFollowUpDate: lead.nextFollowUpDate || '',
  lastContactedDate: lead.lastContactedDate || '',
  objection: lead.objection || '',
  objectionOtherNotes: lead.objectionOtherNotes || '',
  generalNotes: lead.generalNotes || '',
});

const priorityBadgeStyles = {
  Hot: 'bg-brand-red/10 text-brand-red border-brand-red/20',
  Warm: 'bg-brand-yellow/20 text-[#765300] border-brand-yellow/45',
  Cold: 'bg-brand-blue/10 text-slate-600 border-brand-blue/15',
};

const statusBadgeStyles = {
  New: 'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
  'Reached Out': 'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
  'Follow-Up Needed': 'bg-brand-yellow/20 text-[#765300] border-brand-yellow/45',
  'Trial Scheduled': 'bg-brand-green/10 text-brand-green border-brand-green/20',
  Converted: 'bg-brand-green/10 text-brand-green border-brand-green/20',
  Closed: 'bg-slate-100 text-slate-600 border-slate-200',
  'Not Interested': 'bg-slate-100 text-slate-600 border-slate-200',
};

const followUpStyles = {
  overdue: 'bg-brand-red/10 text-brand-red border-brand-red/20',
  today: 'bg-brand-yellow/20 text-[#765300] border-brand-yellow/45',
  upcoming: 'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
  none: 'bg-slate-100 text-slate-500 border-slate-200',
};

const formatList = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return 'Not set';
  }

  return items.join(', ');
};

const parseDateOnly = (dateString) => {
  if (!dateString) {
    return null;
  }

  const [year, month, day] = dateString.split('-').map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
};

const getTodayDateOnly = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const isActiveLead = (lead) => ACTIVE_LEAD_STATUSES.includes(lead.status || 'New');

const getFollowUpState = (lead, today = getTodayDateOnly()) => {
  if (!lead.nextFollowUpDate) {
    return 'none';
  }

  const followUpDate = parseDateOnly(lead.nextFollowUpDate);

  if (!followUpDate) {
    return 'none';
  }

  if (followUpDate < today) {
    return 'overdue';
  }

  if (followUpDate.getTime() === today.getTime()) {
    return 'today';
  }

  return 'upcoming';
};

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

const getActivityDate = (createdAt) => {
  if (!createdAt) {
    return null;
  }

  if (typeof createdAt.toDate === 'function') {
    return createdAt.toDate();
  }

  if (createdAt.seconds) {
    return new Date(createdAt.seconds * 1000);
  }

  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatActivityDate = (createdAt) => {
  const date = getActivityDate(createdAt);

  if (!date) {
    return 'Time not set';
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getSortedActivityLog = (activityLog = []) => {
  if (!Array.isArray(activityLog)) {
    return [];
  }

  return [...activityLog].sort((activityA, activityB) => {
    const dateA = getActivityDate(activityA.createdAt);
    const dateB = getActivityDate(activityB.createdAt);
    const timeA = dateA ? dateA.getTime() : 0;
    const timeB = dateB ? dateB.getTime() : 0;

    return timeB - timeA;
  });
};

const getOptionLabel = (value) => value || 'All';

const Badge = ({ value, styles }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-black ${styles[value] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
    {value || 'Not set'}
  </span>
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
        <option key={option} value={option}>{getOptionLabel(option)}</option>
      ))}
    </select>
  </label>
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

const textInputClasses = "input-field text-sm text-slate-700";

const MultiSelectCheckboxes = ({ label, options, values, onChange }) => {
  const toggleValue = (option) => {
    if (values.includes(option)) {
      onChange(values.filter((value) => value !== option));
      return;
    }

    onChange([...values, option]);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold text-slate-700">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 rounded-2xl border border-brand-blue/10 bg-white/65 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm">
            <input
              type="checkbox"
              checked={values.includes(option)}
              onChange={() => toggleValue(option)}
              className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, icon: Icon, color }) => (
  <div className="bento-card p-5">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-black tracking-tight text-brand-ink">{value}</p>
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${color}`}>
        <Icon size={22} />
      </div>
    </div>
  </div>
);

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusGroup, setStatusGroup] = useState('Active');
  const [ownerFilter, setOwnerFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [serviceInterestFilter, setServiceInterestFilter] = useState('All');
  const [leadSourceFilter, setLeadSourceFilter] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [leadForm, setLeadForm] = useState(createEmptyLeadForm());
  const [savingLead, setSavingLead] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [editForm, setEditForm] = useState(createEmptyLeadForm());
  const [savingEdit, setSavingEdit] = useState(false);
  const [drawerError, setDrawerError] = useState('');
  const [activityNote, setActivityNote] = useState('');
  const [savingActivity, setSavingActivity] = useState(false);
  const [activityError, setActivityError] = useState('');

  const loadLeads = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getLeads();
      setLeads(data);
    } catch (err) {
      console.error("Failed to load leads", err);
      setError('Failed to load leads. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const today = useMemo(() => getTodayDateOnly(), []);

  const summary = useMemo(() => {
    const activeLeads = leads.filter(isActiveLead);

    return {
      totalActiveLeads: activeLeads.length,
      hotLeads: activeLeads.filter((lead) => lead.priority === 'Hot').length,
      followUpsDueToday: activeLeads.filter((lead) => getFollowUpState(lead, today) === 'today').length,
      overdueFollowUps: activeLeads.filter((lead) => getFollowUpState(lead, today) === 'overdue').length,
      trialScheduled: activeLeads.filter((lead) => lead.status === 'Trial Scheduled').length,
      converted: leads.filter((lead) => lead.status === 'Converted').length,
    };
  }, [leads, today]);

  const filteredLeads = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return leads.filter((lead) => {
      const leadStatus = lead.status || 'New';

      if (statusGroup === 'Active' && !isActiveLead(lead)) {
        return false;
      }

      if (statusGroup !== 'Active' && statusGroup !== 'All' && leadStatus !== statusGroup) {
        return false;
      }

      if (ownerFilter !== 'All' && lead.owner !== ownerFilter) {
        return false;
      }

      if (priorityFilter !== 'All' && lead.priority !== priorityFilter) {
        return false;
      }

      if (statusFilter !== 'All' && leadStatus !== statusFilter) {
        return false;
      }

      if (serviceInterestFilter !== 'All' && !(lead.serviceInterests || []).includes(serviceInterestFilter)) {
        return false;
      }

      if (leadSourceFilter !== 'All' && lead.leadSource !== leadSourceFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        lead.studentName,
        lead.parentName,
        lead.parentPhone,
        lead.generalNotes,
      ].join(' ').toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [leadSourceFilter, leads, ownerFilter, priorityFilter, searchQuery, serviceInterestFilter, statusFilter, statusGroup]);

  const summaryCards = [
    { label: 'Total Active Leads', value: summary.totalActiveLeads, icon: ClipboardList, color: 'bg-brand-blue/10 text-brand-blue ring-brand-blue/10' },
    { label: 'Hot Leads', value: summary.hotLeads, icon: Flame, color: 'bg-brand-red/10 text-brand-red ring-brand-red/10' },
    { label: 'Follow-Ups Due Today', value: summary.followUpsDueToday, icon: Target, color: 'bg-brand-yellow/20 text-[#765300] ring-brand-yellow/20' },
    { label: 'Overdue Follow-Ups', value: summary.overdueFollowUps, icon: AlertCircle, color: 'bg-brand-red/10 text-brand-red ring-brand-red/10' },
    { label: 'Trial Scheduled', value: summary.trialScheduled, icon: TrendingUp, color: 'bg-brand-green/10 text-brand-green ring-brand-green/10' },
    { label: 'Converted', value: summary.converted, icon: UserCheck, color: 'bg-brand-green/10 text-brand-green ring-brand-green/10' },
  ];

  const selectedLeadActivities = useMemo(
    () => getSortedActivityLog(selectedLead?.activityLog),
    [selectedLead]
  );

  const handleViewLead = (lead) => {
    setSelectedLead(lead);
    setEditForm(createLeadFormFromLead(lead));
    setDrawerError('');
    setActivityNote('');
    setActivityError('');
  };

  const updateLeadForm = (fieldName, value) => {
    setLeadForm((currentForm) => ({
      ...currentForm,
      [fieldName]: value,
    }));
  };

  const updateEditForm = (fieldName, value) => {
    setEditForm((currentForm) => ({
      ...currentForm,
      [fieldName]: value,
    }));
  };

  const openAddModal = () => {
    setLeadForm(createEmptyLeadForm());
    setFormError('');
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    if (savingLead) {
      return;
    }

    setIsAddModalOpen(false);
    setFormError('');
    setLeadForm(createEmptyLeadForm());
  };

  const closeDrawer = () => {
    if (savingEdit || savingActivity) {
      return;
    }

    setSelectedLead(null);
    setDrawerError('');
    setActivityError('');
    setActivityNote('');
    setEditForm(createEmptyLeadForm());
  };

  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 2500);
  };

  const handleAddLead = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!leadForm.studentName.trim()) {
      setFormError('Student Name is required.');
      return;
    }

    if (!leadForm.parentPhone.trim()) {
      setFormError('Parent Phone is required.');
      return;
    }

    setSavingLead(true);

    try {
      await addLead(leadForm);
      setIsAddModalOpen(false);
      setLeadForm(createEmptyLeadForm());
      showSuccessMessage('Lead added.');
      await loadLeads();
    } catch (err) {
      console.error("Failed to add lead", err);
      setFormError(err.message || 'Failed to add lead. Please try again.');
    } finally {
      setSavingLead(false);
    }
  };

  const handleUpdateLead = async (event) => {
    event.preventDefault();
    setDrawerError('');

    if (!selectedLead) {
      setDrawerError('Select a lead before saving.');
      return;
    }

    if (!editForm.studentName.trim()) {
      setDrawerError('Student Name is required.');
      return;
    }

    if (!editForm.parentPhone.trim()) {
      setDrawerError('Parent Phone is required.');
      return;
    }

    setSavingEdit(true);

    try {
      await updateLead(selectedLead.id, editForm);
      await loadLeads();
      setSelectedLead(null);
      setEditForm(createEmptyLeadForm());
      showSuccessMessage('Lead updated.');
    } catch (err) {
      console.error("Failed to update lead", err);
      setDrawerError(err.message || 'Failed to update lead. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddActivity = async (event) => {
    event.preventDefault();
    setActivityError('');

    if (!selectedLead) {
      setActivityError('Select a lead before adding activity.');
      return;
    }

    if (!activityNote.trim()) {
      setActivityError('Activity note is required.');
      return;
    }

    setSavingActivity(true);

    try {
      await addLeadActivity(selectedLead.id, {
        note: activityNote,
        createdBy: 'system',
      });

      const refreshedLeads = await getLeads();
      setLeads(refreshedLeads);

      const refreshedSelectedLead = refreshedLeads.find((lead) => lead.id === selectedLead.id);

      if (refreshedSelectedLead) {
        setSelectedLead(refreshedSelectedLead);
        setEditForm(createLeadFormFromLead(refreshedSelectedLead));
      }

      setActivityNote('');
    } catch (err) {
      console.error("Failed to add lead activity", err);
      setActivityError(err.message || 'Failed to add activity update. Please try again.');
    } finally {
      setSavingActivity(false);
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
              CRM Pipeline
            </div>
            <h1 className="text-4xl font-black tracking-tight text-brand-ink">Leads</h1>
            <p className="mt-3 text-base font-medium leading-7 text-slate-600">Track active prospective students, follow-up priorities, and conversion progress.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
            <div className="rounded-3xl border border-brand-blue/10 bg-white/65 px-4 py-3 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Default View</p>
              <p className="mt-1 text-sm font-black text-brand-ink">{statusGroup}</p>
            </div>
            <button
              type="button"
              onClick={openAddModal}
              className="btn-primary w-full sm:w-fit"
            >
              <Plus size={18} />
              Add Lead
            </button>
          </div>
        </div>
      </header>

      {successMessage && (
        <div className="rounded-3xl border border-brand-green/20 bg-brand-green/10 p-4 font-bold text-brand-green shadow-sm">
          {successMessage}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </section>

      <section className="glass-card rounded-4xl border border-white/70 p-4 shadow-podium-glass md:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-2xl">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by student, parent, phone, or notes..."
                className="input-field py-3 pl-11 pr-10 text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="focus-ring absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1 rounded-[1.75rem] border border-brand-blue/10 bg-white/70 p-1.5 shadow-sm">
              {STATUS_GROUPS.map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => setStatusGroup(group)}
                  className={`focus-ring rounded-full px-3 py-2 text-sm font-bold transition-all ${
                    statusGroup === group
                      ? 'bg-brand-blue text-white shadow-podium-soft'
                      : 'text-slate-600 hover:bg-white hover:text-brand-blue'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <FilterSelect label="Owner" value={ownerFilter} options={OWNER_OPTIONS} onChange={setOwnerFilter} />
            <FilterSelect label="Priority" value={priorityFilter} options={PRIORITY_OPTIONS} onChange={setPriorityFilter} />
            <FilterSelect label="Status" value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} />
            <FilterSelect label="Service Interest" value={serviceInterestFilter} options={SERVICE_INTEREST_OPTIONS} onChange={setServiceInterestFilter} />
            <FilterSelect label="Lead Source" value={leadSourceFilter} options={LEAD_SOURCE_OPTIONS} onChange={setLeadSourceFilter} />
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-3 rounded-3xl border border-brand-red/20 bg-brand-red/10 p-4 font-bold text-brand-red shadow-sm">
          <AlertCircle size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="glass-card flex h-64 flex-col items-center justify-center rounded-4xl border border-white/70 shadow-podium-glass">
          <Loader2 size={32} className="mb-4 animate-spin text-brand-blue" />
          <p className="font-bold text-slate-500">Loading leads...</p>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="glass-card flex h-64 flex-col items-center justify-center rounded-4xl border border-white/70 p-8 text-center shadow-podium-glass">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-blue/10 ring-1 ring-brand-blue/10">
            <ClipboardList className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-700">
            {leads.length === 0 ? 'No leads yet.' : 'No matching leads found.'}
          </h2>
        </div>
      ) : (
        <div className="glass-card overflow-hidden rounded-4xl border border-white/70 shadow-podium-glass">
          <div className="border-b border-brand-blue/10 bg-white/55 px-5 py-4">
            <p className="text-sm font-bold text-slate-600">
              Showing <span className="text-brand-blue">{filteredLeads.length}</span> leads
            </p>
          </div>
          <div className="overflow-x-auto overscroll-x-contain [scrollbar-color:rgba(7,49,149,0.35)_rgba(255,255,255,0.6)] [scrollbar-width:thin]">
            <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-left">
              <thead>
                <tr className="bg-white/78">
                  <th className="border-b border-brand-blue/10 px-5 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-500">Student Name</th>
                  <th className="border-b border-brand-blue/10 px-5 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-500">Grade</th>
                  <th className="border-b border-brand-blue/10 px-5 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-500">Subjects</th>
                  <th className="border-b border-brand-blue/10 px-5 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-500">Parent Name</th>
                  <th className="border-b border-brand-blue/10 px-5 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-500">Parent Phone</th>
                  <th className="border-b border-brand-blue/10 px-5 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-500">Service Interest</th>
                  <th className="border-b border-brand-blue/10 px-5 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-500">Owner</th>
                  <th className="border-b border-brand-blue/10 px-5 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-500">Priority</th>
                  <th className="border-b border-brand-blue/10 px-5 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-500">Status</th>
                  <th className="border-b border-brand-blue/10 px-5 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-500">Next Follow-Up</th>
                  <th className="border-b border-brand-blue/10 px-5 py-4 text-right text-xs font-black uppercase tracking-[0.15em] text-slate-500">View</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => {
                  const followUpState = getFollowUpState(lead, today);

                  return (
                  <tr key={lead.id} className="transition-colors hover:bg-white/70">
                    <td className="border-t border-brand-blue/10 px-5 py-4 align-top font-black text-slate-800 whitespace-nowrap">{lead.studentName}</td>
                    <td className="border-t border-brand-blue/10 px-5 py-4 align-top text-sm text-slate-600 whitespace-nowrap">{lead.grade || 'Not set'}</td>
                    <td className="max-w-[220px] border-t border-brand-blue/10 px-5 py-4 align-top text-sm text-slate-600">{formatList(lead.subjects)}</td>
                    <td className="border-t border-brand-blue/10 px-5 py-4 align-top text-sm text-slate-600 whitespace-nowrap">{lead.parentName || 'Not set'}</td>
                    <td className="border-t border-brand-blue/10 px-5 py-4 align-top text-sm text-slate-600 whitespace-nowrap">
                      {lead.parentPhone ? (
                        <a href={`tel:${lead.parentPhone}`} className="hover:text-brand-blue">{lead.parentPhone}</a>
                      ) : (
                        'Not set'
                      )}
                    </td>
                    <td className="max-w-[220px] border-t border-brand-blue/10 px-5 py-4 align-top text-sm text-slate-600">{formatList(lead.serviceInterests)}</td>
                    <td className="border-t border-brand-blue/10 px-5 py-4 align-top text-sm font-bold text-slate-600 whitespace-nowrap">{lead.owner || 'Not set'}</td>
                    <td className="border-t border-brand-blue/10 px-5 py-4 align-top">
                      <Badge value={lead.priority} styles={priorityBadgeStyles} />
                    </td>
                    <td className="border-t border-brand-blue/10 px-5 py-4 align-top">
                      <Badge value={lead.status || 'New'} styles={statusBadgeStyles} />
                    </td>
                    <td className="border-t border-brand-blue/10 px-5 py-4 align-top text-sm whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black ${followUpStyles[followUpState]}`}>
                        {formatDate(lead.nextFollowUpDate)}
                      </span>
                    </td>
                    <td className="border-t border-brand-blue/10 px-5 py-4 align-top text-right">
                      <button
                        type="button"
                        onClick={() => handleViewLead(lead)}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-blue/10 bg-white/75 px-3 py-2 text-sm font-black text-brand-blue shadow-sm transition-all hover:bg-brand-blue hover:text-white hover:shadow-podium-soft"
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
        </div>
      )}

      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm">
          <button
            type="button"
            className="hidden flex-1 cursor-default md:block"
            onClick={closeDrawer}
            aria-label="Close lead drawer"
            disabled={savingEdit}
          />
          <aside className="glass-card flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-white/70 shadow-podium-glass">
            <div className="relative flex items-start justify-between gap-4 border-b border-brand-blue/10 bg-white/70 px-4 py-4 backdrop-blur sm:px-6 sm:py-5">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue via-brand-yellow to-brand-green" />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-blue/65">Lead Details</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-brand-ink">{selectedLead.studentName || 'Untitled Lead'}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge value={editForm.priority} styles={priorityBadgeStyles} />
                  <Badge value={editForm.status || 'New'} styles={statusBadgeStyles} />
                </div>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="focus-ring rounded-full p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-600"
                disabled={savingEdit}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateLead} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                {drawerError && (
                  <div className="flex items-center gap-3 rounded-3xl border border-brand-red/20 bg-brand-red/10 p-4 text-sm font-bold text-brand-red">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{drawerError}</span>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Student Name" required>
                    <input
                      type="text"
                      value={editForm.studentName}
                      onChange={(event) => updateEditForm('studentName', event.target.value)}
                      className={textInputClasses}
                    />
                  </FormField>

                  <FormField label="Grade">
                    <select
                      value={editForm.grade}
                      onChange={(event) => updateEditForm('grade', event.target.value)}
                      className={textInputClasses}
                    >
                      <option value="">Select grade</option>
                      {LEAD_GRADES.map((grade) => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Parent Name">
                    <input
                      type="text"
                      value={editForm.parentName}
                      onChange={(event) => updateEditForm('parentName', event.target.value)}
                      className={textInputClasses}
                    />
                  </FormField>

                  <FormField label="Parent Phone" required>
                    <input
                      type="tel"
                      value={editForm.parentPhone}
                      onChange={(event) => updateEditForm('parentPhone', event.target.value)}
                      className={textInputClasses}
                    />
                  </FormField>

                  <FormField label="Lead Source">
                    <select
                      value={editForm.leadSource}
                      onChange={(event) => updateEditForm('leadSource', event.target.value)}
                      className={textInputClasses}
                    >
                      <option value="">Select source</option>
                      {LEAD_SOURCES.map((source) => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Owner">
                    <select
                      value={editForm.owner}
                      onChange={(event) => updateEditForm('owner', event.target.value)}
                      className={textInputClasses}
                    >
                      <option value="">Default owner</option>
                      {LEAD_OWNERS.map((owner) => (
                        <option key={owner} value={owner}>{owner}</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Priority">
                    <select
                      value={editForm.priority}
                      onChange={(event) => updateEditForm('priority', event.target.value)}
                      className={textInputClasses}
                    >
                      {LEAD_PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>{priority}</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Status">
                    <select
                      value={editForm.status}
                      onChange={(event) => updateEditForm('status', event.target.value)}
                      className={textInputClasses}
                    >
                      {LEAD_STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Next Follow-Up Date">
                    <input
                      type="date"
                      value={editForm.nextFollowUpDate}
                      onChange={(event) => updateEditForm('nextFollowUpDate', event.target.value)}
                      className={textInputClasses}
                    />
                  </FormField>

                  <FormField label="Last Contacted Date">
                    <input
                      type="date"
                      value={editForm.lastContactedDate}
                      onChange={(event) => updateEditForm('lastContactedDate', event.target.value)}
                      className={textInputClasses}
                    />
                  </FormField>

                  <FormField label="Objection">
                    <select
                      value={editForm.objection}
                      onChange={(event) => updateEditForm('objection', event.target.value)}
                      className={textInputClasses}
                    >
                      <option value="">Select objection</option>
                      {LEAD_OBJECTIONS.map((objection) => (
                        <option key={objection} value={objection}>{objection}</option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <MultiSelectCheckboxes
                  label="Subjects"
                  options={LEAD_SUBJECTS}
                  values={editForm.subjects}
                  onChange={(values) => updateEditForm('subjects', values)}
                />

                <MultiSelectCheckboxes
                  label="Service Interests"
                  options={LEAD_SERVICE_INTERESTS}
                  values={editForm.serviceInterests}
                  onChange={(values) => updateEditForm('serviceInterests', values)}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  {editForm.serviceInterests.includes('Other') && (
                    <FormField label="Service Interest Other Notes">
                      <textarea
                        value={editForm.serviceInterestOtherNotes}
                        onChange={(event) => updateEditForm('serviceInterestOtherNotes', event.target.value)}
                        className={`${textInputClasses} min-h-24`}
                      />
                    </FormField>
                  )}

                  {editForm.leadSource === 'Other' && (
                    <FormField label="Lead Source Other Notes">
                      <textarea
                        value={editForm.leadSourceOtherNotes}
                        onChange={(event) => updateEditForm('leadSourceOtherNotes', event.target.value)}
                        className={`${textInputClasses} min-h-24`}
                      />
                    </FormField>
                  )}

                  {editForm.objection === 'Other' && (
                    <FormField label="Objection Other Notes">
                      <textarea
                        value={editForm.objectionOtherNotes}
                        onChange={(event) => updateEditForm('objectionOtherNotes', event.target.value)}
                        className={`${textInputClasses} min-h-24`}
                      />
                    </FormField>
                  )}
                </div>

                <FormField label="General Notes">
                  <textarea
                    value={editForm.generalNotes}
                    onChange={(event) => updateEditForm('generalNotes', event.target.value)}
                    className={`${textInputClasses} min-h-28`}
                  />
                </FormField>

                <section className="space-y-4 rounded-4xl border border-brand-blue/10 bg-white/60 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-black text-brand-ink">Activity Log</h3>
                      <p className="text-sm font-medium text-slate-500">Newest updates appear first.</p>
                    </div>
                    <MessageSquarePlus className="h-5 w-5 text-brand-blue" />
                  </div>

                  <form onSubmit={handleAddActivity} className="space-y-3">
                    {activityError && (
                      <div className="rounded-2xl border border-brand-red/20 bg-brand-red/10 p-3 text-sm font-bold text-brand-red">
                        {activityError}
                      </div>
                    )}
                    <textarea
                      value={activityNote}
                      onChange={(event) => setActivityNote(event.target.value)}
                      placeholder="Add Activity Update"
                      className={`${textInputClasses} min-h-24 w-full`}
                    />
                    <button
                      type="submit"
                      disabled={savingActivity}
                      className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingActivity ? <Loader2 size={18} className="animate-spin" /> : <MessageSquarePlus size={18} />}
                      {savingActivity ? 'Saving...' : 'Add Activity Update'}
                    </button>
                  </form>

                  {selectedLeadActivities.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-brand-blue/20 bg-white/70 p-4 text-sm font-medium text-slate-500">
                      No activity updates yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedLeadActivities.map((activity, index) => (
                        <article key={`${activity.createdBy || 'activity'}-${index}`} className="rounded-3xl border border-brand-blue/10 bg-white/80 p-4 shadow-sm">
                          <p className="whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">{activity.note}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-slate-500">
                            <span>{formatActivityDate(activity.createdAt)}</span>
                            <span>Created by {activity.createdBy || 'system'}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-brand-blue/10 bg-white/70 px-4 py-4 backdrop-blur sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={closeDrawer}
                  disabled={savingEdit}
                  className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingEdit ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="glass-card max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-4xl border border-white/70 shadow-podium-glass">
            <div className="relative flex items-center justify-between border-b border-brand-blue/10 bg-white/70 px-4 py-4 backdrop-blur sm:px-6">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue via-brand-yellow to-brand-green" />
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-blue/10 bg-white/70 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-brand-blue shadow-sm">
                  <Plus size={13} />
                  New Prospect
                </div>
                <h2 className="text-xl font-black tracking-tight text-brand-ink">Add Lead</h2>
                <p className="text-sm font-medium text-slate-500">Capture the first contact details and next step.</p>
              </div>
              <button
                type="button"
                onClick={closeAddModal}
                className="focus-ring rounded-full p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-600"
                disabled={savingLead}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddLead} className="max-h-[calc(92vh-73px)] overflow-y-auto">
              <div className="space-y-6 p-4 sm:p-6">
                {formError && (
                  <div className="flex items-center gap-3 rounded-3xl border border-brand-red/20 bg-brand-red/10 p-4 text-sm font-bold text-brand-red">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Student Name" required>
                    <input
                      type="text"
                      value={leadForm.studentName}
                      onChange={(event) => updateLeadForm('studentName', event.target.value)}
                      className={textInputClasses}
                    />
                  </FormField>

                  <FormField label="Grade">
                    <select
                      value={leadForm.grade}
                      onChange={(event) => updateLeadForm('grade', event.target.value)}
                      className={textInputClasses}
                    >
                      <option value="">Select grade</option>
                      {LEAD_GRADES.map((grade) => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Parent Name">
                    <input
                      type="text"
                      value={leadForm.parentName}
                      onChange={(event) => updateLeadForm('parentName', event.target.value)}
                      className={textInputClasses}
                    />
                  </FormField>

                  <FormField label="Parent Phone" required>
                    <input
                      type="tel"
                      value={leadForm.parentPhone}
                      onChange={(event) => updateLeadForm('parentPhone', event.target.value)}
                      className={textInputClasses}
                    />
                  </FormField>

                  <FormField label="Lead Source">
                    <select
                      value={leadForm.leadSource}
                      onChange={(event) => updateLeadForm('leadSource', event.target.value)}
                      className={textInputClasses}
                    >
                      <option value="">Select source</option>
                      {LEAD_SOURCES.map((source) => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Owner">
                    <select
                      value={leadForm.owner}
                      onChange={(event) => updateLeadForm('owner', event.target.value)}
                      className={textInputClasses}
                    >
                      <option value="">Default owner</option>
                      {LEAD_OWNERS.map((owner) => (
                        <option key={owner} value={owner}>{owner}</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Priority">
                    <select
                      value={leadForm.priority}
                      onChange={(event) => updateLeadForm('priority', event.target.value)}
                      className={textInputClasses}
                    >
                      {LEAD_PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>{priority}</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Status">
                    <select
                      value={leadForm.status}
                      onChange={(event) => updateLeadForm('status', event.target.value)}
                      className={textInputClasses}
                    >
                      {LEAD_STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Next Follow-Up Date">
                    <input
                      type="date"
                      value={leadForm.nextFollowUpDate}
                      onChange={(event) => updateLeadForm('nextFollowUpDate', event.target.value)}
                      className={textInputClasses}
                    />
                  </FormField>

                  <FormField label="Last Contacted Date">
                    <input
                      type="date"
                      value={leadForm.lastContactedDate}
                      onChange={(event) => updateLeadForm('lastContactedDate', event.target.value)}
                      className={textInputClasses}
                    />
                  </FormField>

                  <FormField label="Objection">
                    <select
                      value={leadForm.objection}
                      onChange={(event) => updateLeadForm('objection', event.target.value)}
                      className={textInputClasses}
                    >
                      <option value="">Select objection</option>
                      {LEAD_OBJECTIONS.map((objection) => (
                        <option key={objection} value={objection}>{objection}</option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <MultiSelectCheckboxes
                  label="Subjects"
                  options={LEAD_SUBJECTS}
                  values={leadForm.subjects}
                  onChange={(values) => updateLeadForm('subjects', values)}
                />

                <MultiSelectCheckboxes
                  label="Service Interests"
                  options={LEAD_SERVICE_INTERESTS}
                  values={leadForm.serviceInterests}
                  onChange={(values) => updateLeadForm('serviceInterests', values)}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  {leadForm.serviceInterests.includes('Other') && (
                    <FormField label="Service Interest Other Notes">
                      <textarea
                        value={leadForm.serviceInterestOtherNotes}
                        onChange={(event) => updateLeadForm('serviceInterestOtherNotes', event.target.value)}
                        className={`${textInputClasses} min-h-24`}
                      />
                    </FormField>
                  )}

                  {leadForm.leadSource === 'Other' && (
                    <FormField label="Lead Source Other Notes">
                      <textarea
                        value={leadForm.leadSourceOtherNotes}
                        onChange={(event) => updateLeadForm('leadSourceOtherNotes', event.target.value)}
                        className={`${textInputClasses} min-h-24`}
                      />
                    </FormField>
                  )}

                  {leadForm.objection === 'Other' && (
                    <FormField label="Objection Other Notes">
                      <textarea
                        value={leadForm.objectionOtherNotes}
                        onChange={(event) => updateLeadForm('objectionOtherNotes', event.target.value)}
                        className={`${textInputClasses} min-h-24`}
                      />
                    </FormField>
                  )}
                </div>

                <FormField label="General Notes">
                  <textarea
                    value={leadForm.generalNotes}
                    onChange={(event) => updateLeadForm('generalNotes', event.target.value)}
                    className={`${textInputClasses} min-h-28`}
                  />
                </FormField>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-brand-blue/10 bg-white/70 px-4 py-4 backdrop-blur sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={savingLead}
                  className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLead}
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingLead ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {savingLead ? 'Saving...' : 'Save Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
