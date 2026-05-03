import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTuitionRecordsForMonth } from '../services/tuitionService';
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

  const paidStudentsCount = records.filter(r => r.paymentStatus === 'paid').length;
  const unpaidPartialCount = records.filter(r => r.paymentStatus === 'unpaid' || r.paymentStatus === 'partial').length;

  // Student counts
  const activeStudents = students.filter(s => s.status === 'active' || !s.status);
  const centerCount = activeStudents.filter(s => s.studentType === 'center').length;
  const oneOnOneCount = activeStudents.filter(s => s.studentType === 'one-on-one').length;
  const inactiveCount = students.filter(s => s.status === 'inactive').length;

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
        <div className="space-y-8">
          {/* Student Stats */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Student Overview</h2>
              <Link to="/students" className="text-sm font-medium text-brand-blue hover:text-blue-700 flex items-center gap-1 group">
                View All <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-brand-green/10 text-brand-green rounded-lg flex items-center justify-center">
                    <Users size={18} />
                  </div>
                  <span className="text-sm font-medium text-slate-500">Active</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{activeStudents.length}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                    <GraduationCap size={18} />
                  </div>
                  <span className="text-sm font-medium text-slate-500">Center</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{centerCount}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                    <Users size={18} />
                  </div>
                  <span className="text-sm font-medium text-slate-500">One-on-One</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{oneOnOneCount}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center">
                    <UserX size={18} />
                  </div>
                  <span className="text-sm font-medium text-slate-500">Inactive</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{inactiveCount}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to="/add-student" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-brand-blue hover:shadow-md transition-all group text-center">
                <div className="w-10 h-10 bg-brand-blue/10 text-brand-blue rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-brand-blue group-hover:text-white transition-colors">
                  <UserPlus size={20} />
                </div>
                <p className="text-sm font-semibold text-slate-700 group-hover:text-brand-blue transition-colors">Add Student</p>
              </Link>
              <Link to="/attendance" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-brand-blue hover:shadow-md transition-all group text-center">
                <div className="w-10 h-10 bg-brand-green/10 text-brand-green rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-brand-green group-hover:text-white transition-colors">
                  <CalendarCheck size={20} />
                </div>
                <p className="text-sm font-semibold text-slate-700 group-hover:text-brand-green transition-colors">Mark Attendance</p>
              </Link>
              <Link to="/tuition" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-brand-blue hover:shadow-md transition-all group text-center">
                <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                  <CreditCard size={20} />
                </div>
                <p className="text-sm font-semibold text-slate-700 group-hover:text-orange-600 transition-colors">Manage Tuition</p>
              </Link>
              <Link to="/students" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-brand-blue hover:shadow-md transition-all group text-center">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Users size={20} />
                </div>
                <p className="text-sm font-semibold text-slate-700 group-hover:text-purple-600 transition-colors">View Students</p>
              </Link>
            </div>
          </div>

          {/* Financial Summary */}
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
                <h3 className="font-semibold text-slate-700">Total Expected Revenue</h3>
              </div>
              <p className="text-3xl font-bold text-slate-800">${expectedTotal.toFixed(2)}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-brand-green/10 text-brand-green rounded-xl flex items-center justify-center">
                  <DollarSign size={20} />
                </div>
                <h3 className="font-semibold text-slate-700">Total Collected Revenue</h3>
              </div>
              <p className="text-3xl font-bold text-slate-800">${collectedTotal.toFixed(2)}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                  <Clock size={20} />
                </div>
                <h3 className="font-semibold text-slate-700">Total Remaining Balance</h3>
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
