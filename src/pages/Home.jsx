import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTuitionRecordsForMonth } from '../services/tuitionService';
import { DollarSign, Users, ArrowRight, Loader2, CreditCard, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentDate = new Date();
  const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const displayMonth = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getTuitionRecordsForMonth(monthKey);
        setRecords(data);
      } catch (err) {
        console.error("Failed to load summary data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [monthKey]);

  // Calculations
  const expectedTotal = records.reduce((sum, r) => sum + (Number(r.expectedAmount) || 0), 0);
  const collectedTotal = records.reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);
  const remainingTotal = expectedTotal - collectedTotal;

  const paidStudentsCount = records.filter(r => r.paymentStatus === 'paid').length;
  const unpaidPartialCount = records.filter(r => r.paymentStatus === 'unpaid' || r.paymentStatus === 'partial').length;

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          Welcome back, {currentUser?.displayName?.split(' ')[0] || 'Teacher'}
        </h1>
        <p className="text-slate-500 mt-2">Here's your center's overview for {displayMonth}.</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-48 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <Loader2 size={32} className="animate-spin text-brand-blue" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Financial Summary</h2>
            <Link to="/tuition" className="text-sm font-medium text-brand-blue hover:text-blue-700 flex items-center gap-1 group">
              Manage Tuition <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-50 text-brand-blue rounded-xl flex items-center justify-center">
                  <CreditCard size={20} />
                </div>
                <h3 className="font-semibold text-slate-700">Expected Revenue</h3>
              </div>
              <p className="text-3xl font-bold text-slate-800">${expectedTotal.toFixed(2)}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-brand-green/10 text-brand-green rounded-xl flex items-center justify-center">
                  <DollarSign size={20} />
                </div>
                <h3 className="font-semibold text-slate-700">Collected Revenue</h3>
              </div>
              <p className="text-3xl font-bold text-slate-800">${collectedTotal.toFixed(2)}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                  <Clock size={20} />
                </div>
                <h3 className="font-semibold text-slate-700">Remaining Balance</h3>
              </div>
              <p className="text-3xl font-bold text-slate-800">${remainingTotal > 0 ? remainingTotal.toFixed(2) : '0.00'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Paid Students</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-slate-800">{paidStudentsCount}</span>
                  <span className="text-sm font-medium text-slate-400 mb-1">/ {records.length}</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-brand-green/10 rounded-full flex items-center justify-center text-brand-green">
                <Users size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Unpaid / Partial</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-slate-800">{unpaidPartialCount}</span>
                  <span className="text-sm font-medium text-slate-400 mb-1">/ {records.length}</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-600">
                <Users size={24} />
              </div>
            </div>
          </div>

          {records.length === 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center mt-6">
              <p className="text-blue-800 font-medium mb-3">No tuition records generated for this month yet.</p>
              <Link to="/tuition" className="inline-block px-5 py-2 bg-brand-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                Set up {displayMonth} Tuition
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
