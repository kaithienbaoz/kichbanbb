import { Spoiler } from '../types';

const ARCHIVE_KEY = 'bb_drama_archive';

export const getArchivedSpoilers = (): Spoiler[] => {
  const data = localStorage.getItem(ARCHIVE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to parse archive data", e);
    return [];
  }
};

export const saveSpoilerToArchive = (spoiler: Spoiler): boolean => {
  const archive = getArchivedSpoilers();
  // Check if already exists
  if (archive.some(s => s.id === spoiler.id)) {
    return false;
  }
  const newArchive = [spoiler, ...archive];
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(newArchive));
  return true;
};

export const deleteSpoilerFromArchive = (id: string): void => {
  const archive = getArchivedSpoilers();
  const newArchive = archive.filter(s => s.id !== id);
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(newArchive));
};

// This service is deprecated as the application has switched to a Copy-to-Clipboard model.
export const saveSpoilerToSheet = async (title: string, content: string): Promise<boolean> => {
  console.warn("saveSpoilerToSheet is no longer used. Use Clipboard API instead.");
  return false;
};
