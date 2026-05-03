import React, { useState, useEffect } from 'react';
import { getCenterStudents } from '../services/studentService';
import { getAttendanceForMonth, saveAttendanceRecord } from '../services/attendanceService';
import { getWeekendDatesForMonth, isFutureDate } from '../utils/dateUtils';
import { ChevronLeft, ChevronRight, Check, X, Loader2, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';

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
    <div className="space-y-6 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Attendance Tracker</h1>
          <p className="text-slate-500 mt-2">Mark and review center student attendance.</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Saved Feedback Indicator */}
          <div className={`flex items-center gap-2 text-green-600 font-medium transition-opacity duration-300 ${saveMessage ? 'opacity-100' : 'opacity-0'}`}>
            <CheckCircle2 size={18} />
            <span className="text-sm">Saved</span>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm w-fit shrink-0">
            <button 
              onClick={() => handleMonthChange(-1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
              title="Previous Month"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-semibold text-slate-800 min-w-[140px] text-center">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button 
              onClick={() => handleMonthChange(1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
              title="Next Month"
            >
              <ChevronRight size={20} />
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

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <Loader2 size={32} className="animate-spin text-blue-500 mb-4" />
          <p className="text-slate-500 font-medium">Loading attendance...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
          <h2 className="text-xl font-semibold text-slate-700">No center students yet.</h2>
          <p className="text-slate-500 mt-2 max-w-md">
            You don't have any active center students to track attendance for.
          </p>
        </div>
      ) : (
        <>
          {!hasAnyAttendance && (
            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 flex items-center shadow-sm">
              <AlertCircle className="w-5 h-5 mr-3 text-blue-500 shrink-0" />
              <p className="text-sm font-medium">No attendance has been marked for the selected month yet.</p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-4 px-6 text-sm font-semibold text-slate-600 sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_#e2e8f0]">
                      Student Name
                    </th>
                    {weekendDates.map(dateStr => {
                      const { dayOfWeek, monthDay } = formatDateLabel(dateStr);
                      return (
                        <th key={dateStr} className="py-3 px-4 text-center border-l border-slate-100 min-w-[150px]">
                          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{dayOfWeek}</div>
                          <div className="text-sm font-medium text-slate-800">{monthDay}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map(student => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="py-4 px-6 font-medium text-slate-800 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#f1f5f9] group-hover:bg-slate-50 transition-colors">
                        <div>{student.firstName} {student.lastName}</div>
                        <div className="text-xs text-slate-500 font-normal mt-1">Class: {student.centerClass || DEFAULT_CENTER_CLASS}</div>
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
                          <td key={dateStr} className="py-3 px-3 text-center border-l border-slate-100 align-middle relative group/cell">
                            {isFuture ? (
                              <div className="flex justify-center items-center h-10 w-full rounded-lg bg-slate-50 border border-slate-100 cursor-not-allowed">
                                <span className="text-xs text-slate-400 font-medium">Locked</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center justify-center gap-1 bg-slate-50/50 rounded-lg p-1 border border-slate-200 hover:border-slate-300 transition-colors w-full relative">
                                  <button
                                    disabled={savingState !== null}
                                    onClick={() => handleMarkAttendance(student, dateStr, 'present')}
                                    className={`flex-1 flex justify-center py-1.5 rounded-md transition-all ${
                                      record?.status === 'present' 
                                        ? 'bg-green-100 text-green-700 shadow-sm border border-green-200' 
                                        : 'text-slate-400 hover:text-green-600 hover:bg-slate-100 border border-transparent'
                                    }`}
                                    title={record?.status === 'present' ? 'Remove Present' : 'Mark Present'}
                                  >
                                    {isSavingPresent || (isSavingEmpty && record?.status === 'present') ? (
                                      <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                      <Check size={16} strokeWidth={2.5} />
                                    )}
                                  </button>
                                  <div className="w-px h-4 bg-slate-200"></div>
                                  <button
                                    disabled={savingState !== null}
                                    onClick={() => handleMarkAttendance(student, dateStr, 'absent')}
                                    className={`flex-1 flex justify-center py-1.5 rounded-md transition-all ${
                                      record?.status === 'absent' 
                                        ? 'bg-red-100 text-red-700 shadow-sm border border-red-200' 
                                        : 'text-slate-400 hover:text-red-600 hover:bg-slate-100 border border-transparent'
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
                                    className={`absolute -top-3 -right-2 p-1 rounded-full transition-all border shadow-sm ${
                                      hasNote 
                                        ? 'bg-blue-100 border-blue-200 text-blue-600 opacity-100 z-10' 
                                        : 'bg-white border-slate-200 text-slate-400 opacity-0 group-hover/cell:opacity-100 hover:bg-slate-50 hover:text-blue-500 z-10'
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
      {noteModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              {noteModal.currentNote ? 'Edit Note' : 'Add Note'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              For {noteModal.student?.firstName} {noteModal.student?.lastName} on {noteModal.date}
            </p>
            <textarea
              autoFocus
              className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none h-28 text-slate-700"
              value={noteModal.currentNote}
              onChange={(e) => setNoteModal({...noteModal, currentNote: e.target.value})}
              placeholder="Enter optional notes (e.g. Arrived late, sick...)"
            ></textarea>
            <div className="flex justify-end gap-3 mt-5">
              <button 
                onClick={() => setNoteModal({ isOpen: false, student: null, date: null, currentNote: '' })} 
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveNote} 
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Attendance;
