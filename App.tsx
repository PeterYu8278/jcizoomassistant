import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import CalendarView from './components/CalendarView';
import ListView from './components/ListView';
import BookingForm from './components/BookingForm';
import MeetingCard from './components/MeetingCard';
import { ViewState, Meeting, BookingFormData } from './types';
import { loadMeetings, saveMeeting, updateMeeting, deleteMeeting, syncMeetingsFromZoom } from './services/storageService';
import { createZoomMeeting, updateZoomMeeting, deleteZoomMeeting as deleteZoomMeetingAPI } from './services/zoomService';
import { Users, Video, CalendarCheck, RefreshCw, Calendar, List } from 'lucide-react';

// A visual separator / banner
const HeroBanner = () => (
  <div className="bg-jci-navy text-white py-12 mb-8">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-2">Welcome, JCI Member</h1>
      <p className="text-blue-200">Manage your organization's digital presence efficiently.</p>
    </div>
  </div>
);

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [scheduleView, setScheduleView] = useState<'calendar' | 'list'>('calendar');

  const refreshMeetings = async () => {
    const m = await loadMeetings();
    setMeetings(m);
  };

  useEffect(() => {
    refreshMeetings();
    syncMeetingsFromZoom().then(setMeetings).catch(() => {});
  }, []);

  const handleSyncFromZoom = async () => {
    setIsSyncing(true);
    try {
      const synced = await syncMeetingsFromZoom();
      setMeetings(synced);
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!isCreatingMeeting) refreshMeetings();
  }, [isCreatingMeeting]);

  const handleBookingSubmit = async (data: BookingFormData) => {
    setIsCreatingMeeting(true);
    
    try {
      if (editingMeetingId) {
        // Update existing meeting
        const existingMeeting = meetings.find(m => m.id === editingMeetingId);
        let finalZoomLink = data.manualZoomLink;
        
        // If no manual link is provided, try to update via Zoom API
        if (!finalZoomLink || finalZoomLink.trim() === '') {
          // Check if meeting has a Zoom meeting ID stored
          const zoomMeetingId = (existingMeeting as any)?.zoomMeetingId;
          
          if (zoomMeetingId) {
            try {
              // Update Zoom meeting via API
              const zoomData = await updateZoomMeeting(
                zoomMeetingId,
                data.title,
                `${data.date}T${data.startTime}`,
                data.durationMinutes,
                data.description
              );
              finalZoomLink = zoomData.joinUrl;
            } catch (error) {
              console.error('Failed to update Zoom meeting:', error);
              // Keep existing link if update fails
              finalZoomLink = existingMeeting?.zoomLink || '';
            }
          } else {
            // Keep existing link if no Zoom meeting ID
            finalZoomLink = existingMeeting?.zoomLink || '';
          }
        }
        
        const updatedMeeting: Meeting = {
          id: editingMeetingId,
          ...data,
          zoomLink: finalZoomLink
        };
        await updateMeeting(editingMeetingId, updatedMeeting);
        setEditingMeetingId(null);
      } else {
        // Create new meeting
        let finalZoomLink = data.manualZoomLink;
        let zoomMeetingId: string | undefined;
        
        // If no manual link is provided, create via Zoom API
        if (!finalZoomLink || finalZoomLink.trim() === '') {
          try {
            const zoomData = await createZoomMeeting(
              data.title,
              `${data.date}T${data.startTime}`,
              data.durationMinutes,
              data.description
            );
            finalZoomLink = zoomData.joinUrl;
            zoomMeetingId = zoomData.meetingId;
          } catch (error) {
            console.error('Failed to create Zoom meeting:', error);
            throw error;
          }
        }

        const newMeeting: Meeting & { zoomMeetingId?: string } = {
          id: Date.now().toString(),
          ...data,
          zoomLink: finalZoomLink,
          zoomMeetingId
        };
        await saveMeeting(newMeeting);
      }

      await refreshMeetings();
      setView(ViewState.SCHEDULE); // Redirect to schedule
    } catch (error) {
      console.error('Error creating/updating meeting:', error);
      alert('Failed to create/update meeting. Please try again.');
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  const handleEdit = (id: string) => {
    setEditingMeetingId(id);
    setView(ViewState.BOOKING);
  };

  const handleDelete = async (id: string) => {
      if(window.confirm("Are you sure you want to cancel this meeting?")) {
          const meeting = meetings.find(m => m.id === id);
          
          // Delete from Zoom if meeting has a Zoom meeting ID
          if (meeting && (meeting as any)?.zoomMeetingId) {
              try {
                  await deleteZoomMeetingAPI((meeting as any).zoomMeetingId);
              } catch (error) {
                  console.error('Failed to delete Zoom meeting:', error);
                  // Continue with local deletion even if Zoom deletion fails
              }
          }
          
          await deleteMeeting(id);
          await refreshMeetings();
      }
  }

  // Dashboard Stats
  const totalMeetings = meetings.length;
  const upcomingToday = meetings.filter(m => m.date === new Date().toISOString().split('T')[0]).length;
  
  // Get all upcoming meetings (sorted by date/time)
  const upcomingMeetings = meetings
    .filter(m => new Date(m.date + 'T' + m.startTime) >= new Date())
    .sort((a, b) => new Date(a.date + 'T' + a.startTime).getTime() - new Date(b.date + 'T' + b.startTime).getTime());

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-800 bg-gray-50">
      <Header currentView={view} onChangeView={setView} />

      <main className="flex-grow pb-12">
        {view === ViewState.DASHBOARD && (
          <>
            <HeroBanner />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4 border-l-4 border-jci-blue">
                  <div className="p-3 bg-blue-50 rounded-full text-jci-blue">
                    <CalendarCheck size={24} />
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Total Scheduled</p>
                    <p className="text-2xl font-bold">{totalMeetings}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4 border-l-4 border-jci-teal">
                  <div className="p-3 bg-teal-50 rounded-full text-jci-teal">
                    <Video size={24} />
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Today's Sessions</p>
                    <p className="text-2xl font-bold">{upcomingToday}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4 border-l-4 border-purple-500">
                  <div className="p-3 bg-purple-50 rounded-full text-purple-600">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Active Members</p>
                    <p className="text-2xl font-bold">—</p>
                  </div>
                </div>
              </div>

              {/* Next Up Section - all upcoming meetings */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Next Up</h2>
                  <button onClick={() => setView(ViewState.SCHEDULE)} className="text-jci-blue hover:underline text-sm font-medium">View Full Schedule &rarr;</button>
                </div>
                {upcomingMeetings.length > 0 ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {upcomingMeetings.map((meeting) => (
                          <MeetingCard key={meeting.id} meeting={meeting} onEdit={handleEdit} onDelete={handleDelete} />
                        ))}
                   </div>
                ) : (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center text-gray-500">
                        No upcoming meetings found.
                    </div>
                )}
              </div>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-gradient-to-br from-jci-navy to-blue-900 rounded-xl p-6 text-white flex flex-col justify-between">
                    <div>
                        <h3 className="text-xl font-bold mb-2">Need to schedule?</h3>
                        <p className="text-blue-100 mb-6">Book a new Zoom meeting room instantly. Use our AI assistant to draft your agenda.</p>
                    </div>
                    <button onClick={() => setView(ViewState.BOOKING)} className="bg-white text-jci-navy px-4 py-2 rounded-lg font-bold w-max hover:bg-gray-100 transition-colors">
                        Book Now
                    </button>
                 </div>
                 <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Recent Updates</h3>
                    <p className="text-sm text-gray-500">No updates at this time.</p>
                 </div>
              </div>

            </div>
          </>
        )}

        {view === ViewState.SCHEDULE && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Meeting Schedule</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setScheduleView('calendar')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        scheduleView === 'calendar' ? 'bg-white text-jci-navy shadow-sm' : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <Calendar size={16} />
                      Calendar
                    </button>
                    <button
                      onClick={() => setScheduleView('list')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        scheduleView === 'list' ? 'bg-white text-jci-navy shadow-sm' : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <List size={16} />
                      List
                    </button>
                  </div>
                  <button
                    onClick={handleSyncFromZoom}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-jci-navy hover:bg-gray-100 rounded-lg text-sm font-medium disabled:opacity-50"
                    title="Sync from Zoom"
                  >
                    <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                    {isSyncing ? 'Syncing...' : 'Sync'}
                  </button>
                  <button onClick={() => setView(ViewState.BOOKING)} className="bg-jci-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                    + New Booking
                  </button>
                </div>
             </div>
             {scheduleView === 'calendar' ? (
               <CalendarView meetings={meetings} onDelete={handleDelete} onEdit={handleEdit} />
             ) : (
               <ListView meetings={meetings} onDelete={handleDelete} onEdit={handleEdit} />
             )}
          </div>
        )}

        {view === ViewState.BOOKING && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <BookingForm 
              onSubmit={handleBookingSubmit} 
              onCancel={() => {
                setEditingMeetingId(null);
                setView(ViewState.DASHBOARD);
              }}
              editingMeeting={editingMeetingId ? meetings.find(m => m.id === editingMeetingId) : undefined}
              isSubmitting={isCreatingMeeting}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;