import React, { useState, useEffect, useCallback } from 'react';
import { HardDrive, ExternalLink, Download, Calendar, RefreshCw, Loader2, ChevronDown } from 'lucide-react';
import { getAccountRecordings, isZoomApiConfigured, ZoomRecordingFile } from '../services/zoomService';

const formatRecordingType = (t: string): string => {
  const map: Record<string, string> = {
    shared_screen_with_speaker_view: 'Shared screen',
    shared_screen_with_gallery_view: 'Gallery view',
    active_speaker: 'Active speaker',
    gallery_view: 'Gallery',
    shared_screen: 'Shared screen',
    audio_only: 'Audio only',
    audio_transcript: 'Transcript',
    chat_file: 'Chat',
    timeline: 'Timeline',
  };
  return map[t] || t.replace(/_/g, ' ');
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
};

/** Format Zoom UTC start_time to readable date/time */
const formatMeetingTime = (utcIso: string): string => {
  if (!utcIso) return '';
  const d = new Date(utcIso);
  return d.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kuala_Lumpur',
  });
};

/** Get UTC date string YYYY-MM-DD for n days ago */
const utcDate = (daysAgo: number) => new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const RecordingsPage: React.FC = () => {
  const [from, setFrom] = useState(utcDate(30));
  const [to, setTo] = useState(utcDate(0));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<{ topic: string; start_time: string; duration: number; recording_files: ZoomRecordingFile[] }[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [nextPageToken, setNextPageToken] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadRecordings = useCallback(async () => {
    if (!isZoomApiConfigured()) {
      setError('Zoom API is not configured. Set VITE_USE_ZOOM_API=true.');
      return;
    }
    setLoading(true);
    setError(null);
    const fromDate = from || utcDate(30);
    const toDate = to || utcDate(0);
    const allMeetings: { topic: string; start_time: string; duration: number; recording_files: ZoomRecordingFile[] }[] = [];
    try {
      // Zoom API allows max 1 month per request - split into month chunks
      const chunks: { from: string; to: string }[] = [];
      let cur = new Date(fromDate + 'T00:00:00Z');
      const end = new Date(toDate + 'T23:59:59Z');
      while (cur <= end) {
        const chunkEnd = new Date(cur.getTime());
        chunkEnd.setUTCMonth(chunkEnd.getUTCMonth() + 1);
        chunkEnd.setUTCDate(0); // last day of current month (day 0 = prev month's last day)
        if (chunkEnd > end) {
          chunks.push({ from: cur.toISOString().slice(0, 10), to: toDate });
        } else {
          chunks.push({
            from: cur.toISOString().slice(0, 10),
            to: chunkEnd.toISOString().slice(0, 10),
          });
        }
        cur.setUTCMonth(cur.getUTCMonth() + 1);
        cur.setUTCDate(1);
      }
      for (const chunk of chunks) {
        let nextToken = '';
        do {
          const res = await getAccountRecordings({
            from: chunk.from,
            to: chunk.to,
            pageSize: 300,
            nextPageToken: nextToken || undefined,
          });
          allMeetings.push(...res.meetings);
          nextToken = res.nextPageToken || '';
        } while (nextToken);
      }
      // Sort by start_time descending (newest first)
      allMeetings.sort((a, b) => (b.start_time || '').localeCompare(a.start_time || ''));
      setMeetings(allMeetings);
      setTotalRecords(allMeetings.length);
      setNextPageToken('');
    } catch (e) {
      setError((e as Error)?.message || 'Failed to load recordings');
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    if (isZoomApiConfigured()) {
      loadRecordings();
    }
  }, []);

  const handleSearch = () => {
    loadRecordings();
  };


  if (!isZoomApiConfigured()) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800">
          <p className="font-medium">Zoom API is not configured.</p>
          <p className="text-sm mt-1">Enable VITE_USE_ZOOM_API and configure Zoom credentials to view cloud recordings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <HardDrive size={28} className="text-jci-blue" />
          Cloud Recordings
        </h1>
      </div>

      {/* Date range filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-jci-blue text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Date range in UTC. Zoom API allows max 1 month per query; ranges &gt;1 month are auto-split. Recordings are for the Zoom user associated with this app.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-800">
          {error}
        </div>
      )}

      {loading && meetings.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 size={40} className="animate-spin text-jci-blue" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
          <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
          <p>No cloud recordings found for the selected date range.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-4">
            {meetings.length} meeting(s) with recordings
          </p>
          <div className="space-y-3">
            {meetings.map((m) => {
              const key = `${m.start_time}-${m.topic}`;
              const isExpanded = expandedId === key;
              const fileCount = m.recording_files?.length ?? 0;
              return (
                <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : key)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{m.topic || 'Untitled meeting'}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {formatMeetingTime(m.start_time)} • {m.duration} min • {fileCount} file(s)
                      </p>
                    </div>
                    <ChevronDown size={20} className={`text-gray-400 flex-shrink-0 ml-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {isExpanded && m.recording_files && m.recording_files.length > 0 && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50">
                      <ul className="space-y-3">
                        {m.recording_files.map((f) => (
                          <li key={f.id} className="flex items-center justify-between gap-4 p-3 bg-white rounded-lg border border-gray-100">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900">{formatRecordingType(f.recording_type)}</p>
                              <p className="text-xs text-gray-500">{f.file_type} {formatFileSize(f.file_size) && ` • ${formatFileSize(f.file_size)}`}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {f.playback_url && (
                                <a href={f.playback_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-2 text-sm text-jci-blue hover:bg-blue-50 rounded-lg transition-colors" title="Play">
                                  <ExternalLink size={16} />
                                  Play
                                </a>
                              )}
                              {f.download_url && (
                                <a href={f.download_url} target="_blank" rel="noopener noreferrer" download className="flex items-center gap-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors" title="Download">
                                  <Download size={16} />
                                  Download
                                </a>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default RecordingsPage;
