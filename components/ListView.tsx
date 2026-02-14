import React from 'react';
import { Meeting } from '../types';
import { parseAsAppTz } from '../utils/timezone';
import MeetingCard from './MeetingCard';

interface ListViewProps {
  meetings: Meeting[];
  onDelete: (id: string) => void;
  onEdit?: (id: string) => void;
}

const ListView: React.FC<ListViewProps> = ({ meetings, onDelete, onEdit }) => {
  const sorted = [...meetings].sort((a, b) => {
    const da = parseAsAppTz(a.date, a.startTime).getTime();
    const db = parseAsAppTz(b.date, b.startTime).getTime();
    return da - db;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-500">
          {meetings.length} meeting{meetings.length !== 1 ? 's' : ''} total
        </p>
      </div>
      <div className="max-h-[700px] overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No meetings scheduled.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {sorted.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListView;
