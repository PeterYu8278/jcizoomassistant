import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Meeting } from '../types';
import MeetingCard from './MeetingCard';

interface CalendarViewProps {
  meetings: Meeting[];
  onDelete: (id: string) => void;
  onEdit?: (id: string) => void;
}

// Configuration for the calendar grid - full 24 hours
const START_HOUR = 0;
const END_HOUR = 24;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => i);
const CELL_HEIGHT = 48; // Pixels per hour (24h × 48px = 1152px scrollable)

const CalendarView: React.FC<CalendarViewProps> = ({ meetings, onDelete, onEdit }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  // Helper to get start of week (Monday)
  const getStartOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(date.setDate(diff));
  };

  const startOfWeek = getStartOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Navigation handlers
  const nextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const prevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };
  
  const goToToday = () => setCurrentDate(new Date());

  // Positioning logic for meeting blocks
  const getMeetingStyle = (meeting: Meeting) => {
    const [hours, minutes] = meeting.startTime.split(':').map(Number);
    // Calculate position relative to the grid start time
    const top = ((hours - START_HOUR) * CELL_HEIGHT) + ((minutes / 60) * CELL_HEIGHT);
    const height = (meeting.durationMinutes / 60) * CELL_HEIGHT;
    
    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Board': return 'bg-purple-100 text-purple-900 border-l-4 border-purple-500 hover:bg-purple-200';
      case 'Training': return 'bg-green-100 text-green-900 border-l-4 border-green-500 hover:bg-green-200';
      case 'Social': return 'bg-orange-100 text-orange-900 border-l-4 border-orange-500 hover:bg-orange-200';
      default: return 'bg-blue-100 text-blue-900 border-l-4 border-blue-500 hover:bg-blue-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col min-h-[600px] max-h-[900px] overflow-hidden">
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-4">
             <h2 className="text-xl font-bold text-gray-800">
                {startOfWeek.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <button onClick={prevWeek} className="p-1.5 hover:bg-white rounded shadow-sm transition-all text-gray-600"><ChevronLeft size={18} /></button>
                <button onClick={goToToday} className="px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-white rounded shadow-sm transition-all">Today</button>
                <button onClick={nextWeek} className="p-1.5 hover:bg-white rounded shadow-sm transition-all text-gray-600"><ChevronRight size={18} /></button>
            </div>
        </div>
        <div className="text-sm text-gray-500 hidden sm:block">
            {meetings.length} meeting{meetings.length !== 1 ? 's' : ''} total
        </div>
      </div>

      <div className="flex-grow overflow-y-auto overflow-x-auto flex relative">
          {/* Time Sidebar */}
          <div className="w-16 flex-none border-r border-gray-100 bg-gray-50 pt-10 sticky left-0 z-20">
              {HOURS.map(hour => (
                  <div key={hour} className="text-right pr-2 text-xs text-gray-400 font-medium relative" style={{ height: CELL_HEIGHT }}>
                       <span className="-top-2 relative">{hour}:00</span>
                  </div>
              ))}
          </div>

          {/* Grid */}
          <div className="flex-grow grid grid-cols-7 divide-x divide-gray-100 min-w-[800px]">
              {weekDays.map((day) => {
                  const dateKey = day.toISOString().split('T')[0];
                  // Filter meetings for this specific day
                  const dayMeetings = meetings.filter(m => m.date === dateKey);
                  const isToday = new Date().toISOString().split('T')[0] === dateKey;

                  return (
                      <div key={dateKey} className="relative bg-white group">
                          {/* Day Column Header */}
                          <div className={`text-center py-3 border-b border-gray-100 sticky top-0 z-10 ${isToday ? 'bg-blue-50/90 backdrop-blur' : 'bg-white/95 backdrop-blur'}`}>
                              <div className={`text-xs font-bold tracking-wider mb-1 ${isToday ? 'text-jci-blue' : 'text-gray-400'}`}>
                                  {day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                              </div>
                              <div className={`text-xl font-bold w-9 h-9 rounded-full flex items-center justify-center mx-auto transition-colors ${isToday ? 'bg-jci-blue text-white shadow-md' : 'text-gray-700 group-hover:bg-gray-100'}`}>
                                  {day.getDate()}
                              </div>
                          </div>

                          {/* Grid Lines & Events Container */}
                          <div className="relative">
                            {/* Horizontal grid lines for hours */}
                            {HOURS.map(hour => (
                                <div key={hour} className="border-b border-gray-50" style={{ height: CELL_HEIGHT }}></div>
                            ))}

                            {/* Current Time Indicator (only for Today) */}
                            {isToday && (
                                <div 
                                    className="absolute w-full border-t-2 border-red-400 z-0 pointer-events-none"
                                    style={{ 
                                        top: `${((new Date().getHours() - START_HOUR) * CELL_HEIGHT) + ((new Date().getMinutes() / 60) * CELL_HEIGHT)}px` 
                                    }}
                                >
                                    <div className="w-2 h-2 bg-red-400 rounded-full -mt-[5px] -ml-1"></div>
                                </div>
                            )}

                            {/* Render Meeting Blocks */}
                            {dayMeetings.map(meeting => (
                                <div
                                    key={meeting.id}
                                    onClick={() => setSelectedMeeting(meeting)}
                                    className={`absolute left-1 right-1 rounded-md px-2 py-1.5 text-xs cursor-pointer shadow-sm border overflow-hidden z-1 transition-all ${getCategoryColor(meeting.category)}`}
                                    style={getMeetingStyle(meeting)}
                                    title={`${meeting.title} (${meeting.startTime})`}
                                >
                                    <div className="font-bold truncate leading-tight">{meeting.title}</div>
                                    <div className="opacity-80 mt-0.5 font-medium flex items-center gap-1">
                                        <span>{meeting.startTime}</span>
                                        <span>•</span>
                                        <span>{meeting.durationMinutes}m</span>
                                    </div>
                                </div>
                            ))}
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>

      {/* Detail Modal */}
      {selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedMeeting(null)}>
            <div className="w-full max-w-md animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="relative">
                     <button 
                        onClick={() => setSelectedMeeting(null)}
                        className="absolute -top-3 -right-3 bg-white text-gray-500 rounded-full p-1.5 shadow-lg hover:bg-gray-100 hover:text-red-500 z-10 transition-colors"
                    >
                        <X size={20} />
                     </button>
                    <MeetingCard 
                      meeting={selectedMeeting} 
                      onDelete={(id) => { onDelete(id); setSelectedMeeting(null); }}
                      onEdit={onEdit ? (id) => { onEdit(id); setSelectedMeeting(null); } : undefined}
                    />
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;