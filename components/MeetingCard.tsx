import React, { useState } from 'react';
import { Clock, Calendar as CalendarIcon, User, Video, Trash2, Copy, Check, FileText, X, Edit2 } from 'lucide-react';
import { Meeting } from '../types';

interface MeetingCardProps {
  meeting: Meeting;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, onDelete, onEdit }) => {
  const [copied, setCopied] = useState(false);
  const [showAgenda, setShowAgenda] = useState(false);

  const categoryColor = {
    'Board': 'bg-purple-100 text-purple-800 border-purple-200',
    'Training': 'bg-green-100 text-green-800 border-green-200',
    'Social': 'bg-orange-100 text-orange-800 border-orange-200',
    'Project': 'bg-blue-100 text-blue-800 border-blue-200',
  }[meeting.category] || 'bg-gray-100 text-gray-800';

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(meeting.zoomLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col h-full relative group">
        <div className="p-5 flex-grow">
          <div className="flex justify-between items-start mb-3">
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${categoryColor}`}>
              {meeting.category}
            </span>
            <div className="flex items-center space-x-1">
                 {/* Only show edit if provided */}
                {onEdit && (
                    <button 
                    onClick={() => onEdit(meeting.id)} 
                    className="p-1.5 text-gray-400 hover:text-jci-blue hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Meeting"
                    >
                    <Edit2 size={16} />
                    </button>
                )}
                 {/* Only show delete if provided */}
                {onDelete && (
                    <button 
                    onClick={() => onDelete(meeting.id)} 
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Cancel Meeting"
                    >
                    <Trash2 size={16} />
                    </button>
                )}
            </div>
          </div>
          
          <h3 className="text-lg font-bold text-gray-900 mb-1">{meeting.title}</h3>
          
          <div className="relative mb-4 group/desc">
             <p className="text-sm text-gray-500 line-clamp-2 h-10">{meeting.description}</p>
             {meeting.description && meeting.description.length > 80 && (
                 <button 
                   onClick={() => setShowAgenda(true)}
                   className="absolute bottom-0 right-0 bg-white/90 pl-2 text-xs text-jci-blue hover:underline font-medium"
                 >
                   See Agenda
                 </button>
             )}
          </div>
          
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <CalendarIcon size={16} className="text-jci-blue" />
              <span>{meeting.date}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock size={16} className="text-jci-blue" />
              <span>{meeting.startTime} ({meeting.durationMinutes} min)</span>
            </div>
            <div className="flex items-center space-x-2">
              <User size={16} className="text-jci-blue" />
              <span>{meeting.host}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center space-x-2">
          <a 
            href={meeting.zoomLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-grow flex items-center justify-center space-x-2 bg-jci-navy text-white py-2 rounded-lg hover:bg-blue-800 transition-colors font-medium text-sm"
          >
            <Video size={16} />
            <span>Join</span>
          </a>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 p-2 text-gray-500 hover:text-jci-navy hover:bg-blue-50 rounded-lg transition-colors border border-gray-200 bg-white"
            title="Copy Zoom Link"
          >
            {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
          </button>
           <button
            onClick={() => setShowAgenda(true)}
            className="flex-shrink-0 p-2 text-gray-500 hover:text-jci-navy hover:bg-blue-50 rounded-lg transition-colors border border-gray-200 bg-white"
            title="View Agenda"
          >
             <FileText size={18} />
          </button>
        </div>
      </div>

      {/* Agenda Modal */}
      {showAgenda && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAgenda(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                    <FileText size={20} className="text-jci-blue"/>
                    Meeting Agenda
                </h3>
                <button onClick={() => setShowAgenda(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors">
                    <X size={20} />
                </button>
            </div>
            <div className="p-6 overflow-y-auto">
                <h4 className="font-semibold text-xl text-gray-900 mb-1">{meeting.title}</h4>
                <p className="text-sm text-gray-500 mb-4 flex gap-2">
                    <span>{meeting.date}</span> • <span>{meeting.startTime}</span>
                </p>
                <div className="prose prose-sm prose-blue max-w-none bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <pre className="whitespace-pre-wrap font-sans text-gray-700">{meeting.description}</pre>
                </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button 
                    onClick={() => setShowAgenda(false)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                    Close
                </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MeetingCard;