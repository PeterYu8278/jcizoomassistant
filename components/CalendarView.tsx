import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Meeting } from '../types';
import { APP_TIMEZONE, getTodayInAppTz, nowInAppTz } from '../utils/timezone';
import MeetingCard from './MeetingCard';

type CalendarMode = 'week' | 'month';

interface CalendarViewProps {
  meetings: Meeting[];
  onDelete: (id: string) => void;
  onEdit?: (id: string) => void;
}

const START_HOUR = 8;   // 早上8点
const END_HOUR = 24;    // 晚上12点 (midnight)
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);
const CELL_HEIGHT = 44; // Compact for mobile, works on desktop

const CalendarView: React.FC<CalendarViewProps> = ({ meetings, onDelete, onEdit }) => {
  const [mode, setMode] = useState<CalendarMode>('week');
  const [currentDate, setCurrentDate] = useState(() => new Date(getTodayInAppTz() + 'T12:00:00+08:00'));
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

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

  const getStartOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const startOfMonth = getStartOfMonth(currentDate);
  const monthDays = (() => {
    const start = new Date(startOfMonth);
    const dayOfWeek = start.getDay();
    const padStart = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const gridStart = new Date(start);
    gridStart.setDate(gridStart.getDate() - padStart);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  })();

  const navigate = (delta: number) => {
    const d = new Date(currentDate);
    if (mode === 'week') d.setDate(d.getDate() + delta * 7);
    else d.setMonth(d.getMonth() + delta);
    setCurrentDate(d);
  };

  const goToToday = () => setCurrentDate(new Date(getTodayInAppTz() + 'T12:00:00+08:00'));

  const toLocalDateKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE });

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col min-h-[400px] sm:min-h-[600px] max-h-[85vh] sm:max-h-[900px] overflow-hidden">
      {/* Header Controls - mobile compact */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-3 sm:p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h2 className="text-base sm:text-xl font-bold text-gray-800">
            {startOfMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </h2>
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => navigate(-1)} className="p-2.5 sm:p-1.5 hover:bg-white rounded-md transition-all text-gray-600 touch-manipulation" aria-label="Previous"><ChevronLeft size={20} /></button>
            <button onClick={goToToday} className="px-3 py-2 sm:py-1 text-sm font-semibold text-gray-700 hover:bg-white rounded-md transition-all touch-manipulation">Today</button>
            <button onClick={() => navigate(1)} className="p-2.5 sm:p-1.5 hover:bg-white rounded-md transition-all text-gray-600 touch-manipulation" aria-label="Next"><ChevronRight size={20} /></button>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(['week', 'month'] as CalendarMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`min-w-[64px] py-2 sm:py-1.5 px-3 text-sm font-medium rounded-md capitalize transition-all touch-manipulation ${mode === m ? 'bg-white shadow text-jci-navy' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {m}
              </button>
            ))}
          </div>
          <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">
            {meetings.length} meeting{meetings.length !== 1 ? 's' : ''} total
          </span>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto overflow-x-auto flex relative overscroll-contain" >
        {/* Week view: time-based grid */}
        {mode === 'week' && (
          <>
            <div className="w-12 sm:w-16 flex-none border-r border-gray-100 bg-gray-50 pt-8 sm:pt-10 sticky left-0 z-20">
              {HOURS.map(hour => (
                <div key={hour} className="text-right pr-2 text-xs text-gray-400 font-medium relative" style={{ height: CELL_HEIGHT }}>
                  <span className="-top-2 relative">{hour}:00</span>
                </div>
              ))}
            </div>
            <div className="flex-grow grid grid-cols-7 divide-x divide-gray-100 min-w-[560px] sm:min-w-[700px]">
              {weekDays.map((day) => {
                const dateKey = toLocalDateKey(day);
                const dayMeetings = meetings.filter(m => m.date === dateKey);
                const isToday = getTodayInAppTz() === dateKey;
                return (
                  <div key={dateKey} className="relative bg-white group">
                    <div className={`text-center py-2 sm:py-3 border-b border-gray-100 sticky top-0 z-10 ${isToday ? 'bg-blue-50/90 backdrop-blur' : 'bg-white/95 backdrop-blur'}`}>
                      <div className={`text-[10px] sm:text-xs font-bold tracking-wider mb-0.5 sm:mb-1 ${isToday ? 'text-jci-blue' : 'text-gray-400'}`}>
                        {day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase().slice(0, 2)}
                      </div>
                      <div className={`text-base sm:text-xl font-bold w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center mx-auto transition-colors ${isToday ? 'bg-jci-blue text-white shadow-md' : 'text-gray-700 group-hover:bg-gray-100'}`}>
                        {day.getDate()}
                      </div>
                    </div>
                    <div className="relative">
                      {HOURS.map(hour => (
                        <div key={hour} className="border-b border-gray-50" style={{ height: CELL_HEIGHT }}></div>
                      ))}
                      {isToday && (() => {
                        const { hours, minutes } = nowInAppTz();
                        return (
                          <div
                            className="absolute w-full border-t-2 border-red-400 z-0 pointer-events-none"
                            style={{ top: `${((hours - START_HOUR) * CELL_HEIGHT) + ((minutes / 60) * CELL_HEIGHT)}px` }}
                          >
                            <div className="w-2 h-2 bg-red-400 rounded-full -mt-[5px] -ml-1"></div>
                          </div>
                        );
                      })()}
                      {dayMeetings.map(meeting => (
                        <div
                          key={meeting.id}
                          onClick={() => setSelectedMeeting(meeting)}
                          className={`absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded-md px-1.5 sm:px-2 py-1.5 text-[10px] sm:text-xs cursor-pointer shadow-sm border overflow-hidden z-1 transition-all min-h-[36px] active:scale-[0.98] ${getCategoryColor(meeting.category)}`}
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
          </>
        )}

        {/* Month view */}
        {mode === 'month' && (
          <div className="flex-grow flex flex-col min-w-[320px] sm:min-w-[500px]">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <div key={i} className="text-center py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-gray-500 uppercase">{d}</div>
              ))}
            </div>
            {/* Date grid */}
            <div className="flex-grow grid grid-cols-7 auto-rows-fr min-h-[300px] sm:min-h-[400px]">
              {monthDays.map((day) => {
                const dateKey = toLocalDateKey(day);
                const dayMeetings = meetings.filter(m => m.date === dateKey);
                const isToday = getTodayInAppTz() === dateKey;
                const isCurrentMonth = day.getMonth() === startOfMonth.getMonth();
                return (
                  <div
                    key={dateKey}
                    className={`border-b border-r border-gray-100 p-1 sm:p-2 overflow-hidden ${!isCurrentMonth ? 'bg-gray-50' : 'bg-white'} min-h-[60px] sm:min-h-[80px]`}
                  >
                    <div className={`text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1 ${isToday ? 'w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-jci-blue text-white flex items-center justify-center' : 'text-gray-700'} ${!isCurrentMonth ? 'text-gray-400' : ''}`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-0.5 sm:space-y-1 overflow-y-auto max-h-[80px] sm:max-h-[120px]">
                      {dayMeetings.slice(0, 3).map(meeting => (
                        <div
                          key={meeting.id}
                          onClick={() => setSelectedMeeting(meeting)}
                          className={`text-[10px] sm:text-xs px-1 sm:px-1.5 py-1 sm:py-0.5 rounded cursor-pointer truncate min-h-[28px] flex items-center active:scale-[0.98] ${getCategoryColor(meeting.category)}`}
                          title={`${meeting.title} ${meeting.startTime}`}
                        >
                          {meeting.startTime} {meeting.title}
                        </div>
                      ))}
                      {dayMeetings.length > 3 && (
                        <div className="text-xs text-gray-500 pl-1">+{dayMeetings.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
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