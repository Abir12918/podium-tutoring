import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStudents } from '../services/studentService';
import { Users, Mail, Phone, RefreshCw, Search, X } from 'lucide-react';

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

  return (
    <div className="space-y-6 pb-12">
      <header className="space-y-4 mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Students Directory</h1>
            <p className="text-slate-500 mt-2">Manage all enrolled students.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-fit shrink-0">
            <button 
              onClick={() => setFilter('active')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filter === 'active' ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Active
            </button>
            <button 
              onClick={() => setFilter('center')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filter === 'center' ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Center
            </button>
            <button 
              onClick={() => setFilter('one-on-one')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filter === 'one-on-one' ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              One-on-One
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
            <button 
              onClick={() => setFilter('inactive')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filter === 'inactive' ? 'bg-slate-200 text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Inactive
            </button>
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filter === 'all' ? 'bg-slate-200 text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              All
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button 
              onClick={fetchStudents}
              className="p-2 text-slate-400 hover:text-blue-600 transition-colors rounded-lg"
              title="Refresh Roster"
            >
              <RefreshCw size={18} className={loading ? "animate-spin text-blue-500" : ""} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, school, email, or phone..."
            className="w-full pl-11 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all text-sm shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={16} />
            </button>
          )}
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student Name</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Academics</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact Info</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrollment</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    {/* Student Name & Type */}
                    <td className="py-4 px-6 align-top">
                      <div className="font-semibold text-slate-800">{student.firstName} {student.lastName}</div>
                      <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${student.studentType === 'center' ? 'bg-indigo-50 text-indigo-700' : 'bg-purple-50 text-purple-700'}`}>
                        {student.studentType === 'center' ? 'Center' : 'One-on-One'}
                      </span>
                      {student.studentType === 'center' && (
                        <div className="text-xs text-slate-500 mt-1">Class: {student.centerClass || DEFAULT_CENTER_CLASS}</div>
                      )}
                    </td>
                    
                    {/* Academics */}
                    <td className="py-4 px-6 align-top">
                      <div className="text-sm text-slate-800 font-medium">Grade {student.grade || 'N/A'}</div>
                      <div className="text-sm text-slate-500">{student.school || 'No school specified'}</div>
                    </td>

                    {/* Contact Info */}
                    <td className="py-4 px-6 align-top">
                      <div className="space-y-1.5">
                        {student.parentEmails?.length > 0 && student.parentEmails[0] && (
                          <div className="flex items-center text-sm text-slate-600">
                            <Mail size={14} className="mr-2 text-slate-400 shrink-0" />
                            <a href={`mailto:${student.parentEmails[0]}`} className="hover:text-blue-600 truncate max-w-[150px] sm:max-w-xs">{student.parentEmails[0]}</a>
                            {student.parentEmails.length > 1 && <span className="ml-1 text-xs text-slate-400 shrink-0">(+{student.parentEmails.length - 1})</span>}
                          </div>
                        )}
                        {student.parentPhones?.length > 0 && student.parentPhones[0] && (
                          <div className="flex items-center text-sm text-slate-600">
                            <Phone size={14} className="mr-2 text-slate-400 shrink-0" />
                            <a href={`tel:${student.parentPhones[0]}`} className="hover:text-blue-600 whitespace-nowrap">{student.parentPhones[0]}</a>
                            {student.parentPhones.length > 1 && <span className="ml-1 text-xs text-slate-400 shrink-0">(+{student.parentPhones.length - 1})</span>}
                          </div>
                        )}
                        {(!student.parentEmails?.length && !student.parentPhones?.length) && (
                          <span className="text-sm text-slate-400 italic">No contact info</span>
                        )}
                      </div>
                    </td>

                    {/* Enrollment */}
                    <td className="py-4 px-6 align-top">
                      <div className="text-sm text-slate-800 font-medium">${student.monthlyTuition}/mo</div>
                      <div className="text-xs text-slate-500">Started {student.startDate ? new Date(student.startDate).toLocaleDateString() : 'N/A'}</div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 align-top">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {student.status || 'Active'}
                      </span>
                    </td>
                    
                    {/* Actions */}
                    <td className="py-4 px-6 align-top text-right">
                      <Link
                        to={`/students/${student.id}`}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-brand-blue bg-brand-blue/10 hover:bg-brand-blue hover:text-white rounded-lg transition-colors"
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
