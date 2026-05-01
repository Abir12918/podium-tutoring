import React, { useState } from 'react';
import { addStudent } from '../services/studentService';
import { Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

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
  studentType: 'center',
  notes: '',
};

const ArrayInput = ({ label, field, type = "text", placeholder, formData, handleArrayChange, removeArrayItem, addArrayItem }) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-slate-700">{label}</label>
    {formData[field].map((item, index) => (
      <div key={`${field}-${index}`} className="flex gap-2">
        <input
          type={type}
          value={item}
          onChange={(e) => handleArrayChange(index, field, e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500 outline-none transition-shadow"
          placeholder={placeholder}
        />
        {formData[field].length > 1 && (
          <button
            type="button"
            onClick={() => removeArrayItem(index, field)}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>
    ))}
    <button
      type="button"
      onClick={() => addArrayItem(field)}
      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
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
    setFormData((prev) => ({ ...prev, [name]: value }));
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
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Add New Student</h1>
        <p className="text-slate-500 mt-2">Enter student details to enroll them in Podium.</p>
      </header>

      {status.message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {status.type === 'success' ? <CheckCircle className="text-green-600" /> : <AlertCircle className="text-red-600" />}
          <p className="font-medium">{status.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-8">
        
        {/* Personal Info */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">First Name *</label>
              <input required name="firstName" value={formData.firstName} onChange={handleChange} type="text" className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Last Name *</label>
              <input required name="lastName" value={formData.lastName} onChange={handleChange} type="text" className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">School</label>
              <input name="school" value={formData.school} onChange={handleChange} type="text" className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Grade</label>
              <input name="grade" value={formData.grade} onChange={handleChange} type="text" className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div>

        {/* Enrollment Details */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Enrollment Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Student Type</label>
              <select name="studentType" value={formData.studentType} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500 outline-none bg-white">
                <option value="center">Center</option>
                <option value="one-on-one">One-on-One</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Monthly Tuition ($)</label>
              <input name="monthlyTuition" value={formData.monthlyTuition} onChange={handleChange} type="number" min="0" step="0.01" className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500 outline-none" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Start Date</label>
              <input name="startDate" value={formData.startDate} onChange={handleChange} type="date" className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Subjects (comma-separated)</label>
              <input name="subjects" value={formData.subjects} onChange={handleChange} type="text" className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500 outline-none" placeholder="Math, English" />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Notes</label>
          <textarea name="notes" value={formData.notes} onChange={handleChange} rows="3" className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500 outline-none resize-y" placeholder="Any special requirements or notes..."></textarea>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? 'Saving...' : 'Add Student'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default AddStudent;
