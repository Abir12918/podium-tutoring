import { useState, useEffect } from 'react';
import {
  calculateEarnedAmount,
  calculateHourlyRate,
  calculatePaymentStatus,
  getTuitionRecordsForMonth,
  generateTuitionRecordsForMonth,
  saveTuitionRecord
} from '../services/tuitionService';
import { ChevronLeft, ChevronRight, Loader2, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';

const statusColors = {
  unpaid: 'bg-red-50 text-red-700 border-red-200 focus:ring-red-500',
  partial: 'bg-yellow-50 text-yellow-700 border-yellow-200 focus:ring-yellow-500',
  paid: 'bg-green-50 text-green-700 border-green-200 focus:ring-green-500'
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

const Tuition = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState([]);
  const [activeTab, setActiveTab] = useState('center');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState('');
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const tabs = [
    { id: 'center', label: 'Center', setupLabel: 'Set up Center Tuition' },
    { id: 'one-on-one', label: '1:1', setupLabel: 'Set up 1:1 Tuition' },
  ];
  const activeTabConfig = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const displayedRecords = records.filter((record) => record.studentType === activeTab);

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
    }
    
    setRecords(newRecords);
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

  // Calculations
  const expectedTotal = displayedRecords.reduce((sum, r) => sum + (Number(r.expectedAmount) || 0), 0);
  const collectedTotal = displayedRecords.reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);
  const remainingTotal = expectedTotal - collectedTotal;
  const earnedTotal = displayedRecords.reduce((sum, r) => sum + getEarnedAmount(r), 0);
  const expectedHoursTotal = displayedRecords.reduce((sum, r) => sum + (Number(r.expectedTutoringHours) || 0), 0);
  const completedHoursTotal = displayedRecords.reduce((sum, r) => sum + (Number(r.completedTutoringHours) || 0), 0);

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

      <div className="flex items-center gap-2 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab.id ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      {activeTab === 'center' ? (
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
              <p className="text-sm font-medium text-slate-500">Collected Revenue</p>
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-sm font-medium text-slate-500">Expected Revenue</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-2">${expectedTotal.toFixed(2)}</h3>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-sm font-medium text-slate-500">Earned Revenue</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-2">${earnedTotal.toFixed(2)}</h3>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-sm font-medium text-slate-500">Collected Revenue</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-2">${collectedTotal.toFixed(2)}</h3>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-sm font-medium text-slate-500">Remaining Balance</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-2">${remainingTotal > 0 ? remainingTotal.toFixed(2) : '0.00'}</h3>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-sm font-medium text-slate-500">Expected Hours</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-2">{expectedHoursTotal.toFixed(2)}</h3>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-sm font-medium text-slate-500">Completed Hours</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-2">{completedHoursTotal.toFixed(2)}</h3>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="font-semibold text-slate-800">{activeTabConfig.label} Tuition Records</h2>
          <button
            onClick={handleSetupMonth}
            disabled={Boolean(generating) || loading}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {generating === activeTab ? <Loader2 size={16} className="animate-spin" /> : null}
            {activeTabConfig.setupLabel}
          </button>
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
                {displayedRecords.map((record) => {
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
                            onChange={(e) => handleRecordChange(record.id, 'paidAmount', e.target.value)}
                            onBlur={() => handleRecordBlur(record.id)}
                            className="w-full pl-7 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={record.paymentStatus}
                          onChange={(e) => handleRecordChange(record.id, 'paymentStatus', e.target.value)}
                          onBlur={() => handleRecordBlur(record.id)}
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
                          onChange={(e) => handleRecordChange(record.id, 'paymentDate', e.target.value)}
                          onBlur={() => handleRecordBlur(record.id)}
                          className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow text-slate-700"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={record.paymentMethod || ''}
                          onChange={(e) => handleRecordChange(record.id, 'paymentMethod', e.target.value)}
                          onBlur={() => handleRecordBlur(record.id)}
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
                          onChange={(e) => handleRecordChange(record.id, 'note', e.target.value)}
                          onBlur={() => handleRecordBlur(record.id)}
                          placeholder="Add note..."
                          className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow text-slate-700"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="bg-white border-b border-slate-200">
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#e2e8f0]">Student</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Expected Amount</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Expected Hours</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Completed Hours</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Hourly Rate</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Earned Amount</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Paid</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Status</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-40">Payment Date</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-36">Method</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[200px]">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedRecords.map((record) => {
                    const hourlyRate = calculateHourlyRate(record.expectedAmount, record.expectedTutoringHours);
                    const earnedAmount = calculateEarnedAmount(record.completedTutoringHours, hourlyRate);

                    return (
                      <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="py-3 px-4 font-medium text-slate-800 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#f1f5f9] group-hover:bg-slate-50 transition-colors">
                          {record.studentName}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-800">
                          {formatCurrency(record.expectedAmount)}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-700">
                          {formatNumber(record.expectedTutoringHours)}
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            min="0"
                            step="0.25"
                            value={record.completedTutoringHours ?? ''}
                            onChange={(e) => handleRecordChange(record.id, 'completedTutoringHours', e.target.value)}
                            onBlur={() => handleRecordBlur(record.id)}
                            className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
                          />
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-800">
                          {hourlyRate === null ? '—' : formatCurrency(hourlyRate)}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-800">
                          {earnedAmount === null ? '—' : formatCurrency(earnedAmount)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-slate-400 text-sm pointer-events-none">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={record.paidAmount}
                              onChange={(e) => handleRecordChange(record.id, 'paidAmount', e.target.value)}
                              onBlur={() => handleRecordBlur(record.id)}
                              className="w-full pl-7 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-3 py-1.5 text-sm rounded-lg border font-medium ${statusColors[record.paymentStatus]}`}>
                            {getStatusLabel(record.paymentStatus)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="date"
                            value={record.paymentDate || ''}
                            onChange={(e) => handleRecordChange(record.id, 'paymentDate', e.target.value)}
                            onBlur={() => handleRecordBlur(record.id)}
                            className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow text-slate-700"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={record.paymentMethod || ''}
                            onChange={(e) => handleRecordChange(record.id, 'paymentMethod', e.target.value)}
                            onBlur={() => handleRecordBlur(record.id)}
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
                            onChange={(e) => handleRecordChange(record.id, 'note', e.target.value)}
                            onBlur={() => handleRecordBlur(record.id)}
                            placeholder="Add note..."
                            className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow text-slate-700"
                          />
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
    </div>
  );
};

export default Tuition;
