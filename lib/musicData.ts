// lib/musicData.ts

export interface MusicItem {
  id: number | string;
  judul: string;
  link: string;
  tahun?: string;
  added?: string;
  playlist: string[];
}