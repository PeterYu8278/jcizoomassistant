import { Meeting } from '../types';

const STORAGE_KEY = 'jci_meetings_data';

export const getMeetings = (): Meeting[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to load meetings", e);
    return [];
  }
};

export const saveMeeting = (meeting: Meeting): void => {
  const current = getMeetings();
  const updated = [...current, meeting];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const updateMeeting = (id: string, updatedMeeting: Meeting): void => {
    const current = getMeetings();
    const updated = current.map(m => m.id === id ? updatedMeeting : m);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const deleteMeeting = (id: string): void => {
    const current = getMeetings();
    const updated = current.filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}