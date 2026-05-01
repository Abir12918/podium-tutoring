import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStudentById, updateStudent } from '../services/studentService';
import { ArrowLeft, Mail, Phone, BookOpen, Calendar, DollarSign, Loader2, User, Edit, Save, X, Trash2, Plus, CheckCircle, AlertCircle, Archive, RefreshCcw } from 'lucide-react';

const ArrayInput = ({ label, field, type = "text", placeholder, formData, handleArrayChange, removeArrayItem, addArrayItem }) => (
  <div className="space-y-3">
    <label className="block text-sm font-semibold text-slate-700">{label}</label>
    {formData[field].map((item, index) => (
      <div key={index} className="flex gap-2 items-start">
        <input
          type={type}
          value={item}
          onChange={(e) => handleArrayChange(field, index, e.target.value)}
          placeholder={placeholder}
          className="flex-1 w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all"
        />
        {formData[field].length > 1 && (
          <button
            type="button"
            onClick={() => removeArrayItem(field, index)}
            className="p-2.5 text-slate-400 hover:text-brand-red hover:bg-red-50 rounded-xl transition-colors shrink-0"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>
    ))}
    <button
      type="button"
      onClick={() => addArrayItem(field)}
      className="inline-flex items-center text-sm font-medium text-brand-blue hover:text-blue-700 transition-colors"
    >
      <Plus size={16} className="mr-1" /> Add another
    </button>
  </div>
);

const StudentDetail = () => {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Archive state
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [archiving, setArchiving] = useState(false);

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
    setFormData(prev => ({ ...prev, [name]: value }));
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
      setStatus({ type: 'success', message: 'Student restored to active status.' });
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    } catch (error) {
      console.error("Restore error:", error);
      setStatus({ type: 'error', message: 'Failed to restore student.' });
    } finally {
      setArchiving(false);
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
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link to="/students" className="inline-flex items-center text-slate-500 hover:text-brand-blue transition-colors font-medium group">
          <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Students
        </Link>
        
        {status.message && !isEditing && (
          <div className={`px-4 py-2 rounded-lg flex items-center font-medium ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {status.type === 'success' ? <CheckCircle size={18} className="mr-2" /> : <AlertCircle size={18} className="mr-2" />}
            {status.message}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-brand-blue text-white rounded-2xl flex items-center justify-center text-3xl font-bold shadow-sm">
              {student.firstName.charAt(0)}{student.lastName.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                {student.firstName} {student.lastName}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${student.studentType === 'center' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}>
                  {student.studentType === 'center' ? 'Center' : 'One-on-One'}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${student.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}`}>
                  {student.status || 'Active'}
                </span>
              </div>
            </div>
          </div>
          
          {!isEditing && (
            <div className="flex items-center gap-3">
              {student.status === 'inactive' ? (
                <button
                  onClick={handleRestore}
                  disabled={archiving}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 hover:text-brand-green transition-colors flex items-center gap-2 shadow-sm"
                >
                  <RefreshCcw size={18} /> Restore Student
                </button>
              ) : (
                <button
                  onClick={() => setShowArchiveModal(true)}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-red-50 hover:text-brand-red hover:border-red-200 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Archive size={18} /> Archive Student
                </button>
              )}
              <button
                onClick={handleEditClick}
                className="px-5 py-2.5 bg-brand-blue text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Edit size={18} /> Edit Profile
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {isEditing ? (
          <form onSubmit={handleSave} className="p-8 space-y-10">
            {status.message && status.type === 'error' && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 font-medium flex items-center">
                <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
                {status.message}
              </div>
            )}
            
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-2">
                <User size={24} className="text-brand-blue" /> Personal Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">First Name *</label>
                  <input required type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Last Name *</label>
                  <input required type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Student Type</label>
                  <div className="flex gap-4 p-1 bg-slate-50 border border-slate-200 rounded-xl">
                    <label className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg cursor-pointer transition-colors ${formData.studentType === 'center' ? 'bg-white shadow-sm text-brand-blue font-semibold border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                      <input type="radio" name="studentType" value="center" checked={formData.studentType === 'center'} onChange={handleInputChange} className="hidden" /> Center
                    </label>
                    <label className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg cursor-pointer transition-colors ${formData.studentType === 'one-on-one' ? 'bg-white shadow-sm text-brand-blue font-semibold border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                      <input type="radio" name="studentType" value="one-on-one" checked={formData.studentType === 'one-on-one'} onChange={handleInputChange} className="hidden" /> One-on-One
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-2">
                <BookOpen size={24} className="text-brand-blue" /> Academics & Enrollment
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">School</label>
                  <input type="text" name="school" value={formData.school} onChange={handleInputChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Grade</label>
                  <input type="text" name="grade" value={formData.grade} onChange={handleInputChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700">Subjects <span className="text-slate-400 font-normal">(Comma separated)</span></label>
                  <input type="text" name="subjects" value={formData.subjects} onChange={handleInputChange} placeholder="e.g. Math, English, SAT" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Start Date</label>
                  <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Monthly Tuition ($)</label>
                  <div className="relative">
                    <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="number" name="monthlyTuition" value={formData.monthlyTuition} onChange={handleInputChange} min="0" step="0.01" className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Changes apply only to newly generated tuition records.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Mail size={24} className="text-brand-blue" /> Contact Info
              </h2>
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

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-2">Notes</h2>
              <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={4} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none resize-y" placeholder="Add any special instructions or notes here..."></textarea>
            </section>

            <div className="flex gap-4 pt-4 border-t border-slate-100">
              <button type="submit" disabled={saving} className="px-6 py-2.5 bg-brand-blue text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Save Changes
              </button>
              <button type="button" onClick={handleCancelEdit} disabled={saving} className="px-6 py-2.5 bg-white text-slate-600 border border-slate-200 font-medium rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-colors flex items-center gap-2">
                <X size={18} /> Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Left Column: Academics & Enrollment */}
            <div className="space-y-8">
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <BookOpen size={20} className="text-brand-blue" /> Academic Info
                </h3>
                <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-sm text-slate-500 font-medium">School</p>
                    <p className="text-slate-800 font-medium mt-0.5">{student.school || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Grade</p>
                    <p className="text-slate-800 font-medium mt-0.5">{student.grade || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Subjects</p>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {student.subjects?.length > 0 ? (
                        student.subjects.map((sub, i) => (
                          <span key={i} className="bg-white border border-slate-200 px-2.5 py-1 rounded-md text-sm text-slate-700 shadow-sm">{sub}</span>
                        ))
                      ) : (
                        <span className="text-slate-500 italic text-sm">None listed</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Calendar size={20} className="text-brand-blue" /> Enrollment Details
                </h3>
                <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Start Date</p>
                    <p className="text-slate-800 font-medium mt-0.5">
                      {student.startDate ? new Date(student.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Monthly Tuition</p>
                    <p className="text-slate-800 font-medium mt-0.5 flex items-center">
                      <DollarSign size={16} className="text-slate-400 mr-1" />
                      {student.monthlyTuition || '0'}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Contact & Notes */}
            <div className="space-y-8">
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <User size={20} className="text-brand-blue" /> Contact Information
                </h3>
                <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
                  
                  <div>
                    <p className="text-sm text-slate-500 font-medium mb-1.5">Student Email(s)</p>
                    {student.studentEmails?.length > 0 ? (
                      <ul className="space-y-1.5">
                        {student.studentEmails.map((email, i) => (
                          <li key={i} className="flex items-center text-slate-800 text-sm">
                            <Mail size={14} className="mr-2 text-brand-blue" />
                            <a href={`mailto:${email}`} className="hover:text-brand-blue transition-colors">{email}</a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-400 italic">None provided</p>
                    )}
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-sm text-slate-500 font-medium mb-1.5">Parent Email(s)</p>
                    {student.parentEmails?.length > 0 ? (
                      <ul className="space-y-1.5">
                        {student.parentEmails.map((email, i) => (
                          <li key={i} className="flex items-center text-slate-800 text-sm">
                            <Mail size={14} className="mr-2 text-brand-blue" />
                            <a href={`mailto:${email}`} className="hover:text-brand-blue transition-colors">{email}</a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-400 italic">None provided</p>
                    )}
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-sm text-slate-500 font-medium mb-1.5">Parent Phone(s)</p>
                    {student.parentPhones?.length > 0 ? (
                      <ul className="space-y-1.5">
                        {student.parentPhones.map((phone, i) => (
                          <li key={i} className="flex items-center text-slate-800 text-sm">
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

              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Notes</h3>
                <div className="bg-yellow-50 p-5 rounded-xl border border-yellow-100 min-h-[120px]">
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50/50">
              <h3 className="text-xl font-bold text-red-700 flex items-center gap-2">
                <AlertCircle size={20} /> Archive Student
              </h3>
              <button onClick={() => setShowArchiveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleArchive} className="p-6 space-y-4">
              <p className="text-slate-600 text-sm">
                Archiving <strong>{student.firstName} {student.lastName}</strong> will hide them from Attendance and future Tuition runs. Their historical records will remain intact.
              </p>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Reason (Optional)</label>
                <textarea
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder="e.g. Graduated, Moved away..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowArchiveModal(false)}
                  className="flex-1 px-4 py-2 bg-white text-slate-700 border border-slate-200 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={archiving}
                  className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {archiving ? <Loader2 size={18} className="animate-spin" /> : <Archive size={18} />}
                  Archive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDetail;
