// app/api/music/route.ts
import { NextResponse } from 'next/server';
import { getAllMusic } from '@/lib/data';

export async function GET() {
  const allMusic = getAllMusic();
  return NextResponse.json(allMusic);
}