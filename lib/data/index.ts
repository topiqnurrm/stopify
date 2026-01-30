// lib/data/index.ts
import { MusicItem } from '@/lib/musicData';
import { taufiq1 } from './taufiq/1';
import { taufiq4 } from './taufiq/4';
import { nadzar1 } from './nadzar/1';
// import { nadya1 } from './nadya/1'; // uncomment jika sudah ada

export interface MusicDatabase {
  [folder: string]: {
    [fileNum: string]: MusicItem[];
  };
}

// Use the imported MusicItem type for consistency
// (Remove the local MusicItem interface)

export const allMusicData: MusicDatabase = {
  taufiq: {
    '1': taufiq1,
    '4': taufiq4,
  },
  nadzar: {
    '1': nadzar1,
  },
  // nadya: {
  //   '1': nadya1,
  // },
};

// Helper function untuk get semua musik (sorted by ID descending)
export function getAllMusic(): MusicItem[] {
  const allMusic: MusicItem[] = [];
  
  Object.values(allMusicData).forEach(folder => {
    Object.values(folder).forEach(musicList => {
      allMusic.push(...musicList);
    });
  });
  
  // Sort by ID descending (ID besar di atas)
  return allMusic.sort((a, b) => Number(b.id) - Number(a.id));
}

// Helper function untuk get musik berdasarkan folder dan file
export function getMusicByPath(folder: string, fileNum: string): MusicItem[] {
  return allMusicData[folder]?.[fileNum] || [];
}

// Helper function untuk get musik by path dengan sorting
export function getMusicByPathSorted(folder: string, fileNum: string): MusicItem[] {
  const music = allMusicData[folder]?.[fileNum] || [];
  return [...music].sort((a, b) => Number(b.id) - Number(a.id));
}