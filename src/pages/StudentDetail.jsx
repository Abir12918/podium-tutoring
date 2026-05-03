import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getStudentById, updateStudent, deleteStudent } from '../services/studentService';
import { ArrowLeft, Mail, Phone, BookOpen, Calendar, DollarSign, Loader2, User, Edit, Save, X, Trash2, Plus, CheckCircle, AlertCircle, Archive, RefreshCcw } from 'lucide-react';

const DEFAULT_CENTER_CLASS = 'Unassigned';

const ArrayInput = ({ label, field, type = "text", placeholder, formData, handleArrayChange, removeArrayItem, addArrayItem }) => (
  <div className="space-y-3 rounded-3xl border border-brand-blue/10 bg-white/60 p-4 shadow-sm">
    <label className="block text-sm font-bold text-slate-700">{label}</label>
    {formData[field].map((item, index) => (
      <div key={index} className="flex gap-2 items-start">
        <input
          type={type}
          value={item}
          onChange={(e) => handleArrayChange(field, index, e.target.value)}
          placeholder={placeholder}
          className="input-field flex-1"
        />
        {formData[field].length > 1 && (
          <button
            type="button"
            onClick={() => removeArrayItem(field, index)}
            className="focus-ring rounded-2xl p-2.5 text-slate-400 transition-colors hover:bg-brand-red/10 hover:text-brand-red shrink-0"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>
    ))}
    <button
      type="button"
      onClick={() => addArrayItem(field)}
      className="btn-ghost min-h-0 px-2 py-2"
    >
      <Plus size={16} className="mr-1" /> Add another
    </button>
  </div>
);

const SectionHeading = ({ icon: Icon, title, eyebrow }) => (
  <div className="mb-5 flex items-center gap-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/10">
      <Icon size={19} strokeWidth={2.3} />
    </div>
    <div>
      {eyebrow && <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-blue/60">{eyebrow}</p>}
      <h3 className="text-lg font-black tracking-tight text-brand-ink">{title}</h3>
    </div>
  </div>
);

const StudentDetail = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const [archiving, setArchiving] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const data = await getStudentById(studentId);
        if (data) {
          setStudent(data);
        } else {
          setError('Student not found.');
        }
      } catch (err) {
        console.error("Failed to load student details", err);
        setError('Failed to load student details.');
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [studentId]);

  const handleEditClick = () => {
    setFormData({
      ...student,
      subjects: student.subjects ? student.subjects.join(', ') : '',
      studentEmails: student.studentEmails?.length ? student.studentEmails : [''],
      parentEmails: student.parentEmails?.length ? student.parentEmails : [''],
      parentPhones: student.parentPhones?.length ? student.parentPhones : [''],
      startDate: student.startDate ? student.startDate.split('T')[0] : '',
      expectedMonthlyTutoringHours: student.expectedMonthlyTutoringHours ?? '',
      assignedTutorName: student.assignedTutorName || '',
      tutorHourlyPay: student.tutorHourlyPay ?? '',
      centerClass: student.studentType === 'center' ? student.centerClass || DEFAULT_CENTER_CLASS : student.centerClass,
    });
    setStatus({ type: '', message: '' });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setStatus({ type: '', message: '' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'studentType' && value === 'center' && !prev.centerClass ? { centerClass: DEFAULT_CENTER_CLASS } : {}),
    }));
  };

  const handleArrayChange = (field, index, value) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData(prev => ({ ...prev, [field]: newArray }));
  };

  const addArrayItem = (field) => {
    setFormData(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  };

  const removeArrayItem = (field, index) => {
    const newArray = formData[field].filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, [field]: newArray }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus({ type: '', message: '' });

    try {
      const processedData = {
        ...formData,
        subjects: typeof formData.subjects === 'string' ? formData.subjects.split(',').map(s => s.trim()).filter(Boolean) : formData.subjects,
        studentEmails: formData.studentEmails.filter(Boolean),
        parentEmails: formData.parentEmails.filter(Boolean),
        parentPhones: formData.parentPhones.filter(Boolean),
        monthlyTuition: Number(formData.monthlyTuition) || 0,
        ...(formData.studentType === 'one-on-one' ? {
          expectedMonthlyTutoringHours: formData.expectedMonthlyTutoringHours === '' ? null : Number(formData.expectedMonthlyTutoringHours) || 0,
          assignedTutorName: formData.assignedTutorName,
          tutorHourlyPay: formData.tutorHourlyPay === '' ? null : Number(formData.tutorHourlyPay) || 0,
        } : {}),
        centerClass: formData.studentType === 'center' ? formData.centerClass || DEFAULT_CENTER_CLASS : formData.centerClass,
      };

      if (!processedData.firstName || !processedData.lastName) {
        throw new Error("First and Last name are required.");
      }

      await updateStudent(studentId, processedData);
      
      setStudent(processedData);
      setIsEditing(false);
      
      setStatus({ type: 'success', message: 'Student updated.' });
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
      
    } catch (error) {
      console.error("Update error:", error);
      setStatus({ type: 'error', message: error.message || 'Failed to update student.' });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (e) => {
    e.preventDefault();
    setArchiving(true);
    setStatus({ type: '', message: '' });

    try {
      const updateData = {
        status: 'inactive',
        archiveReason: archiveReason,
        archivedAt: new Date().toISOString()
      };
      await updateStudent(studentId, updateData);
      setStudent(prev => ({ ...prev, ...updateData }));
      setShowArchiveModal(false);
      setStatus({ type: 'success', message: 'Student archived.' });
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    } catch (error) {
      console.error("Archive error:", error);
      setStatus({ type: 'error', message: 'Failed to archive student.' });
    } finally {
      setArchiving(false);
    }
  };

  const handleRestore = async () => {
    setArchiving(true);
    setStatus({ type: '', message: '' });

    try {
      const updateData = {
        status: 'active',
        archiveReason: '',
        archivedAt: ''
      };
      await updateStudent(studentId, updateData);
      setStudent(prev => ({ ...prev, ...updateData }));
      setShowRestoreModal(false);
      setStatus({ type: 'success', message: 'Student restored to active status.' });
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    } catch (error) {
      console.error("Restore error:", error);
      setStatus({ type: 'error', message: 'Failed to restore student.' });
    } finally {
      setArchiving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setStatus({ type: '', message: '' });

    try {
      await deleteStudent(studentId);
      setStatus({ type: 'success', message: 'Student permanently deleted.' });
      setTimeout(() => navigate('/students'), 1500);
    } catch (error) {
      console.error("Delete error:", error);
      setStatus({ type: 'error', message: 'Failed to delete student.' });
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-brand-blue mb-4" />
        <p className="text-slate-500 font-medium">Loading student profile...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="space-y-6">
        <Link to="/students" className="inline-flex items-center text-slate-500 hover:text-brand-blue transition-colors font-medium">
          <ArrowLeft size={16} className="mr-2" /> Back to Students
        </Link>
        <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200 text-center">
          <h2 className="text-lg font-bold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link to="/students" className="btn-ghost group min-h-0 px-3 py-2">
          <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Students
        </Link>
        
        {status.message && !isEditing && (
          <div className={`flex items-center rounded-2xl border px-4 py-2 font-bold shadow-sm ${status.type === 'success' ? 'border-brand-green/20 bg-brand-green/10 text-brand-green' : 'border-brand-red/20 bg-brand-red/10 text-brand-red'}`}>
            {status.type === 'success' ? <CheckCircle size={18} className="mr-2" /> : <AlertCircle size={18} className="mr-2" />}
            {status.message}
          </div>
        )}
      </div>

      <div className="glass-card overflow-hidden rounded-4xl border border-white/70 shadow-podium-glass">
        {/* Header */}
        <div className="relative flex flex-col justify-between gap-6 border-b border-brand-blue/10 p-6 md:flex-row md:items-center md:p-8">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue via-brand-yellow to-brand-green" />
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-blue to-blue-700 text-3xl font-black text-white shadow-podium-soft ring-4 ring-white/70">
              {student.firstName.charAt(0)}{student.lastName.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-brand-ink md:text-4xl">
                {student.firstName} {student.lastName}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${student.studentType === 'center' ? 'border-brand-blue/15 bg-brand-blue/10 text-brand-blue' : 'border-brand-green/15 bg-brand-green/10 text-brand-green'}`}>
                  {student.studentType === 'center' ? 'Center' : 'One-on-One'}
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${student.status === 'active' || !student.status ? 'border-brand-green/15 bg-brand-green/10 text-brand-green' : 'border-slate-200 bg-slate-100 text-slate-700'}`}>
                  {student.status || 'Active'}
                </span>
              </div>
            </div>
          </div>
          
          {!isEditing && (
            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              {student.status === 'inactive' ? (
                <button
                  onClick={() => setShowRestoreModal(true)}
                  className="btn-secondary text-brand-green"
                >
                  <RefreshCcw size={18} /> Restore Student
                </button>
              ) : (
                <button
                  onClick={() => setShowArchiveModal(true)}
                  className="btn-secondary hover:text-brand-red"
                >
                  <Archive size={18} /> Archive Student
                </button>
              )}
              <button
                onClick={() => setShowDeleteModal(true)}
                className="btn-secondary hover:text-brand-red"
              >
                <Trash2 size={18} /> Delete Student
              </button>
              <button
                onClick={handleEditClick}
                className="btn-primary"
              >
                <Edit size={18} /> Edit Profile
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {isEditing ? (
          <form onSubmit={handleSave} className="grid grid-cols-1 gap-5 p-4 md:p-6 lg:grid-cols-12">
            {status.message && status.type === 'error' && (
              <div className="flex items-center rounded-3xl border border-brand-red/20 bg-brand-red/10 p-4 font-bold text-brand-red lg:col-span-12">
                <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
                {status.message}
              </div>
            )}
            
            <section className="bento-card p-5 md:p-6 lg:col-span-6">
              <SectionHeading icon={User} eyebrow="Profile" title="Personal Details" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">First Name *</label>
                  <input required type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="input-field" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Last Name *</label>
                  <input required type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="input-field" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Student Type</label>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-brand-blue/10 bg-white/65 p-1.5 shadow-sm">
                    <label className={`flex cursor-pointer items-center justify-center rounded-xl px-3 py-2.5 text-sm font-black transition-all ${formData.studentType === 'center' ? 'bg-brand-blue text-white shadow-podium-soft' : 'text-slate-500 hover:bg-white hover:text-brand-blue'}`}>
                      <input type="radio" name="studentType" value="center" checked={formData.studentType === 'center'} onChange={handleInputChange} className="hidden" /> Center
                    </label>
                    <label className={`flex cursor-pointer items-center justify-center rounded-xl px-3 py-2.5 text-sm font-black transition-all ${formData.studentType === 'one-on-one' ? 'bg-brand-blue text-white shadow-podium-soft' : 'text-slate-500 hover:bg-white hover:text-brand-blue'}`}>
                      <input type="radio" name="studentType" value="one-on-one" checked={formData.studentType === 'one-on-one'} onChange={handleInputChange} className="hidden" /> One-on-One
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} className="select-field">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                {formData.studentType === 'center' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">Center Class</label>
                    <select name="centerClass" value={formData.centerClass || DEFAULT_CENTER_CLASS} onChange={handleInputChange} className="select-field">
                      <option value="Unassigned">Unassigned</option>
                      <option value="Abir">Abir</option>
                      <option value="Rahat">Rahat</option>
                    </select>
                  </div>
                )}
              </div>
            </section>

            <section className="bento-card p-5 md:p-6 lg:col-span-6">
              <SectionHeading icon={BookOpen} eyebrow="Academic" title="Academics & Enrollment" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">School</label>
                  <input type="text" name="school" value={formData.school} onChange={handleInputChange} className="input-field" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Grade</label>
                  <input type="text" name="grade" value={formData.grade} onChange={handleInputChange} className="input-field" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700">Subjects <span className="text-slate-400 font-normal">(Comma separated)</span></label>
                  <input type="text" name="subjects" value={formData.subjects} onChange={handleInputChange} placeholder="e.g. Math, English, SAT" className="input-field" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Start Date</label>
                  <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} className="input-field" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Monthly Tuition ($)</label>
                  <div className="relative">
                    <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="number" name="monthlyTuition" value={formData.monthlyTuition} onChange={handleInputChange} min="0" step="0.01" className="input-field pl-10" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Changes apply only to newly generated tuition records.</p>
                </div>
                {formData.studentType === 'one-on-one' && (
                  <>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-700">Expected Monthly Tutoring Hours</label>
                      <input type="number" name="expectedMonthlyTutoringHours" value={formData.expectedMonthlyTutoringHours} onChange={handleInputChange} min="0" step="0.25" className="input-field" placeholder="e.g. 8.5" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-700">Assigned Tutor</label>
                      <input type="text" name="assignedTutorName" value={formData.assignedTutorName} onChange={handleInputChange} className="input-field" placeholder="Tutor name" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-700">Tutor Hourly Pay ($)</label>
                      <input type="number" name="tutorHourlyPay" value={formData.tutorHourlyPay} onChange={handleInputChange} min="0" step="0.01" className="input-field" placeholder="0.00" />
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="bento-card p-5 md:p-6 lg:col-span-7">
              <SectionHeading icon={Mail} eyebrow="Family" title="Contact Info" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-8">
                  <ArrayInput label="Student Email(s)" field="studentEmails" type="email" placeholder="student@email.com" formData={formData} handleArrayChange={handleArrayChange} removeArrayItem={removeArrayItem} addArrayItem={addArrayItem} />
                  <ArrayInput label="Parent Email(s)" field="parentEmails" type="email" placeholder="parent@email.com" formData={formData} handleArrayChange={handleArrayChange} removeArrayItem={removeArrayItem} addArrayItem={addArrayItem} />
                </div>
                <div>
                  <ArrayInput label="Parent Phone Number(s)" field="parentPhones" type="tel" placeholder="(555) 555-5555" formData={formData} handleArrayChange={handleArrayChange} removeArrayItem={removeArrayItem} addArrayItem={addArrayItem} />
                </div>
              </div>
            </section>

            <section className="bento-card p-5 md:p-6 lg:col-span-5">
              <SectionHeading icon={Edit} eyebrow="Context" title="Notes" />
              <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={8} className="input-field resize-y" placeholder="Add any special instructions or notes here..."></textarea>
            </section>

            <div className="flex flex-wrap gap-3 border-t border-brand-blue/10 pt-5 lg:col-span-12">
              <button type="submit" disabled={saving} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Save Changes
              </button>
              <button type="button" onClick={handleCancelEdit} disabled={saving} className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50">
                <X size={18} /> Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 gap-5 p-4 md:p-6 lg:grid-cols-12">
            {/* Left Column: Academics & Enrollment */}
            <div className="space-y-5 lg:col-span-7">
              <section className="bento-card p-5 md:p-6">
                <SectionHeading icon={BookOpen} eyebrow="Academic" title="Academic Info" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">School</p>
                    <p className="mt-1 font-bold text-slate-800">{student.school || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Grade</p>
                    <p className="mt-1 font-bold text-slate-800">{student.grade || 'Not specified'}</p>
                  </div>
                  {student.studentType === 'center' && (
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Center Class</p>
                      <p className="mt-1 font-bold text-slate-800">{student.centerClass || DEFAULT_CENTER_CLASS}</p>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Subjects</p>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {student.subjects?.length > 0 ? (
                        student.subjects.map((sub, i) => (
                          <span key={i} className="rounded-full border border-brand-blue/10 bg-white/75 px-3 py-1 text-sm font-bold text-slate-700 shadow-sm">{sub}</span>
                        ))
                      ) : (
                        <span className="text-slate-500 italic text-sm">None listed</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="bento-card p-5 md:p-6">
                <SectionHeading icon={Calendar} eyebrow="Program" title="Enrollment Details" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Start Date</p>
                    <p className="mt-1 font-bold text-slate-800">
                      {student.startDate ? new Date(student.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Monthly Tuition</p>
                    <p className="mt-1 flex items-center font-bold text-slate-800">
                      <DollarSign size={16} className="text-slate-400 mr-1" />
                      {student.monthlyTuition || '0'}
                    </p>
                  </div>
                  {student.studentType === 'one-on-one' && (
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Expected Monthly Tutoring Hours</p>
                      <p className="mt-1 font-bold text-slate-800">{student.expectedMonthlyTutoringHours ?? 'Not specified'}</p>
                    </div>
                  )}
                  {student.studentType === 'one-on-one' && (
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Assigned Tutor</p>
                      <p className="mt-1 font-bold text-slate-800">{student.assignedTutorName || 'Not specified'}</p>
                    </div>
                  )}
                  {student.studentType === 'one-on-one' && (
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Tutor Hourly Pay</p>
                      <p className="mt-1 font-bold text-slate-800">
                        {student.tutorHourlyPay ? `$${Number(student.tutorHourlyPay).toFixed(2)}/hr` : 'Not specified'}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column: Contact & Notes */}
            <div className="space-y-5 lg:col-span-5">
              <section className="bento-card p-5 md:p-6">
                <SectionHeading icon={User} eyebrow="Family" title="Contact Information" />
                <div className="space-y-4">
                  
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Student Email(s)</p>
                    {student.studentEmails?.length > 0 ? (
                      <ul className="space-y-1.5">
                        {student.studentEmails.map((email, i) => (
                          <li key={i} className="flex items-center rounded-2xl bg-white/60 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm">
                            <Mail size={14} className="mr-2 text-brand-blue" />
                            <a href={`mailto:${email}`} className="hover:text-brand-blue transition-colors">{email}</a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-400 italic">None provided</p>
                    )}
                  </div>

                  <div className="border-t border-brand-blue/10 pt-4">
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Parent Email(s)</p>
                    {student.parentEmails?.length > 0 ? (
                      <ul className="space-y-1.5">
                        {student.parentEmails.map((email, i) => (
                          <li key={i} className="flex items-center rounded-2xl bg-white/60 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm">
                            <Mail size={14} className="mr-2 text-brand-blue" />
                            <a href={`mailto:${email}`} className="hover:text-brand-blue transition-colors">{email}</a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-400 italic">None provided</p>
                    )}
                  </div>

                  <div className="border-t border-brand-blue/10 pt-4">
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Parent Phone(s)</p>
                    {student.parentPhones?.length > 0 ? (
                      <ul className="space-y-1.5">
                        {student.parentPhones.map((phone, i) => (
                          <li key={i} className="flex items-center rounded-2xl bg-white/60 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm">
                            <Phone size={14} className="mr-2 text-brand-blue" />
                            <a href={`tel:${phone}`} className="hover:text-brand-blue transition-colors">{phone}</a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-400 italic">None provided</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="bento-card p-5 md:p-6">
                <SectionHeading icon={Edit} eyebrow="Context" title="Notes" />
                <div className="min-h-[140px] rounded-3xl border border-brand-yellow/35 bg-brand-yellow/10 p-5">
                  {student.notes ? (
                    <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">{student.notes}</p>
                  ) : (
                    <p className="text-slate-400 italic text-sm">No notes available for this student.</p>
                  )}
                </div>
              </section>

            </div>
          </div>
        )}
      </div>

      {/* Archive Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card w-full max-w-md overflow-hidden rounded-4xl border border-white/70 shadow-podium-glass">
            <div className="flex items-center justify-between border-b border-brand-red/10 bg-brand-red/10 p-6">
              <h3 className="flex items-center gap-2 text-xl font-black text-brand-red">
                <AlertCircle size={20} /> Archive Student
              </h3>
              <button onClick={() => setShowArchiveModal(false)} className="focus-ring rounded-full p-2 text-slate-400 hover:bg-white/70 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleArchive} className="p-6 space-y-4">
              <p className="text-slate-600 text-sm">
                Archiving <strong>{student.firstName} {student.lastName}</strong> will hide them from Attendance and future Tuition runs. Their historical records will remain intact.
              </p>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Reason (Optional)</label>
                <textarea
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder="e.g. Graduated, Moved away..."
                  rows={3}
                  className="input-field resize-none focus:border-brand-red"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowArchiveModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={archiving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-red px-4 py-2.5 font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {archiving ? <Loader2 size={18} className="animate-spin" /> : <Archive size={18} />}
                  Archive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card w-full max-w-md overflow-hidden rounded-4xl border border-white/70 shadow-podium-glass">
            <div className="flex items-center justify-between border-b border-brand-red/20 bg-brand-red p-6">
              <h3 className="flex items-center gap-2 text-xl font-black text-white">
                <AlertCircle size={20} /> Permanent Delete
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="focus-ring rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <p className="text-center text-slate-600">
                Are you sure you want to permanently delete <strong>{student.firstName} {student.lastName}</strong>? This action cannot be undone and all records for this student will be lost.
              </p>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-red px-4 py-2.5 font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Restore Confirmation Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card w-full max-w-md overflow-hidden rounded-4xl border border-white/70 shadow-podium-glass">
            <div className="flex items-center justify-between border-b border-brand-green/10 bg-brand-green/10 p-6">
              <h3 className="flex items-center gap-2 text-xl font-black text-brand-green">
                <CheckCircle size={20} /> Restore Student
              </h3>
              <button onClick={() => setShowRestoreModal(false)} className="focus-ring rounded-full p-2 text-slate-400 hover:bg-white/70 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCcw size={32} />
              </div>
              <p className="text-center text-slate-600">
                Are you sure you want to restore <strong>{student.firstName} {student.lastName}</strong> to active status? They will reappear in Attendance and Tuition lists.
              </p>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRestoreModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestore}
                  disabled={archiving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-green px-4 py-2.5 font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                  {archiving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  Restore
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDetail;
