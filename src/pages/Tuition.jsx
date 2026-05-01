import React, { useState, useEffect } from 'react';
import { getTuitionRecordsForMonth, generateTuitionRecordsForMonth, saveTuitionRecord } from '../services/tuitionService';
import { ChevronLeft, ChevronRight, Loader2, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';

const Tuition = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

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
    setGenerating(true);
    setError('');
    try {
      await generateTuitionRecordsForMonth(monthKey);
      await loadData();
      showSavedFeedback('Month setup complete');
    } catch (err) {
      console.error("Failed to setup month", err);
      setError("Failed to set up month. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const showSavedFeedback = (msg = 'Saved') => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const handleRecordChange = (index, field, value) => {
    const newRecords = [...records];
    newRecords[index] = { ...newRecords[index], [field]: value };
    
    // Auto-update status based on paid amount
    if (field === 'paidAmount') {
      const paid = Number(value) || 0;
      const expected = Number(newRecords[index].expectedAmount) || 0;
      if (paid === 0) {
        newRecords[index].paymentStatus = 'unpaid';
      } else if (paid >= expected) {
        newRecords[index].paymentStatus = 'paid';
      } else {
        newRecords[index].paymentStatus = 'partial';
      }
    }
    
    setRecords(newRecords);
  };

  const handleRecordBlur = async (index) => {
    const record = records[index];
    try {
      await saveTuitionRecord(record);
      showSavedFeedback();
    } catch (err) {
      console.error("Failed to update record", err);
      setError("Failed to save changes.");
    }
  };

  // Calculations
  const expectedTotal = records.reduce((sum, r) => sum + (Number(r.expectedAmount) || 0), 0);
  const collectedTotal = records.reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);
  const remainingTotal = expectedTotal - collectedTotal;

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Tuition Tracking</h1>
          <p className="text-slate-500 mt-2">Manage monthly student payments and revenue.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 text-green-600 font-medium transition-opacity duration-300 ${saveMessage ? 'opacity-100' : 'opacity-0'}`}>
            <CheckCircle2 size={18} />
            <span className="text-sm">{saveMessage}</span>
          </div>

          <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm w-fit shrink-0">
            <button onClick={() => handleMonthChange(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600">
              <ChevronLeft size={20} />
            </button>
            <span className="font-semibold text-slate-800 min-w-[140px] text-center">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Expected Revenue</p>
            <h3 className="text-2xl font-bold text-slate-800">${expectedTotal.toFixed(2)}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Collected</p>
            <h3 className="text-2xl font-bold text-slate-800">${collectedTotal.toFixed(2)}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Remaining Balance</p>
            <h3 className="text-2xl font-bold text-slate-800">${remainingTotal > 0 ? remainingTotal.toFixed(2) : '0.00'}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="font-semibold text-slate-800">Tuition Records</h2>
          <button
            onClick={handleSetupMonth}
            disabled={generating || loading}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : null}
            Set up this month
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 size={32} className="animate-spin text-blue-500 mb-4" />
            <p className="text-slate-500 font-medium">Loading records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 p-8 text-center bg-white">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <DollarSign size={32} className="text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-700">No records found.</h2>
            <p className="text-slate-500 mt-2 max-w-md">
              Click "Set up this month" to automatically generate tuition records for all active students.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-white border-b border-slate-200">
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#e2e8f0]">Student</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Expected</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Paid</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-36">Status</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-40">Payment Date</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-36">Method</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[200px]">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record, index) => {
                  const statusColors = {
                    unpaid: 'bg-red-50 text-red-700 border-red-200 focus:ring-red-500',
                    partial: 'bg-yellow-50 text-yellow-700 border-yellow-200 focus:ring-yellow-500',
                    paid: 'bg-green-50 text-green-700 border-green-200 focus:ring-green-500'
                  };

                  return (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="py-3 px-4 font-medium text-slate-800 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#f1f5f9] group-hover:bg-slate-50 transition-colors">
                        {record.studentName}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 capitalize">
                        {record.studentType}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center text-sm font-medium text-slate-800">
                          <span className="text-slate-400 mr-1">$</span>
                          {record.expectedAmount}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-slate-400 text-sm pointer-events-none">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={record.paidAmount}
                            onChange={(e) => handleRecordChange(index, 'paidAmount', e.target.value)}
                            onBlur={() => handleRecordBlur(index)}
                            className="w-full pl-7 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={record.paymentStatus}
                          onChange={(e) => handleRecordChange(index, 'paymentStatus', e.target.value)}
                          onBlur={() => handleRecordBlur(index)}
                          className={`w-full py-1.5 px-3 text-sm rounded-lg border font-medium outline-none focus:ring-1 transition-shadow ${statusColors[record.paymentStatus]}`}
                        >
                          <option value="unpaid">Unpaid</option>
                          <option value="partial">Partial</option>
                          <option value="paid">Paid</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="date"
                          value={record.paymentDate || ''}
                          onChange={(e) => handleRecordChange(index, 'paymentDate', e.target.value)}
                          onBlur={() => handleRecordBlur(index)}
                          className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow text-slate-700"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={record.paymentMethod || ''}
                          onChange={(e) => handleRecordChange(index, 'paymentMethod', e.target.value)}
                          onBlur={() => handleRecordBlur(index)}
                          className="w-full py-1.5 px-3 text-sm rounded-lg border border-slate-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition-shadow text-slate-700"
                        >
                          <option value="">- Select -</option>
                          <option value="cash">Cash</option>
                          <option value="zelle">Zelle</option>
                          <option value="check">Check</option>
                          <option value="card">Card</option>
                          <option value="other">Other</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={record.note || ''}
                          onChange={(e) => handleRecordChange(index, 'note', e.target.value)}
                          onBlur={() => handleRecordBlur(index)}
                          placeholder="Add note..."
                          className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow text-slate-700"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tuition;
