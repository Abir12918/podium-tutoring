import { useState } from 'react';
import { addStudent } from '../services/studentService';
import { Plus, Trash2, CheckCircle, AlertCircle, Loader2, User, Mail, ClipboardList, NotebookText } from 'lucide-react';

const DEFAULT_CENTER_CLASS = 'Unassigned';

const initialFormState = {
  firstName: '',
  lastName: '',
  school: '',
  grade: '',
  subjects: '',
  studentEmails: [''],
  parentEmails: [''],
  parentPhones: [''],
  startDate: new Date().toISOString().split('T')[0],
  monthlyTuition: '',
  expectedMonthlyTutoringHours: '',
  assignedTutorName: '',
  tutorHourlyPay: '',
  studentType: 'center',
  centerClass: DEFAULT_CENTER_CLASS,
  notes: '',
};

const SectionTitle = ({ icon: Icon, eyebrow, title }) => (
  <div className="mb-5 flex items-center gap-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/10">
      <Icon size={19} strokeWidth={2.3} />
    </div>
    <div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-blue/60">{eyebrow}</p>
      <h3 className="text-lg font-black tracking-tight text-brand-ink">{title}</h3>
    </div>
  </div>
);

const ArrayInput = ({ label, field, type = "text", placeholder, formData, handleArrayChange, removeArrayItem, addArrayItem }) => (
  <div className="space-y-3 rounded-3xl border border-brand-blue/10 bg-white/55 p-4 shadow-sm">
    <label className="block text-sm font-bold text-slate-700">{label}</label>
    {formData[field].map((item, index) => (
      <div key={`${field}-${index}`} className="flex gap-2">
        <input
          type={type}
          value={item}
          onChange={(e) => handleArrayChange(index, field, e.target.value)}
          className="input-field flex-1"
          placeholder={placeholder}
        />
        {formData[field].length > 1 && (
          <button
            type="button"
            onClick={() => removeArrayItem(index, field)}
            className="focus-ring rounded-2xl p-2 text-slate-400 transition-colors hover:bg-brand-red/10 hover:text-brand-red"
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
      <Plus size={16} /> Add Another
    </button>
  </div>
);

const AddStudent = () => {
  const [formData, setFormData] = useState(initialFormState);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'studentType' && value === 'center' && !prev.centerClass ? { centerClass: DEFAULT_CENTER_CLASS } : {}),
    }));
  };

  const handleArrayChange = (index, field, value) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData((prev) => ({ ...prev, [field]: newArray }));
  };

  const addArrayItem = (field) => {
    setFormData((prev) => ({ ...prev, [field]: [...prev[field], ''] }));
  };

  const removeArrayItem = (index, field) => {
    if (formData[field].length > 1) {
      const newArray = [...formData[field]];
      newArray.splice(index, 1);
      setFormData((prev) => ({ ...prev, [field]: newArray }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      // Process form data
      const processedData = {
        ...formData,
        subjects: typeof formData.subjects === 'string' ? formData.subjects.split(',').map(s => s.trim()).filter(Boolean) : [],
        studentEmails: formData.studentEmails.filter(Boolean),
        parentEmails: formData.parentEmails.filter(Boolean),
        parentPhones: formData.parentPhones.filter(Boolean),
        monthlyTuition: Number(formData.monthlyTuition) || 0,
        ...(formData.studentType === 'one-on-one' ? {
          expectedMonthlyTutoringHours: formData.expectedMonthlyTutoringHours === '' ? null : Number(formData.expectedMonthlyTutoringHours) || 0,
          assignedTutorName: formData.assignedTutorName,
          tutorHourlyPay: formData.tutorHourlyPay === '' ? null : Number(formData.tutorHourlyPay) || 0,
        } : {}),
        centerClass: formData.studentType === 'center' ? formData.centerClass || DEFAULT_CENTER_CLASS : undefined,
      };

      if (!processedData.firstName || !processedData.lastName) {
        throw new Error("First and Last name are required.");
      }

      await addStudent(processedData);
      
      setStatus({ type: 'success', message: 'Student added.' });
      setFormData(initialFormState);
    } catch (error) {
      console.error("Form submission error:", error);
      setStatus({ type: 'error', message: error.message || 'Failed to add student. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-12">
      <header className="glass-card relative overflow-hidden rounded-4xl border border-white/70 p-6 shadow-podium-glass md:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue via-brand-yellow to-brand-green" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-blue/10 bg-white/65 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-brand-blue shadow-sm">
            <span className="h-2 w-2 rounded-full bg-brand-yellow shadow-[0_0_0_4px_rgba(254,195,29,0.18)]" />
            Student Intake
          </div>
          <h1 className="text-4xl font-black tracking-tight text-brand-ink">Add New Student</h1>
          <p className="mt-3 text-base font-medium leading-7 text-slate-600">Enter student details, enrollment settings, and family contacts in one polished intake flow.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap lg:justify-end">
            <div className="rounded-3xl border border-brand-blue/10 bg-white/65 px-4 py-3 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Type</p>
              <p className="mt-1 text-sm font-black text-brand-ink">{formData.studentType === 'center' ? 'Center' : 'One-on-One'}</p>
            </div>
            <div className="rounded-3xl border border-brand-blue/10 bg-white/65 px-4 py-3 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Start</p>
              <p className="mt-1 text-sm font-black text-brand-ink">{formData.startDate || 'Pending'}</p>
            </div>
          </div>
        </div>
      </header>

      {status.message && (
        <div className={`flex items-center gap-3 rounded-3xl border p-4 shadow-sm ${status.type === 'success' ? 'border-brand-green/20 bg-brand-green/10 text-brand-green' : 'border-brand-red/20 bg-brand-red/10 text-brand-red'}`}>
          {status.type === 'success' ? <CheckCircle className="text-green-600" /> : <AlertCircle className="text-red-600" />}
          <p className="font-bold">{status.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card rounded-4xl border border-white/70 p-4 shadow-podium-glass md:p-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        
        {/* Personal Info */}
        <section className="bento-card p-5 md:p-6 lg:col-span-7">
          <SectionTitle icon={User} eyebrow="Identity" title="Personal Information" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">First Name *</label>
              <input required name="firstName" value={formData.firstName} onChange={handleChange} type="text" className="input-field" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Last Name *</label>
              <input required name="lastName" value={formData.lastName} onChange={handleChange} type="text" className="input-field" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">School</label>
              <input name="school" value={formData.school} onChange={handleChange} type="text" className="input-field" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Grade</label>
              <input name="grade" value={formData.grade} onChange={handleChange} type="text" className="input-field" />
            </div>
          </div>
        </section>

        {/* Contact Info */}
        <section className="bento-card p-5 md:p-6 lg:col-span-5 lg:row-span-2">
          <SectionTitle icon={Mail} eyebrow="Family" title="Contact Information" />
          <div className="grid grid-cols-1 gap-4">
            <ArrayInput 
              label="Student Email(s)" 
              field="studentEmails" 
              type="email" 
              placeholder="student@example.com"
              formData={formData}
              handleArrayChange={handleArrayChange}
              removeArrayItem={removeArrayItem}
              addArrayItem={addArrayItem}
            />
            <ArrayInput 
              label="Parent Email(s)" 
              field="parentEmails" 
              type="email" 
              placeholder="parent@example.com"
              formData={formData}
              handleArrayChange={handleArrayChange}
              removeArrayItem={removeArrayItem}
              addArrayItem={addArrayItem}
            />
            <ArrayInput 
              label="Parent Phone Number(s)" 
              field="parentPhones" 
              type="tel" 
              placeholder="(555) 555-5555"
              formData={formData}
              handleArrayChange={handleArrayChange}
              removeArrayItem={removeArrayItem}
              addArrayItem={addArrayItem}
            />
          </div>
        </section>

        {/* Enrollment Details */}
        <section className="bento-card p-5 md:p-6 lg:col-span-7">
          <SectionTitle icon={ClipboardList} eyebrow="Program" title="Enrollment Details" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Student Type</label>
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-brand-blue/10 bg-white/65 p-1.5 shadow-sm">
                <label className={`flex cursor-pointer items-center justify-center rounded-xl px-3 py-2.5 text-sm font-black transition-all ${formData.studentType === 'center' ? 'bg-brand-blue text-white shadow-podium-soft' : 'text-slate-500 hover:bg-white hover:text-brand-blue'}`}>
                  <input type="radio" name="studentType" value="center" checked={formData.studentType === 'center'} onChange={handleChange} className="sr-only" />
                  Center
                </label>
                <label className={`flex cursor-pointer items-center justify-center rounded-xl px-3 py-2.5 text-sm font-black transition-all ${formData.studentType === 'one-on-one' ? 'bg-brand-blue text-white shadow-podium-soft' : 'text-slate-500 hover:bg-white hover:text-brand-blue'}`}>
                  <input type="radio" name="studentType" value="one-on-one" checked={formData.studentType === 'one-on-one'} onChange={handleChange} className="sr-only" />
                  One-on-One
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Monthly Tuition ($)</label>
              <input name="monthlyTuition" value={formData.monthlyTuition} onChange={handleChange} type="number" min="0" step="0.01" className="input-field" placeholder="0.00" />
            </div>
            {formData.studentType === 'center' && (
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Center Class</label>
                <select name="centerClass" value={formData.centerClass || DEFAULT_CENTER_CLASS} onChange={handleChange} className="select-field">
                  <option value="Unassigned">Unassigned</option>
                  <option value="Abir">Abir</option>
                  <option value="Rahat">Rahat</option>
                </select>
              </div>
            )}
            {formData.studentType === 'one-on-one' && (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Expected Monthly Tutoring Hours</label>
                  <input name="expectedMonthlyTutoringHours" value={formData.expectedMonthlyTutoringHours} onChange={handleChange} type="number" min="0" step="0.25" className="input-field" placeholder="e.g. 8.5" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Assigned Tutor</label>
                  <input name="assignedTutorName" value={formData.assignedTutorName} onChange={handleChange} type="text" className="input-field" placeholder="Tutor name" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Tutor Hourly Pay ($)</label>
                  <input name="tutorHourlyPay" value={formData.tutorHourlyPay} onChange={handleChange} type="number" min="0" step="0.01" className="input-field" placeholder="0.00" />
                </div>
              </>
            )}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Start Date</label>
              <input name="startDate" value={formData.startDate} onChange={handleChange} type="date" className="input-field" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Subjects (comma-separated)</label>
              <input name="subjects" value={formData.subjects} onChange={handleChange} type="text" className="input-field" placeholder="Math, English" />
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="bento-card p-5 md:p-6 lg:col-span-12">
          <SectionTitle icon={NotebookText} eyebrow="Context" title="Notes" />
          <textarea name="notes" value={formData.notes} onChange={handleChange} rows="4" className="input-field resize-y" placeholder="Any special requirements or notes..."></textarea>
        </section>

        {/* Submit */}
        <div className="flex justify-end pt-2 lg:col-span-12">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : 'Add Student'}
          </button>
        </div>
        </div>

      </form>
    </div>
  );
};

export default AddStudent;
