import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStudents } from '../services/studentService';
import { Users, Mail, Phone, RefreshCw, Search, X, GraduationCap, WalletCards } from 'lucide-react';

const DEFAULT_CENTER_CLASS = 'Unassigned';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active'); // 'all', 'active', 'inactive', 'center', 'one-on-one'
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getStudents();
      // Safety check: ensure each student has required fields for sorting
      data.sort((a, b) => {
        const nameA = (a.lastName || '').toLowerCase();
        const nameB = (b.lastName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setStudents(data);
    } catch (err) {
      console.error("Failed to load students", err);
      setError('Failed to load students. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = students.filter(student => {
    // Apply status/type filter first
    let passesFilter = true;
    if (filter === 'active') passesFilter = student.status === 'active' || !student.status;
    else if (filter === 'inactive') passesFilter = student.status === 'inactive';
    else if (filter === 'center') passesFilter = student.studentType === 'center' && student.status !== 'inactive';
    else if (filter === 'one-on-one') passesFilter = student.studentType === 'one-on-one' && student.status !== 'inactive';
    // 'all' passes everything

    if (!passesFilter) return false;

    // Apply search query
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    const fullName = `${student.firstName || ''} ${student.lastName || ''}`.toLowerCase();
    const school = (student.school || '').toLowerCase();
    const parentEmails = (student.parentEmails || []).join(' ').toLowerCase();
    const parentPhones = (student.parentPhones || []).join(' ').toLowerCase();

    return (
      fullName.includes(q) ||
      school.includes(q) ||
      parentEmails.includes(q) ||
      parentPhones.includes(q)
    );
  });

  const activeCount = students.filter((student) => student.status === 'active' || !student.status).length;
  const centerCount = students.filter((student) => student.studentType === 'center' && student.status !== 'inactive').length;
  const oneOnOneCount = students.filter((student) => student.studentType === 'one-on-one' && student.status !== 'inactive').length;

  return (
    <div className="space-y-7 pb-12">
      <header className="glass-card relative space-y-6 overflow-hidden rounded-4xl border border-white/70 p-6 shadow-podium-glass md:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue via-brand-yellow to-brand-green" />
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-blue/10 bg-white/65 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-brand-blue shadow-sm">
              <span className="h-2 w-2 rounded-full bg-brand-yellow shadow-[0_0_0_4px_rgba(254,195,29,0.18)]" />
              Roster
            </div>
            <h1 className="text-4xl font-black tracking-tight text-brand-ink">Students Directory</h1>
            <p className="mt-3 text-base font-medium text-slate-600">Search, filter, and manage enrolled students.</p>
          </div>
          <div className="flex w-full shrink-0 flex-wrap items-center gap-1 rounded-[1.75rem] border border-brand-blue/10 bg-white/70 p-1.5 shadow-sm sm:w-fit sm:rounded-full">
            <button 
              onClick={() => setFilter('active')}
              className={`focus-ring rounded-full px-4 py-2 text-sm font-bold transition-all ${filter === 'active' ? 'bg-brand-blue text-white shadow-podium-soft' : 'text-slate-600 hover:bg-white hover:text-brand-blue'}`}
            >
              Active
            </button>
            <button 
              onClick={() => setFilter('center')}
              className={`focus-ring rounded-full px-4 py-2 text-sm font-bold transition-all ${filter === 'center' ? 'bg-brand-blue text-white shadow-podium-soft' : 'text-slate-600 hover:bg-white hover:text-brand-blue'}`}
            >
              Center
            </button>
            <button 
              onClick={() => setFilter('one-on-one')}
              className={`focus-ring rounded-full px-4 py-2 text-sm font-bold transition-all ${filter === 'one-on-one' ? 'bg-brand-blue text-white shadow-podium-soft' : 'text-slate-600 hover:bg-white hover:text-brand-blue'}`}
            >
              One-on-One
            </button>
            <div className="w-px h-6 bg-brand-blue/10 mx-1 hidden sm:block"></div>
            <button 
              onClick={() => setFilter('inactive')}
              className={`focus-ring rounded-full px-4 py-2 text-sm font-bold transition-all ${filter === 'inactive' ? 'bg-slate-200 text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-800'}`}
            >
              Inactive
            </button>
            <button 
              onClick={() => setFilter('all')}
              className={`focus-ring rounded-full px-4 py-2 text-sm font-bold transition-all ${filter === 'all' ? 'bg-slate-200 text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-800'}`}
            >
              All
            </button>
            <div className="w-px h-6 bg-brand-blue/10 mx-1"></div>
            <button 
              onClick={fetchStudents}
              className="focus-ring rounded-full p-2 text-slate-400 transition-colors hover:bg-brand-blue/10 hover:text-brand-blue"
              title="Refresh Roster"
            >
              <RefreshCw size={18} className={loading ? "animate-spin text-blue-500" : ""} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, school, email, or phone..."
              className="input-field py-3 pl-11 pr-10 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="focus-ring absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 sm:min-w-[410px]">
            <div className="rounded-3xl border border-brand-blue/10 bg-white/65 px-4 py-3 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Active</p>
              <p className="mt-1 text-2xl font-black tracking-tight text-brand-ink">{activeCount}</p>
            </div>
            <div className="rounded-3xl border border-brand-blue/10 bg-white/65 px-4 py-3 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Center</p>
              <p className="mt-1 text-2xl font-black tracking-tight text-brand-blue">{centerCount}</p>
            </div>
            <div className="rounded-3xl border border-brand-blue/10 bg-white/65 px-4 py-3 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">1:1</p>
              <p className="mt-1 text-2xl font-black tracking-tight text-brand-green">{oneOnOneCount}</p>
            </div>
          </div>
        </div>
      </header>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 font-medium flex items-center">
          {error}
        </div>
      )}

      {loading && !students.length ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <RefreshCw size={32} className="animate-spin text-blue-500 mb-4" />
          <p className="text-slate-500 font-medium">Loading roster...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            {searchQuery ? <Search className="w-8 h-8 text-slate-400" /> : <Users className="w-8 h-8 text-slate-400" />}
          </div>
          <h2 className="text-xl font-semibold text-slate-700">
            {searchQuery ? 'No matching students found.' : 'No students yet.'}
          </h2>
          <p className="text-slate-500 mt-2 max-w-md">
            {searchQuery
              ? 'Try adjusting your search or changing the filter.'
              : filter !== 'all'
                ? `You don't have any ${filter} students at the moment.`
                : "Get started by adding a new student to your roster."
            }
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden rounded-4xl border border-white/70 shadow-podium-glass">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left">
              <thead>
                <tr className="border-b border-brand-blue/10 bg-white/65">
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-500">Student Name</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-500">Academics</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-500">Contact Info</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-500">Enrollment</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-500">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-[0.15em] text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="group border-t border-brand-blue/10 transition-colors hover:bg-white/78">
                    {/* Student Name & Type */}
                    <td className="border-t border-brand-blue/10 px-6 py-5 align-top">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-blue text-sm font-black text-white shadow-podium-soft">
                          {(student.firstName || '?').charAt(0)}{(student.lastName || '').charAt(0)}
                        </div>
                        <div>
                          <div className="font-black tracking-tight text-slate-800">{student.firstName} {student.lastName}</div>
                          <span className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black ${student.studentType === 'center' ? 'border-brand-blue/15 bg-brand-blue/10 text-brand-blue' : 'border-brand-green/15 bg-brand-green/10 text-brand-green'}`}>
                        {student.studentType === 'center' ? 'Center' : 'One-on-One'}
                          </span>
                          {student.studentType === 'center' && (
                            <div className="mt-1 text-xs font-semibold text-slate-500">Class: {student.centerClass || DEFAULT_CENTER_CLASS}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    {/* Academics */}
                    <td className="border-t border-brand-blue/10 px-6 py-5 align-top">
                      <div className="flex items-start gap-2">
                        <GraduationCap size={17} className="mt-0.5 shrink-0 text-brand-blue/70" />
                        <div>
                          <div className="text-sm font-bold text-slate-800">Grade {student.grade || 'N/A'}</div>
                          <div className="text-sm text-slate-500">{student.school || 'No school specified'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="border-t border-brand-blue/10 px-6 py-5 align-top">
                      <div className="space-y-1.5">
                        {student.parentEmails?.length > 0 && student.parentEmails[0] && (
                          <div className="flex items-center text-sm text-slate-600">
                            <Mail size={14} className="mr-2 text-brand-blue/60 shrink-0" />
                            <a href={`mailto:${student.parentEmails[0]}`} className="hover:text-brand-blue truncate max-w-[150px] sm:max-w-xs">{student.parentEmails[0]}</a>
                            {student.parentEmails.length > 1 && <span className="ml-1 text-xs text-slate-400 shrink-0">(+{student.parentEmails.length - 1})</span>}
                          </div>
                        )}
                        {student.parentPhones?.length > 0 && student.parentPhones[0] && (
                          <div className="flex items-center text-sm text-slate-600">
                            <Phone size={14} className="mr-2 text-brand-blue/60 shrink-0" />
                            <a href={`tel:${student.parentPhones[0]}`} className="hover:text-brand-blue whitespace-nowrap">{student.parentPhones[0]}</a>
                            {student.parentPhones.length > 1 && <span className="ml-1 text-xs text-slate-400 shrink-0">(+{student.parentPhones.length - 1})</span>}
                          </div>
                        )}
                        {(!student.parentEmails?.length && !student.parentPhones?.length) && (
                          <span className="text-sm text-slate-400 italic">No contact info</span>
                        )}
                      </div>
                    </td>

                    {/* Enrollment */}
                    <td className="border-t border-brand-blue/10 px-6 py-5 align-top">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                        <WalletCards size={16} className="text-brand-green" />
                        ${student.monthlyTuition}/mo
                      </div>
                      <div className="text-xs text-slate-500">Started {student.startDate ? new Date(student.startDate).toLocaleDateString() : 'N/A'}</div>
                    </td>

                    {/* Status */}
                    <td className="border-t border-brand-blue/10 px-6 py-5 align-top">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black capitalize ${
                        student.status === 'active' || !student.status ? 'border-brand-green/15 bg-brand-green/10 text-brand-green' : 'border-slate-200 bg-slate-100 text-slate-700'
                      }`}>
                        {student.status || 'Active'}
                      </span>
                    </td>
                    
                    {/* Actions */}
                    <td className="border-t border-brand-blue/10 px-6 py-5 text-right align-top">
                      <Link
                        to={`/students/${student.id}`}
                        className="inline-flex items-center justify-center rounded-full border border-brand-blue/10 bg-white/75 px-4 py-2 text-sm font-black text-brand-blue shadow-sm transition-all hover:-translate-y-0.5 hover:bg-brand-blue hover:text-white hover:shadow-podium-soft"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
