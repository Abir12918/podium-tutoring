import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getCenterStudents } from '../services/studentService';
import { getAttendanceForMonth, saveAttendanceRecord } from '../services/attendanceService';
import { getWeekendDatesForMonth, isFutureDate } from '../utils/dateUtils';
import { ChevronLeft, ChevronRight, Check, X, Loader2, MessageSquare, AlertCircle, CheckCircle2, CalendarDays, Lock } from 'lucide-react';

const DEFAULT_CENTER_CLASS = 'Unassigned';

const Attendance = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({}); // mapped by studentId_YYYY-MM-DD
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [savingState, setSavingState] = useState(null); // track `${cellId}_${newStatus}`
  const [noteModal, setNoteModal] = useState({ isOpen: false, student: null, date: null, currentNote: '' });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const weekendDates = getWeekendDatesForMonth(year, month);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  useEffect(() => {
    if (!noteModal.isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [noteModal.isOpen]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [studentsRes, attendanceRes] = await Promise.all([
        getCenterStudents(),
        getAttendanceForMonth(monthKey)
      ]);

      studentsRes.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
      setStudents(studentsRes);

      const attMap = {};
      attendanceRes.forEach(record => {
        attMap[`${record.studentId}_${record.date}`] = record;
      });
      setAttendanceData(attMap);

    } catch (err) {
      console.error("Failed to load attendance data", err);
      setError('Failed to load records from Firestore. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (delta) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const showSavedFeedback = () => {
    setSaveMessage('Saved');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const handleMarkAttendance = async (student, dateString, newStatus) => {
    setError('');
    const cellId = `${student.id}_${dateString}`;

    // Toggle off if they click the same status again
    const currentRecord = attendanceData[cellId];
    const currentStatus = currentRecord?.status;
    const finalStatus = currentStatus === newStatus ? 'empty' : newStatus;

    setSavingState(`${cellId}_${finalStatus}`);

    try {
      const record = {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        date: dateString,
        monthKey: monthKey,
        status: finalStatus,
        studentType: 'center',
        note: currentRecord?.note || '', // Preserve existing notes
      };

      const savedRecord = await saveAttendanceRecord(record);
      setAttendanceData(prev => ({
        ...prev,
        [cellId]: savedRecord
      }));
      showSavedFeedback();
    } catch (err) {
      console.error("Failed to save attendance", err);
      setError('Failed to save attendance. Please check your connection.');
    } finally {
      setSavingState(null);
    }
  };

  const handleSaveNote = async () => {
    setError('');
    const { student, date, currentNote } = noteModal;
    const cellId = `${student.id}_${date}`;
    const record = attendanceData[cellId] || {};

    // If no attendance marked yet, save as 'empty' status but with note
    const finalStatus = record.status || 'empty';

    setNoteModal({ isOpen: false, student: null, date: null, currentNote: '' });
    setSavingState(`${cellId}_note`);

    try {
      const newRecord = {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        date: date,
        monthKey: monthKey,
        status: finalStatus,
        studentType: 'center',
        note: currentNote,
      };

      const savedRecord = await saveAttendanceRecord(newRecord);
      setAttendanceData(prev => ({
        ...prev,
        [cellId]: savedRecord
      }));
      showSavedFeedback();
    } catch (err) {
      console.error("Failed to save note", err);
      setError('Failed to save note. Please try again.');
    } finally {
      setSavingState(null);
    }
  };

  const formatDateLabel = (dateString) => {
    const [y, m, d] = dateString.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return {
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
      monthDay: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  };

  const hasAnyAttendance = Object.keys(attendanceData).length > 0;

  return (
    <div className="space-y-7 pb-12">
      <header className="glass-card relative overflow-hidden rounded-4xl border border-white/70 p-6 shadow-podium-glass md:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue via-brand-yellow to-brand-green" />
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-blue/10 bg-white/65 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-brand-blue shadow-sm">
              <span className="h-2 w-2 rounded-full bg-brand-yellow shadow-[0_0_0_4px_rgba(254,195,29,0.18)]" />
              Attendance
            </div>
            <h1 className="text-4xl font-black tracking-tight text-brand-ink">Attendance Tracker</h1>
            <p className="mt-3 text-base font-medium leading-7 text-slate-600">Mark and review weekend attendance for active center students.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
            {/* Saved Feedback Indicator */}
            <div className={`flex items-center gap-2 rounded-full border border-brand-green/15 bg-white/65 px-3 py-2 text-brand-green shadow-sm transition-opacity duration-300 ${saveMessage ? 'opacity-100' : 'opacity-0'}`}>
              <CheckCircle2 size={18} />
              <span className="text-sm font-bold">Saved</span>
            </div>

            {/* Month Selector */}
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
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Weekend Dates</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-black text-brand-ink">
                <CalendarDays size={16} className="text-brand-blue" />
                {weekendDates.length} columns
              </p>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="flex items-center rounded-3xl border border-brand-red/20 bg-brand-red/10 p-4 font-bold text-brand-red shadow-sm">
          <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="glass-card flex h-64 flex-col items-center justify-center rounded-4xl border border-white/70 shadow-podium-glass">
          <Loader2 size={32} className="mb-4 animate-spin text-brand-blue" />
          <p className="font-bold text-slate-500">Loading attendance...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="glass-card flex h-64 flex-col items-center justify-center rounded-4xl border border-white/70 p-8 text-center shadow-podium-glass">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/10">
            <CalendarDays size={26} />
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-700">No center students yet.</h2>
          <p className="mt-2 max-w-md text-slate-500">
            You don't have any active center students to track attendance for.
          </p>
        </div>
      ) : (
        <>
          {!hasAnyAttendance && (
            <div className="flex items-center rounded-3xl border border-brand-blue/15 bg-brand-blue/10 p-4 text-brand-blue shadow-sm">
              <AlertCircle className="mr-3 h-5 w-5 shrink-0" />
              <p className="text-sm font-bold">No attendance has been marked for the selected month yet.</p>
            </div>
          )}

          <div className="glass-card overflow-hidden rounded-4xl border border-white/70 shadow-podium-glass">
            <div className="border-b border-brand-blue/10 bg-white/55 px-5 py-4">
              <p className="text-sm font-bold text-slate-600">
                Showing <span className="text-brand-blue">{students.length}</span> center students for {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="overflow-x-auto overscroll-x-contain [scrollbar-color:rgba(7,49,149,0.35)_rgba(255,255,255,0.6)] [scrollbar-width:thin]">
              <table className="w-full min-w-max border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="bg-white/78">
                    <th className="sticky left-0 z-30 min-w-[220px] border-b border-brand-blue/10 bg-white/95 px-6 py-4 text-sm font-black text-slate-700 shadow-[10px_0_24px_-20px_rgba(7,49,149,0.55)] backdrop-blur">
                      Student Name
                    </th>
                    {weekendDates.map(dateStr => {
                      const { dayOfWeek, monthDay } = formatDateLabel(dateStr);
                      return (
                        <th key={dateStr} className="min-w-[158px] border-b border-l border-brand-blue/10 px-4 py-3 text-center">
                          <div className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">{dayOfWeek}</div>
                          <div className="mt-1 text-sm font-black text-slate-800">{monthDay}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student.id} className="group transition-colors hover:bg-white/70">
                      <td className="sticky left-0 z-20 min-w-[220px] border-t border-brand-blue/10 bg-white/95 px-6 py-4 font-bold text-slate-800 shadow-[10px_0_24px_-20px_rgba(7,49,149,0.55)] backdrop-blur transition-colors group-hover:bg-white">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-blue text-sm font-black text-white shadow-podium-soft">
                            {(student.firstName || '?').charAt(0)}{(student.lastName || '').charAt(0)}
                          </div>
                          <div>
                            <div>{student.firstName} {student.lastName}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">Class: {student.centerClass || DEFAULT_CENTER_CLASS}</div>
                          </div>
                        </div>
                      </td>
                      {weekendDates.map(dateStr => {
                        const cellId = `${student.id}_${dateStr}`;
                        const record = attendanceData[cellId];
                        const isFuture = isFutureDate(dateStr);
                        const isSavingPresent = savingState === `${cellId}_present`;
                        const isSavingAbsent = savingState === `${cellId}_absent`;
                        const isSavingEmpty = savingState === `${cellId}_empty`;
                        const isSavingNote = savingState === `${cellId}_note`;
                        const hasNote = Boolean(record?.note?.trim());

                        return (
                          <td key={dateStr} className={`group/cell relative border-l border-t border-brand-blue/10 px-3 py-3 text-center align-middle ${isFuture ? 'bg-slate-50/45' : ''}`}>
                            {isFuture ? (
                              <div className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-100/55 text-slate-400">
                                <Lock size={13} />
                                <span className="text-xs font-black uppercase tracking-[0.12em]">Locked</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <div className="relative flex w-full items-center justify-center gap-1 rounded-2xl border border-brand-blue/10 bg-white/70 p-1.5 shadow-sm transition-colors hover:border-brand-blue/20">
                                  <button
                                    disabled={savingState !== null}
                                    onClick={() => handleMarkAttendance(student, dateStr, 'present')}
                                    className={`focus-ring flex flex-1 justify-center rounded-xl border py-2 transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                                      record?.status === 'present'
                                        ? 'border-brand-green/20 bg-brand-green/10 text-brand-green shadow-sm ring-1 ring-brand-green/10'
                                        : 'border-transparent text-slate-400 hover:bg-brand-green/10 hover:text-brand-green'
                                    }`}
                                    title={record?.status === 'present' ? 'Remove Present' : 'Mark Present'}
                                  >
                                    {isSavingPresent || (isSavingEmpty && record?.status === 'present') ? (
                                      <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                      <Check size={16} strokeWidth={2.5} />
                                    )}
                                  </button>
                                  <div className="h-5 w-px bg-brand-blue/10"></div>
                                  <button
                                    disabled={savingState !== null}
                                    onClick={() => handleMarkAttendance(student, dateStr, 'absent')}
                                    className={`focus-ring flex flex-1 justify-center rounded-xl border py-2 transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                                      record?.status === 'absent'
                                        ? 'border-brand-red/20 bg-brand-red/10 text-brand-red shadow-sm ring-1 ring-brand-red/10'
                                        : 'border-transparent text-slate-400 hover:bg-brand-red/10 hover:text-brand-red'
                                    }`}
                                    title={record?.status === 'absent' ? 'Remove Absent' : 'Mark Absent'}
                                  >
                                    {isSavingAbsent || (isSavingEmpty && record?.status === 'absent') ? (
                                      <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                      <X size={16} strokeWidth={2.5} />
                                    )}
                                  </button>

                                  {/* Note Button */}
                                  <button
                                    disabled={savingState !== null}
                                    onClick={() => setNoteModal({ isOpen: true, student, date: dateStr, currentNote: record?.note || '' })}
                                    className={`focus-ring absolute -right-2 -top-3 rounded-full border p-1.5 shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                                      hasNote
                                        ? 'z-10 border-brand-blue/20 bg-brand-blue/10 text-brand-blue opacity-100'
                                        : 'z-10 border-slate-200 bg-white text-slate-400 opacity-0 hover:bg-brand-blue/10 hover:text-brand-blue group-hover/cell:opacity-100'
                                    }`}
                                    title={hasNote ? "Edit Note" : "Add Note"}
                                  >
                                    {isSavingNote ? <Loader2 size={12} className="animate-spin" /> : <MessageSquare size={12} />}
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Note Modal */}
      {noteModal.isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-md overflow-hidden rounded-4xl border border-white/70 shadow-podium-glass">
            <div className="flex items-start justify-between gap-4 border-b border-brand-blue/10 bg-white/55 p-6">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-blue/10 bg-white/70 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-brand-blue shadow-sm">
                  <MessageSquare size={13} />
                  Attendance Note
                </div>
                <h3 className="text-xl font-black tracking-tight text-brand-ink">
                  {noteModal.currentNote ? 'Edit Note' : 'Add Note'}
                </h3>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  For {noteModal.student?.firstName} {noteModal.student?.lastName} on {noteModal.date}
                </p>
              </div>
              <button
                onClick={() => setNoteModal({ isOpen: false, student: null, date: null, currentNote: '' })}
                className="focus-ring rounded-full p-2 text-slate-400 transition-colors hover:bg-white/80 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <textarea
                autoFocus
                className="input-field h-32 resize-none"
                value={noteModal.currentNote}
                onChange={(e) => setNoteModal({...noteModal, currentNote: e.target.value})}
                placeholder="Enter optional notes (e.g. Arrived late, sick...)"
              ></textarea>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={() => setNoteModal({ isOpen: false, student: null, date: null, currentNote: '' })}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  className="btn-primary"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Attendance;
