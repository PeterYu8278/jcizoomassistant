import React, { useState, useEffect } from 'react';
import { getTodayInAppTz } from '../utils/timezone';
import { Sparkles, Calendar, Clock, User, Mail, Type, Link as LinkIcon, Loader2, Video } from 'lucide-react';
import { BookingFormData, CATEGORIES, Meeting } from '../types';
import { generateMeetingAgenda } from '../services/geminiService';

interface BookingFormProps {
  onSubmit: (data: BookingFormData) => Promise<void>;
  onCancel: () => void;
  editingMeeting?: Meeting;
  isSubmitting?: boolean;
}

const BookingForm: React.FC<BookingFormProps> = ({ onSubmit, onCancel, editingMeeting, isSubmitting = false }) => {
  const [loadingAI, setLoadingAI] = useState(false);
  const [formData, setFormData] = useState<BookingFormData>({
    title: '',
    description: '',
    host: '',
    email: '',
    date: getTodayInAppTz(),
    startTime: '19:00',
    durationMinutes: 60,
    category: 'Project',
    manualZoomLink: ''
  });

  // Initialize form data when editing
  useEffect(() => {
    if (editingMeeting) {
      setFormData({
        title: editingMeeting.title,
        description: editingMeeting.description,
        host: editingMeeting.host,
        email: editingMeeting.email ?? '',
        date: editingMeeting.date,
        startTime: editingMeeting.startTime,
        durationMinutes: editingMeeting.durationMinutes,
        category: editingMeeting.category,
        manualZoomLink: editingMeeting.zoomLink
      });
    }
  }, [editingMeeting]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerateAgenda = async () => {
    if (!formData.title) {
      alert("Please enter a meeting topic/title first.");
      return;
    }
    setLoadingAI(true);
    const agenda = await generateMeetingAgenda(formData.title, formData.category, formData.durationMinutes);
    setFormData(prev => ({ ...prev, description: agenda }));
    setLoadingAI(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl max-w-3xl mx-auto overflow-hidden">
      <div className="bg-jci-navy p-6 text-white">
        <h2 className="text-2xl font-bold flex items-center space-x-2">
          <Calendar className="h-6 w-6" />
          <span>{editingMeeting ? 'Edit Meeting' : 'Book New Meeting'}</span>
        </h2>
        <p className="text-blue-200 mt-1">
          {editingMeeting ? 'Update your meeting details below.' : 'Schedule a Zoom session for your team.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        
        {/* Row 1: Title & Category */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Topic</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Type className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-jci-blue focus:border-jci-blue sm:text-sm border p-2"
                placeholder="e.g. Q2 Charity Run Planning"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-jci-blue focus:border-jci-blue sm:text-sm border p-2"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* AI Description Section */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">Description / Agenda</label>
            <button
              type="button"
              onClick={handleGenerateAgenda}
              disabled={loadingAI}
              className="text-xs flex items-center space-x-1 text-jci-blue hover:text-jci-navy font-medium disabled:opacity-50"
            >
              <Sparkles size={14} />
              <span>{loadingAI ? 'Generating...' : 'Auto-Generate with AI'}</span>
            </button>
          </div>
          <div className="relative">
             {loadingAI && (
                <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-sm rounded-md">
                    <Loader2 className="animate-spin text-jci-blue" size={32} />
                </div>
             )}
            <textarea
              name="description"
              rows={6}
              value={formData.description}
              onChange={handleChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-jci-blue focus:border-jci-blue sm:text-sm border p-2 font-mono text-sm"
              placeholder="Enter details or let AI write the agenda for you..."
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Powered by Gemini 3 Flash. Provide a topic above to generate.</p>
        </div>

        {/* Row 2: Date, Time, Duration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                name="date"
                required
                value={formData.date}
                onChange={handleChange}
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-jci-blue focus:border-jci-blue sm:text-sm border p-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Clock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="time"
                name="startTime"
                required
                value={formData.startTime}
                onChange={handleChange}
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-jci-blue focus:border-jci-blue sm:text-sm border p-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
            <select
              name="durationMinutes"
              value={formData.durationMinutes}
              // @ts-ignore - straightforward casting for select
              onChange={(e) => setFormData(p => ({...p, durationMinutes: parseInt(e.target.value)}))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-jci-blue focus:border-jci-blue sm:text-sm border p-2"
            >
              <option value={30}>30 Minutes</option>
              <option value={45}>45 Minutes</option>
              <option value={60}>1 Hour</option>
              <option value={90}>1.5 Hours</option>
              <option value={120}>2 Hours</option>
              <option value={180}>3 Hours</option>
            </select>
          </div>
        </div>

        {/* Row 3: Host, Email & Zoom Link */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Host Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="host"
                  required
                  value={formData.host}
                  onChange={handleChange}
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-jci-blue focus:border-jci-blue sm:text-sm border p-2"
                  placeholder="e.g. John Doe, VP International"
                />
              </div>
          </div>
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-jci-blue focus:border-jci-blue sm:text-sm border p-2"
                  placeholder="e.g. host@example.com"
                />
              </div>
          </div>
           <div className="md:col-span-1">
             <label className="block text-sm font-medium text-gray-700 mb-1">
                 Zoom Link <span className="text-gray-400 font-normal">(read-only)</span>
             </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Video className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="url"
                  name="manualZoomLink"
                  value={formData.manualZoomLink || ''}
                  readOnly
                  className="pl-10 block w-full rounded-md border-gray-200 bg-gray-50 text-gray-600 sm:text-sm border p-2 cursor-not-allowed"
                  placeholder={editingMeeting ? '' : 'Will be generated by Zoom after creation'}
                />
              </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-gradient-to-r from-jci-navy to-jci-blue text-white rounded-lg hover:shadow-lg transition-all font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>{editingMeeting ? 'Updating...' : 'Creating Meeting...'}</span>
              </>
            ) : (
              <>
                <LinkIcon size={18} />
                <span>
                  {editingMeeting ? 'Update Meeting' : 'Create Zoom Meeting'}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingForm;