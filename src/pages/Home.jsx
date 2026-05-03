import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { calculateExpectedTutorExpense, calculateProfit, getTuitionRecordsForMonth } from '../services/tuitionService';
import { getStudents } from '../services/studentService';
import { DollarSign, Users, ArrowRight, Loader2, CreditCard, Clock, UserPlus, CalendarCheck, GraduationCap, UserX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentDate = new Date();
  const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const displayMonth = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tuitionData, studentData] = await Promise.all([
          getTuitionRecordsForMonth(monthKey),
          getStudents()
        ]);
        setRecords(tuitionData);
        setStudents(studentData);
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
  const oneOnOneExpectedProfit = records
    .filter((record) => record.studentType === 'one-on-one')
    .reduce((sum, record) => {
      const expectedTutorExpense = record.expectedTutorExpense ?? calculateExpectedTutorExpense(record.expectedTutoringHours, record.tutorHourlyPay);
      const expectedProfit = record.expectedProfit ?? calculateProfit(record.expectedAmount, expectedTutorExpense);
      return sum + (Number(expectedProfit) || 0);
    }, 0);

  const paidStudentsCount = records.filter(r => r.paymentStatus === 'paid').length;
  const unpaidPartialCount = records.filter(r => r.paymentStatus === 'unpaid' || r.paymentStatus === 'partial').length;

  // Student counts
  const activeStudents = students.filter(s => s.status === 'active' || !s.status);
  const centerCount = activeStudents.filter(s => s.studentType === 'center').length;
  const oneOnOneCount = activeStudents.filter(s => s.studentType === 'one-on-one').length;
  const inactiveCount = students.filter(s => s.status === 'inactive').length;

  return (
    <div className="space-y-8 pb-12">
      <header className="glass-card relative overflow-hidden rounded-4xl border border-white/70 p-7 shadow-podium-glass">
        <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_88%_18%,rgba(254,195,29,0.24),transparent_16rem),radial-gradient(circle_at_16%_82%,rgba(7,49,149,0.10),transparent_18rem)]" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-blue/10 bg-white/65 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-brand-blue shadow-sm">
              <span className="h-2 w-2 rounded-full bg-brand-yellow shadow-[0_0_0_4px_rgba(254,195,29,0.18)]" />
              {displayMonth}
            </div>
            <h1 className="text-4xl font-black tracking-tight text-brand-ink">
              Welcome back, {currentUser?.displayName?.split(' ')[0] || 'Teacher'}
            </h1>
            <p className="mt-3 text-base font-medium leading-7 text-slate-600">
              Here&apos;s the current pulse of students, tuition, and monthly operations.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
            <div className="rounded-3xl border border-brand-blue/10 bg-white/65 p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Students</p>
              <p className="mt-2 text-2xl font-black text-brand-blue">{activeStudents.length}</p>
            </div>
            <div className="rounded-3xl border border-brand-green/10 bg-white/65 p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Collected</p>
              <p className="mt-2 text-2xl font-black text-brand-green">${collectedTotal.toFixed(0)}</p>
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="glass-card flex h-48 items-center justify-center rounded-4xl border border-white/70 shadow-podium-glass">
          <Loader2 size={32} className="animate-spin text-brand-blue" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Student Stats */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-blue/65">Roster</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-brand-ink">Student Overview</h2>
              </div>
              <Link to="/students" className="btn-ghost group min-h-0 px-3 py-2">
                View All <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="bento-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-sm font-bold text-slate-500">Active</span>
                    <p className="mt-3 text-3xl font-black tracking-tight text-brand-green">{activeStudents.length}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green ring-1 ring-brand-green/10">
                    <Users size={20} />
                  </div>
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-brand-green/65">Currently enrolled</p>
              </div>
              <div className="bento-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-sm font-bold text-slate-500">Center</span>
                    <p className="mt-3 text-3xl font-black tracking-tight text-brand-blue">{centerCount}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/10">
                    <GraduationCap size={20} />
                  </div>
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-brand-blue/65">Group program</p>
              </div>
              <div className="bento-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-sm font-bold text-slate-500">One-on-One</span>
                    <p className="mt-3 text-3xl font-black tracking-tight text-[#765300]">{oneOnOneCount}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-yellow/20 text-[#765300] ring-1 ring-brand-yellow/30">
                    <Users size={20} />
                  </div>
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[#765300]/65">Private tutoring</p>
              </div>
              <div className="bento-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-sm font-bold text-slate-500">Inactive</span>
                    <p className="mt-3 text-3xl font-black tracking-tight text-slate-700">{inactiveCount}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                    <UserX size={20} />
                  </div>
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Paused records</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-blue/65">Shortcuts</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-brand-ink">Quick Actions</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Link to="/add-student" className="bento-card group p-5 focus-ring">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/10 transition-all group-hover:bg-brand-blue group-hover:text-white">
                  <UserPlus size={22} />
                </div>
                <p className="text-base font-black text-slate-800 transition-colors group-hover:text-brand-blue">Add Student</p>
                <p className="mt-2 text-sm font-medium text-slate-500">Create a new student profile.</p>
              </Link>
              <Link to="/attendance" className="bento-card group p-5 focus-ring">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green ring-1 ring-brand-green/10 transition-all group-hover:bg-brand-green group-hover:text-white">
                  <CalendarCheck size={22} />
                </div>
                <p className="text-base font-black text-slate-800 transition-colors group-hover:text-brand-green">Mark Attendance</p>
                <p className="mt-2 text-sm font-medium text-slate-500">Update center attendance.</p>
              </Link>
              <Link to="/tuition" className="bento-card group p-5 focus-ring">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-yellow/20 text-[#765300] ring-1 ring-brand-yellow/30 transition-all group-hover:bg-brand-yellow group-hover:text-brand-blue">
                  <CreditCard size={22} />
                </div>
                <p className="text-base font-black text-slate-800 transition-colors group-hover:text-[#765300]">Manage Tuition</p>
                <p className="mt-2 text-sm font-medium text-slate-500">Review payments and balances.</p>
              </Link>
              <Link to="/students" className="bento-card group p-5 focus-ring">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red ring-1 ring-brand-red/10 transition-all group-hover:bg-brand-red group-hover:text-white">
                  <Users size={22} />
                </div>
                <p className="text-base font-black text-slate-800 transition-colors group-hover:text-brand-red">View Students</p>
                <p className="mt-2 text-sm font-medium text-slate-500">Search and manage roster.</p>
              </Link>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-blue/65">Revenue</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-brand-ink">Financial Summary</h2>
            </div>
            <Link to="/tuition" className="btn-ghost group min-h-0 px-3 py-2">
              Manage Tuition <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="summary-card p-6">
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-500">Total Expected Revenue</p>
                  <p className="mt-3 text-3xl font-black tracking-tight text-brand-ink">${expectedTotal.toFixed(2)}</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-blue/65">Projected this month</p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/10">
                  <CreditCard size={22} />
                </div>
              </div>
            </div>

            <div className="summary-card p-6">
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-500">Total Collected Revenue</p>
                  <p className="mt-3 text-3xl font-black tracking-tight text-brand-green">${collectedTotal.toFixed(2)}</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-green/65">Payments received</p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green ring-1 ring-brand-green/10">
                  <DollarSign size={22} />
                </div>
              </div>
            </div>

            <div className="summary-card p-6">
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-500">Total Remaining Balance</p>
                  <p className="mt-3 text-3xl font-black tracking-tight text-brand-red">${remainingTotal > 0 ? remainingTotal.toFixed(2) : '0.00'}</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-red/60">Outstanding balance</p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-yellow/20 text-[#765300] ring-1 ring-brand-yellow/30">
                  <Clock size={22} />
                </div>
              </div>
            </div>

            <div className="summary-card p-6">
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-500">1:1 Expected Profit</p>
                  <p className="mt-3 text-3xl font-black tracking-tight text-brand-green">${oneOnOneExpectedProfit.toFixed(2)}</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-green/65">After tutor pay</p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green ring-1 ring-brand-green/10">
                  <DollarSign size={22} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="glass-card flex items-center justify-between rounded-3xl border border-white/70 p-6 shadow-podium-soft">
              <div>
                <p className="mb-1 text-sm font-bold text-slate-500">Paid Students</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black tracking-tight text-brand-green">{paidStudentsCount}</span>
                  <span className="mb-1 text-sm font-bold text-slate-400">/ {records.length}</span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green ring-1 ring-brand-green/10">
                <Users size={22} />
              </div>
            </div>

            <div className="glass-card flex items-center justify-between rounded-3xl border border-white/70 p-6 shadow-podium-soft">
              <div>
                <p className="mb-1 text-sm font-bold text-slate-500">Unpaid / Partial</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black tracking-tight text-brand-red">{unpaidPartialCount}</span>
                  <span className="mb-1 text-sm font-bold text-slate-400">/ {records.length}</span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red ring-1 ring-brand-red/10">
                <Users size={22} />
              </div>
            </div>
          </div>

          {records.length === 0 && (
            <div className="glass-card mt-6 rounded-4xl border border-white/70 p-7 text-center shadow-podium-glass">
              <p className="mb-4 text-base font-bold text-brand-blue">No tuition records generated for this month yet.</p>
              <Link to="/tuition" className="btn-primary">
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
