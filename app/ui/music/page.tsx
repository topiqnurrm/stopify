'use client';


import { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, List, ChevronLeft, ChevronRight, Music, Search, X, Volume2, Video, ChevronUp, ChevronDown, ArrowUpDown, Maximize, Minimize } from 'lucide-react';
// ✅ Import config
import { getAllMusicEndpoints, PLAYLIST_NAMES } from '@/lib/musicConfig';

// ===== GOOGLE ANALYTICS 4 CONFIGURATION =====
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || '';

// ===== UMAMI ANALYTICS CONFIGURATION =====
const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_ID || '';
const UMAMI_SRC = 'https://cloud.umami.is/script.js';

// Load Google Analytics Script
const loadGoogleAnalytics = () => {
  if (typeof window === 'undefined') return;
  
  // Script 1: gtag.js
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script1);
  
  // Script 2: Configuration
  const script2 = document.createElement('script');
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}', {
      page_path: window.location.pathname,
    });
  `;
  document.head.appendChild(script2);
  
  console.log('✅ Google Analytics loaded');
};

// Helper function untuk tracking events
const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, eventParams);
    console.log('📊 GA Event:', eventName, eventParams);
  }
};
// ===== END GOOGLE ANALYTICS =====

// ===== UMAMI ANALYTICS =====
const loadUmamiAnalytics = () => {
  if (typeof window === 'undefined') return;
  
  // Cek apakah script sudah ada
  const existingScript = document.querySelector(`script[data-website-id="${UMAMI_WEBSITE_ID}"]`);
  if (existingScript) {
    console.log('✅ Umami already loaded');
    return;
  }
  
  // Load Umami script
  const script = document.createElement('script');
  script.async = true;
  script.defer = true;
  script.src = UMAMI_SRC;
  script.setAttribute('data-website-id', UMAMI_WEBSITE_ID);
  script.setAttribute('data-auto-track', 'true');
  script.setAttribute('data-domains', 'stopify-mocha.vercel.app');
  document.head.appendChild(script);
  
  script.onload = () => {
    console.log('✅ Umami Analytics loaded');
  };
  
  script.onerror = () => {
    console.error('❌ Failed to load Umami Analytics');
  };
};

// Helper function untuk tracking events Umami
const trackUmamiEvent = (eventName: string, eventData?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).umami) {
    (window as any).umami.track(eventName, eventData);
    console.log('📊 Umami Event:', eventName, eventData);
  }
};
// ===== END UMAMI ANALYTICS =====

// =========================================================
// KOREKSI TYPEDEFS DENGAN DECLARATION MERGING
// =========================================================
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    setInterval: (handler: TimerHandler, timeout?: number | undefined, ...args: any[]) => number;
    clearInterval: (handle: number | undefined) => void;
    gtag: (...args: any[]) => void;        
    dataLayer: any[];
    umami: any;  // ✅ TAMBAHKAN BARIS INI
  }
}

// Interface Song
interface Song {
  id: string | number;  // ← PERBAIKAN: Support both
  judul: string;
  link: string;
  tahun?: string;
  playlist?: string[];
  added?: string;
  negara?: string;
}

type SortCriteria = 'default' | 'judul-asc' | 'judul-desc' | 'tahun-asc' | 'tahun-desc' | 'added-asc' | 'added-desc';

const QUEUE_STORAGE_KEY = 'musicPlayerQueue';

const getOriginUrl = (): string | undefined => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return undefined;
};

const formatTime = (time: number): string => {
  if (isNaN(time) || time < 0) return '00:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Helper function untuk parse tanggal Indonesia (DD Bulan YYYY)
const parseIndonesianDate = (dateStr: string): Date => {
  const monthMap: { [key: string]: number } = {
    'Januari': 0, 'Februari': 1, 'Maret': 2, 'April': 3,
    'Mei': 4, 'Juni': 5, 'Juli': 6, 'Agustus': 7,
    'September': 8, 'Oktober': 9, 'November': 10, 'Desember': 11
  };
  
  const parts = dateStr.trim().split(' ');
  if (parts.length !== 3) {
    console.warn('Invalid date format:', dateStr);
    return new Date(0);
  }
  
  const day = parseInt(parts[0], 10);
  const monthName = parts[1];
  const month = monthMap[monthName];
  const year = parseInt(parts[2], 10);
  
  if (isNaN(day) || month === undefined || isNaN(year)) {
    console.warn('Invalid date components:', { day, month: monthName, year });
    return new Date(0);
  }
  
  const result = new Date(year, month, day);
  // Debug: hapus setelah fix
  // console.log(`Parsed: "${dateStr}" → ${result.toISOString()}`);
  
  return result;
};

export default function MusicPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userClosedSidebar, setUserClosedSidebar] = useState(false);
  const [queue, setQueue] = useState<Song[]>([]); 
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const repeatModeRef = useRef<'off' | 'all' | 'one'>('off'); // Tambah ini
  const isShuffledRef = useRef<boolean>(false); // TAMBAHAN BARU
  const shuffledOrderRef = useRef<Song[]>([]); // TAMBAHAN BARU
  const [shuffledOrder, setShuffledOrder] = useState<Song[]>([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState<{
    nada: string | null;
    mood: string | null;
    jenis: string | null;
    likedBy: string | null;
  }>({
    nada: null,
    mood: null,
    jenis: null,
    likedBy: null
  });
  const [showQueue, setShowQueue] = useState(false);
  const [notification, setNotification] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const [volume, setVolume] = useState(50);
  const [mode, setMode] = useState<'audio' | 'video'>('audio');
  
  const [isPlayerReady, setIsPlayerReady] = useState(false); 
  const [currentTime, setCurrentTime] = useState(0); 
  const [duration, setDuration] = useState(0);     
  const timeUpdateIntervalRef = useRef<number | null>(null); 
  
  const playerRef = useRef<any>(null);

  const [isCurrentlyPlayingFromQueue, setIsCurrentlyPlayingFromQueue] = useState(false);
  
  // STATE UNTUK WAKE LOCK
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

  // STATE UNTUK SORTING
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('default');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  
  // STATE UNTUK FULLSCREEN
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // TAMBAHAN BARU - Quality Management
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [currentQuality, setCurrentQuality] = useState<string>('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const qualityCheckIntervalRef = useRef<number | null>(null);

  // TAMBAHAN BARU: Simpan preferensi kualitas user
  const [preferredQuality, setPreferredQuality] = useState<string>('auto');
  const qualityRetryCountRef = useRef<number>(0);

  // STATE UNTUK AUTO-HIDE CONTROLS
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<number | null>(null);

  // --- WAKE LOCK LOGIC ---
  const requestWakeLock = async () => {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && !wakeLock) {
          try {
              const sentinel = await navigator.wakeLock.request('screen');
              setWakeLock(sentinel);
              console.log('Wake Lock berhasil diaktifkan.');
              
              sentinel.addEventListener('release', () => {
                  console.log('Wake Lock telah dilepaskan oleh browser.');
                  setWakeLock(null);
              });
          } catch (err) {
              console.error(`Wake Lock Error: ${(err as Error).name}: ${(err as Error).message}`);
          }
      }
  };

  const releaseWakeLock = () => {
      if (wakeLock) {
          wakeLock.release();
          setWakeLock(null);
          console.log('Wake Lock dilepaskan secara manual.');
      }
  };

  // --- FULLSCREEN LOGIC (YouTube Player) ---
  const toggleFullscreen = () => {
    // Cek mode terlebih dahulu
    if (mode === 'audio') {
      showNotification('⚠️ Fullscreen hanya tersedia di mode video');
      return;
    }

    // Cek player ready
    if (!playerRef.current || !isPlayerReady) {
      showNotification('⚠️ Player belum siap');
      return;
    }

    try {
      // Cari container video player (bukan iframe langsung)
      const playerContainer = document.querySelector('#youtube-player');
      
      if (!playerContainer) {
        showNotification('⚠️ Video player tidak ditemukan');
        console.error('Player container not found');
        return;
      }

      if (!document.fullscreenElement) {
        // Masuk fullscreen
        playerContainer.requestFullscreen().then(() => {
          setIsFullscreen(true);
          showNotification('🖥️ Video Fullscreen');
        }).catch((err) => {
          console.error('Fullscreen request error:', err);
          showNotification('❌ Fullscreen gagal: ' + err.message);
        });
      } else {
        // Keluar fullscreen
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
          showNotification('🪟 Keluar dari Fullscreen');
        }).catch((err) => {
          console.error('Exit fullscreen error:', err);
        });
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
      showNotification('❌ Browser tidak mendukung fullscreen');
    }
  };

  const changeQuality = (quality: string) => {
    if (!playerRef.current || !isPlayerReady) {
      showNotification('⚠️ Player belum siap');
      return;
    }

    if (mode === 'audio') {
      showNotification('⚠️ Kualitas hanya tersedia di mode video');
      return;
    }

    try {
      const qualityLabels: Record<string, string> = {
        'highres': '4K/8K',
        'hd2160': '4K',
        'hd1440': '2K',
        'hd1080': '1080p',
        'hd720': '720p',
        'large': '480p',
        'medium': '360p',
        'small': '240p',
        'tiny': '144p',
        'auto': 'Auto'
      };

      // PERBAIKAN KRUSIAL: Gunakan loadVideoById untuk memaksa kualitas
      const videoId = getYoutubeVideoId(currentSong!.link);
      const currentTime = playerRef.current.getCurrentTime();
      const wasPlaying = isPlaying;
      
      // Simpan preferensi kualitas
      setPreferredQuality(quality);
      localStorage.setItem('preferredQuality', quality);
      
      // METODE 1: Reload video dengan kualitas yang dipilih
      if (quality !== 'auto') {
        playerRef.current.loadVideoById({
          videoId: videoId,
          startSeconds: currentTime,
          suggestedQuality: quality
        });
      } else {
        // Untuk auto, cukup set playback quality
        playerRef.current.setPlaybackQuality('default');
      }
      
      // Tunggu video dimuat dan restore state
      setTimeout(() => {
        if (playerRef.current) {
          const actualQuality = playerRef.current.getPlaybackQuality();
          setCurrentQuality(actualQuality);
          
          if (wasPlaying) {
            playerRef.current.playVideo();
          } else {
            playerRef.current.pauseVideo();
          }
          
          showNotification(`✅ Kualitas: ${qualityLabels[actualQuality] || actualQuality}`);
        }
      }, 1000);
      
      setShowQualityMenu(false);
      
    } catch (err) {
      console.error('Quality change error:', err);
      showNotification('❌ Gagal mengubah kualitas');
    }
  };

  // Listener untuk perubahan fullscreen dari tombol ESC
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Sync repeatModeRef dengan repeatMode state
  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  // Sync isShuffledRef dengan isShuffled state
  useEffect(() => {
    isShuffledRef.current = isShuffled;
  }, [isShuffled]);

  // TAMBAHAN BARU: Sync shuffledOrderRef dengan shuffledOrder state
  useEffect(() => {
    shuffledOrderRef.current = shuffledOrder;
  }, [shuffledOrder]);

  useEffect(() => {
      if (isPlaying) {
          requestWakeLock();
      } else {
          releaseWakeLock();
      }
      return () => releaseWakeLock();
  }, [isPlaying]);

  // --- LOCAL STORAGE ---
  const saveQueueToLocalStorage = (newQueue: Song[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(newQueue));
      } catch (error) {
        console.error('Error saving queue:', error);
      }
    }
  };

  const loadQueueFromLocalStorage = (): Song[] => {
    if (typeof window !== 'undefined') {
      try {
        const storedQueue = localStorage.getItem(QUEUE_STORAGE_KEY);
        return storedQueue ? JSON.parse(storedQueue) : [];
      } catch (error) {
        console.error('Error loading queue:', error);
        return [];
      }
    }
    return [];
  };

  // Mount & Load
    useEffect(() => {
    if (typeof window !== 'undefined') {
      const initialQueue = loadQueueFromLocalStorage();
      setQueue(initialQueue);
      
      loadGoogleAnalytics(); // ✅ TAMBAHKAN BARIS INI
      loadUmamiAnalytics(); // ✅ TAMBAHKAN BARIS INI
      
      // TAMBAHAN: Load preferensi kualitas
      const savedQuality = localStorage.getItem('preferredQuality');
      if (savedQuality) {
        setPreferredQuality(savedQuality);
        console.log('Loaded preferred quality:', savedQuality);
      }
      
      // ✅ PERBAIKAN: PANGGIL fetchSongs untuk load data lagu
      fetchSongs(initialQueue);
      
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }
      
      window.onYouTubeIframeAPIReady = () => {
        console.log('YouTube API Ready');
      };
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    saveQueueToLocalStorage(queue);
  }, [queue]);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return; 
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        if (!userClosedSidebar) {
           setIsSidebarOpen(true);
        }
      } 
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mounted, userClosedSidebar]);

  // Listener untuk perubahan fullscreen dari tombol ESC
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // TAMBAHAN BARU: Close quality menu saat klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showQualityMenu && !target.closest('.quality-menu-container')) {
        setShowQualityMenu(false);
      }
    };

    if (showQualityMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showQualityMenu]);

  // TAMBAHAN BARU: Cleanup quality monitoring saat unmount
  useEffect(() => {
    return () => {
      if (qualityCheckIntervalRef.current) {
        window.clearInterval(qualityCheckIntervalRef.current);
        qualityCheckIntervalRef.current = null;
      }
    };
  }, []);

  // AUTO-SCROLL KE LAGU YANG SEDANG DIPUTAR SAAT SIDEBAR DIBUKA
  useEffect(() => {
    if (isSidebarOpen && currentSong && mounted) {
      // Tunggu sedikit untuk memastikan DOM sudah ter-render
      const scrollTimeout = setTimeout(() => {
        const songElement = songListRef.current[currentSong.id];
        if (songElement) {
          songElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 300); // Delay 300ms untuk transisi sidebar

      return () => clearTimeout(scrollTimeout);
    }
  }, [isSidebarOpen, currentSong, mounted]);

  // ✅ PERBAIKAN: fetchSongs
  const fetchSongs = async (initialQueue: Song[]) => {
    try {
      const response = await fetch('/api/music');
      
      if (!response.ok) {
        console.error('Failed to fetch music:', response.status);
        return;
      }
      
      // ✅ PERBAIKAN: Cast hasil JSON ke Song[]
      const allSongs = await response.json() as Song[];
      console.log('Total songs fetched:', allSongs.length);
      
      // Hapus duplikat berdasarkan ID (support string & number)
      const uniqueSongs = Array.from(
        new Map(allSongs.map((song) => [String(song.id), song])).values()
      );
      
      console.log('Unique songs:', uniqueSongs.length);
      
      // ✅ PERBAIKAN: Tidak perlu type annotation lagi karena sudah di-cast di atas
      const songsWithCountry = uniqueSongs.map((song) => {
        const countryPlaylists = song.playlist 
          ? song.playlist.filter((p) => {
              const num = parseInt(p);
              return num >= 9 && num <= 999;
            })
          : [];
        
        const negaraString = countryPlaylists.length > 0 
          ? countryPlaylists.map((p) => getPlaylistName(p)).join(', ')
          : undefined;
        
        return {
          ...song,
          negara: negaraString
        };
      });
        
      setSongs(songsWithCountry);
      console.log('Songs set:', songsWithCountry.length);
    } catch (error) {
      console.error('Error fetching songs:', error);
    }
  };

  // --- PLAYER INITIALIZATION ---
  useEffect(() => {
    if (!currentSong || !mounted || typeof window === 'undefined') return;

    setIsPlayerReady(false);
    setCurrentTime(0); 
    setDuration(0);

    const videoId = getYoutubeVideoId(currentSong.link);
    if (!videoId) return;

    if (playerRef.current) {
      try {
        if (typeof playerRef.current.destroy === 'function') {
           playerRef.current.destroy();
        }
        playerRef.current = null;
      } catch (e) { /* ignore */ }
    }

    if (window.YT && window.YT.Player) {
      const targetElement = 'youtube-player'; 
      const playerOrigin = getOriginUrl();

      playerRef.current = new window.YT.Player(targetElement, {
        height: '100%', 
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 0, 
          controls: 1,  // ✅ Aktifkan kontrol YouTube
          disablekb: 0,  // ✅ Aktifkan keyboard shortcuts
          fs: 1,  // ✅ Aktifkan tombol fullscreen YouTube
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          iv_load_policy: 3,
          origin: playerOrigin 
        },
        events: {
          onReady: (event: any) => {
            setIsPlayerReady(true); 
            event.target.setVolume(volume);
            
            setDuration(event.target.getDuration());
            
            // Setup kualitas video
            const qualities = event.target.getAvailableQualityLevels();
            console.log('Available qualities:', qualities);
            setAvailableQualities(qualities);
            
            // Load preferensi kualitas
            const savedQuality = localStorage.getItem('preferredQuality') || preferredQuality;
            setPreferredQuality(savedQuality);
            
            // Get initial quality
            const initialQuality = event.target.getPlaybackQuality();
            console.log('Initial quality:', initialQuality, 'Preferred:', savedQuality);
            setCurrentQuality(initialQuality || 'auto');
            
            // PERBAIKAN: JANGAN apply quality di onReady secara paksa
            // Quality akan di-apply saat user memilih dari menu
            // Atau saat loadVideoById dipanggil dengan suggestedQuality
            
            // Start quality monitoring (TETAP DIPERLUKAN untuk update UI)
            if (qualityCheckIntervalRef.current) {
              window.clearInterval(qualityCheckIntervalRef.current);
            }
            qualityCheckIntervalRef.current = window.setInterval(() => {
              try {
                const currentQ = event.target.getPlaybackQuality();
                if (currentQ) {
                  setCurrentQuality(currentQ);
                }
              } catch (e) {
                console.error('Quality check error:', e);
              }
            }, 2000) as number;
            
            // Auto-play jika isPlaying true
            if (isPlaying) {
              setTimeout(() => {
                try {
                  event.target.playVideo();
                } catch (e) {
                  console.error('Auto-play error:', e);
                }
              }, 200);
            }
            
            // Start time tracking
            if (timeUpdateIntervalRef.current) {
              window.clearInterval(timeUpdateIntervalRef.current);
            }
            timeUpdateIntervalRef.current = window.setInterval(() => {
              try {
                const playerState = event.target.getPlayerState();
                if (playerState === 1 || playerState === 3) { 
                  setCurrentTime(event.target.getCurrentTime());
                }
              } catch (e) {
                window.clearInterval(timeUpdateIntervalRef.current as number);
                timeUpdateIntervalRef.current = null;
              }
            }, 1000) as number;
          },
          onError: (event: any) => {
             console.error('Player Error', event.data);
             setIsPlaying(false);
          },
          onStateChange: (event: any) => {
            if (event.data === 0) {
              handleVideoEnded();
            } else if (event.data === 1) { // PLAYING
              setIsPlaying(true);
              
              // HAPUS bagian enforce saat playing - tidak efektif
              // Cukup update current quality saja
              try {
                const actualQuality = event.target.getPlaybackQuality();
                setCurrentQuality(actualQuality);
              } catch (e) {
                console.error('Quality update error:', e);
              }
            } else if (event.data === 2) { // PAUSED
              setIsPlaying(false);
            } else if (event.data === 3) { // BUFFERING
              // HAPUS bagian enforce saat buffering - tidak efektif
              try {
                const availableQ = event.target.getAvailableQualityLevels();
                setAvailableQualities(availableQ);
              } catch (e) {}
            }
          }
        },
      });
    }

    return () => {
      if (playerRef.current) {
        try {
          if (typeof playerRef.current.destroy === 'function') {
            playerRef.current.destroy(); 
          }
          playerRef.current = null;
        } catch (e) {}
      }
      if (timeUpdateIntervalRef.current) {
        window.clearInterval(timeUpdateIntervalRef.current);
      }
      // TAMBAHAN: Cleanup quality monitoring
      if (qualityCheckIntervalRef.current) {
        window.clearInterval(qualityCheckIntervalRef.current);
        qualityCheckIntervalRef.current = null;
      }
    };
    
  }, [currentSong, mounted]); 

  useEffect(() => {
    if (playerRef.current && isPlayerReady && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(volume);
    }
  }, [volume, isPlayerReady]);

  useEffect(() => {
    if (!playerRef.current || !isPlayerReady || typeof playerRef.current.playVideo !== 'function') return; 
    
    try {
      if (isPlaying) {
        // Tambahkan timeout kecil untuk memastikan player siap
        const playTimeout = setTimeout(() => {
          if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
            playerRef.current.playVideo();
          }
        }, 100);
        
        return () => clearTimeout(playTimeout);
      } else {
        playerRef.current.pauseVideo();
      }
    } catch (e) { console.error(e); }
  }, [isPlaying, isPlayerReady]);

  const getYoutubeVideoId = (url: string) => {
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  };

  const handleVideoEnded = () => {
    const currentRepeatMode = repeatModeRef.current;
    const currentIsShuffled = isShuffledRef.current;
    const currentShuffledOrder = shuffledOrderRef.current;
    
    console.log('Video ended. Repeat mode from ref:', currentRepeatMode, 'Shuffle:', currentIsShuffled, 'ShuffledOrder length:', currentShuffledOrder.length);
    
    // PERBAIKAN KRUSIAL: Validasi konsistensi shuffle state
    // Jika shuffle false TAPI shuffledOrder masih ada isi (state transitional), 
    // paksa kosongkan dan gunakan mode normal
    if (!currentIsShuffled && currentShuffledOrder.length > 0) {
      console.warn('Inconsistent shuffle state detected! Forcing normal mode.');
      shuffledOrderRef.current = []; // Paksa kosongkan
      setShuffledOrder([]); // Sync state
      // Lanjutkan ke mode normal di bawah
    }
    
    if (currentRepeatMode === 'one') {
      console.log('Repeating current song');
      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(0);
        setTimeout(() => {
          if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
            playerRef.current.playVideo();
            setIsPlaying(true);
          }
        }, 150);
      }
      return;
    }
    
    if (currentRepeatMode === 'all') {
      console.log('Repeat all: playing next');
      playNext();
      return;
    }
    
    console.log('Repeat off mode');
    
    if (!currentSong) {
      setIsPlaying(false);
      return;
    }
    
    if (isCurrentlyPlayingFromQueue && queueRef.current.length > 0) {
      console.log('Queue length from ref:', queueRef.current.length);
      playNext();
      return;
    }
    
    // PERBAIKAN: Gunakan shuffledOrderRef.current yang sudah pasti konsisten
    const validShuffledOrder = shuffledOrderRef.current;

    // PENGECEKAN TAMBAHAN: Jika lagu saat ini ada di shuffledOrder TAPI shuffle sudah dimatikan
    // Artinya ini lagu hasil shuffle yang sedang diputar, tapi user sudah matikan shuffle
    // PAKSA gunakan mode normal untuk lagu berikutnya
    const isCurrentSongFromOldShuffle = 
      !currentIsShuffled && 
      validShuffledOrder.length > 0 && 
      validShuffledOrder.some(s => s.id === currentSong.id);

    if (isCurrentSongFromOldShuffle) {
      console.warn('Current song is from old shuffle, but shuffle is now OFF. Using normal mode.');
      // Kosongkan shuffled order SEGERA
      shuffledOrderRef.current = [];
      setShuffledOrder([]);
      // Lanjut ke mode normal di bawah (jangan return!)
    }

    // Shuffle mode - HARUS memenuhi KEDUA kondisi DAN bukan dari old shuffle
    if (currentIsShuffled === true && validShuffledOrder.length > 0 && !isCurrentSongFromOldShuffle) {
      console.log('Using shuffle mode');
      const currentIndex = validShuffledOrder.findIndex(s => s.id === currentSong.id);
      
      if (currentIndex !== -1 && currentIndex < validShuffledOrder.length - 1) {
        const nextIndex = currentIndex + 1;
        console.log('Playing next shuffled song at index:', nextIndex);
        setCurrentSong(validShuffledOrder[nextIndex]);
        setIsPlaying(true);
      } else {
        console.log('End of shuffled order, re-shuffling');
        const songsToShuffle = [...activePlaylistSongs.filter(s => s.id !== currentSong?.id)];
        
        if (songsToShuffle.length > 0) {
          const newShuffled = songsToShuffle.sort(() => Math.random() - 0.5);
          const newOrder = [currentSong, ...newShuffled];
          setShuffledOrder(newOrder);
          shuffledOrderRef.current = newOrder;
          setCurrentSong(newShuffled[0]);
          setIsPlaying(true);
        } else {
          setCurrentSong(currentSong);
          setIsPlaying(true);
        }
      }
      return;
    }

    // Mode normal (tidak shuffle, tidak repeat)
    console.log('Using normal mode (no shuffle)');
    const playQueue = activePlaylistSongs;
    if (playQueue.length > 0) {
      const currentIndex = playQueue.findIndex(s => s.id === currentSong.id);
      if (currentIndex !== -1 && currentIndex < playQueue.length - 1) {
        console.log('Playing next song in normal order');
        // PERBAIKAN: Langsung set lagu berikutnya tanpa memanggil playNext()
        const nextIndex = currentIndex + 1;
        setCurrentSong(playQueue[nextIndex]);
        setIsPlaying(true);
        setIsCurrentlyPlayingFromQueue(false);
      } else {
        console.log('End of playlist, stopping');
        setIsPlaying(false);
      }
    } else {
      setIsPlaying(false);
    }
  };

  // --- FUNGSI SORTING ---
  const sortSongs = (songsToSort: Song[], criteria: SortCriteria): Song[] => {
    if (criteria === 'default') return songsToSort;

    const sorted = [...songsToSort];
    
    switch (criteria) {
      case 'judul-asc':
        return sorted.sort((a, b) => a.judul.localeCompare(b.judul, 'id', { sensitivity: 'base' }));
      case 'judul-desc':
        return sorted.sort((a, b) => b.judul.localeCompare(a.judul, 'id', { sensitivity: 'base' }));
      case 'tahun-asc':
        return sorted.sort((a, b) => {
          const yearA = a.tahun || '0';
          const yearB = b.tahun || '0';
          return yearA.localeCompare(yearB);
        });
      case 'tahun-desc':
        return sorted.sort((a, b) => {
          const yearA = a.tahun || '0';
          const yearB = b.tahun || '0';
          return yearB.localeCompare(yearA);
        });
      case 'added-asc':
        return sorted.sort((a, b) => {
          const dateA = parseIndonesianDate(a.added || '1 Januari 1970');
          const dateB = parseIndonesianDate(b.added || '1 Januari 1970');
          return dateA.getTime() - dateB.getTime();
        });
      case 'added-desc':
        return sorted.sort((a, b) => {
          const dateA = parseIndonesianDate(a.added || '1 Januari 1970');
          const dateB = parseIndonesianDate(b.added || '1 Januari 1970');
          return dateB.getTime() - dateA.getTime();
        });
      default:
        return sorted;
    }
  };

  // --- FILTERING DAN SORTING DENGAN useMemo ---
  const filteredSongs = useMemo(() => {
    const filtered = songs.filter(song => {
      const matchesNada = selectedPlaylists.nada === null || (song.playlist && song.playlist.includes(selectedPlaylists.nada));
      const matchesMood = selectedPlaylists.mood === null || (song.playlist && song.playlist.includes(selectedPlaylists.mood));
      const matchesJenis = selectedPlaylists.jenis === null || (song.playlist && song.playlist.includes(selectedPlaylists.jenis));
      const matchesLikedBy = selectedPlaylists.likedBy === null || (song.playlist && song.playlist.includes(selectedPlaylists.likedBy));

      const matchesSearch = searchQuery === '' || 
        song.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (song.tahun && song.tahun.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (song.added && song.added.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (song.negara && song.negara.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesLikedBy && matchesNada && matchesMood && matchesJenis && matchesSearch;
    });

    return sortSongs(filtered, sortCriteria);
  }, [songs, selectedPlaylists, searchQuery, sortCriteria]);

  // Daftar playlist yang ditampilkan sebagai filter (hanya kategori utama)
  const playlistGroups = {
    likedBy: [
      { id: 'b', name: 'Taufiq' },
      { id: 'c', name: 'Nadya' },
      { id: 'l', name: 'Nadzar' },
    ],
    nada: [
      { id: '1', name: 'Nada Tinggi' },
      { id: '2', name: 'Nada Cepat' },
      { id: '3', name: 'Nada Santai' },
    ],
    mood: [
      { id: '4', name: 'Sedih' },
      { id: 'i', name: 'Rock' },
      { id: '5', name: 'Bahagia' },
      { id: '6', name: 'Adrenalin' },
      { id: 'a', name: 'Normal' },
      { id: 'd', name: 'Rap' },
      { id: 'e', name: 'Phonk' },
      { id: 'f', name: 'Jawa' },
      { id: 'g', name: 'DJ' },
      { id: 'h', name: 'Love' },
      { id: 'j', name: 'Classic' },
    ],
    jenis: [
      { id: '7', name: 'Nyanyiable' },
      { id: '8', name: 'Hearingable' },
      { id: 'k', name: 'Else' },
    ],
  };

  // ✅ PERBAIKAN: getPlaylistName menggunakan config
  const getPlaylistName = (playlistNumber: string): string => {
    return PLAYLIST_NAMES[playlistNumber] || playlistNumber;
  };

  const togglePlaylistSelection = (groupKey: 'nada' | 'mood' | 'jenis' | 'likedBy', playlistId: string) => {
    setSelectedPlaylists(prev => {
      const newValue = prev[groupKey] === playlistId ? null : playlistId;
      
      // ✅ TAMBAHKAN INI
      if (newValue !== null) {
        trackEvent('filter_applied', {
          filter_type: groupKey,
          filter_value: getPlaylistName(playlistId)
        });
        
        // ✅ TAMBAHKAN INI
        trackUmamiEvent('filter_applied', {
          type: groupKey,
          value: getPlaylistName(playlistId)
        });
      }
      
      return {
        ...prev,
        [groupKey]: newValue
      };
    });
  };

  const clearAllFilters = () => {
    setSelectedPlaylists({ nada: null, mood: null, jenis: null, likedBy: null });
    showNotification('🔄 Semua filter dibersihkan');
  };

  const hasActiveFilters = () => {
    return selectedPlaylists.nada !== null || 
          selectedPlaylists.mood !== null || 
          selectedPlaylists.jenis !== null ||
          selectedPlaylists.likedBy !== null;
  };

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  const togglePlay = () => {
    if (!isPlaying && currentSong) {
      trackEvent('play_song', {
        song_title: currentSong.judul,
        song_year: currentSong.tahun || 'unknown',
        playlist: currentSong.playlist?.join(', ') || 'none'
      });
      
      // ✅ TAMBAHKAN INI
      trackUmamiEvent('play_song', {
        song: currentSong.judul,
        year: currentSong.tahun
      });
    }
    
    // PERBAIKAN: Cek apakah playlist sudah selesai (lagu terakhir + tidak playing + bukan dari queue)
    if (!isPlaying && currentSong && !isCurrentlyPlayingFromQueue) {
      const playQueue = (isShuffled && shuffledOrder.length > 0) ? shuffledOrder : activePlaylistSongs;
      const currentIndex = playQueue.findIndex(s => s.id === currentSong.id);
      const isAtEnd = currentIndex === playQueue.length - 1;
      
      // Jika di akhir playlist dan repeat off, mulai dari awal playlist
      if (isAtEnd && repeatMode === 'off' && playQueue.length > 0) {
        setCurrentSong(playQueue[0]);
        setIsPlaying(true);
        showNotification('🔄 Memutar ulang dari awal playlist');
        return;
      }
    }
    
    // TAMBAHAN BARU: Cek apakah antrian sudah selesai (lagu terakhir antrian + tidak playing + dari queue)
    if (!isPlaying && currentSong && isCurrentlyPlayingFromQueue && queue.length > 0) {
      const currentIndex = queue.findIndex(s => s.id === currentSong.id);
      const isAtEnd = currentIndex === queue.length - 1;
      
      // Jika di akhir antrian dan repeat off, mulai dari awal antrian
      if (isAtEnd && repeatMode !== 'all' && queue.length > 0) {
        setCurrentSong(queue[0]);
        setIsPlaying(true);
        setIsCurrentlyPlayingFromQueue(true);
        showNotification('🔄 Memutar ulang antrian dari awal');
        return;
      }
    }
    
    // Jika tidak ada currentSong sama sekali, mulai dari lagu pertama
    if (!isPlaying && !currentSong) {
      const playQueue = (isShuffled && shuffledOrder.length > 0) ? shuffledOrder : activePlaylistSongs;
      if (playQueue.length > 0) {
        setCurrentSong(playQueue[0]);
        setIsPlaying(true);
        return;
      }
    }
    
    // Toggle biasa (pause/resume lagu saat ini)
    setIsPlaying(!isPlaying);
  };

  const playNext = () => {
    if (!currentSong) return;
    
    // PERBAIKAN: Gunakan queueRef.current
    if (isCurrentlyPlayingFromQueue && queueRef.current.length > 0) {
      const currentIndex = queueRef.current.findIndex(s => s.id === currentSong.id);
      console.log('playNext - Current index:', currentIndex, 'Queue length:', queueRef.current.length); // Debug
      
      const hasNextSong = currentIndex !== -1 && currentIndex < queueRef.current.length - 1;
      const isLastSong = currentIndex === queueRef.current.length - 1;
      
      if (hasNextSong) {
        const nextIndex = currentIndex + 1;
        setCurrentSong(queueRef.current[nextIndex]);
        setIsPlaying(true);
        setIsCurrentlyPlayingFromQueue(true);
        return;
      }
      
      if (isLastSong) {
        if (repeatModeRef.current === 'all') {
          setCurrentSong(queueRef.current[0]);
          setIsPlaying(true);
          setIsCurrentlyPlayingFromQueue(true);
          return;
        } else {
          setIsPlaying(false);
          showNotification('⏹️ Antrian selesai');
          return;
        }
      }
      
      setIsPlaying(false);
      return;
    }

    let playQueue = (isShuffled && shuffledOrder.length > 0) ? shuffledOrder : activePlaylistSongs;
    if (playQueue.length === 0) { 
      setIsPlaying(false); 
      return; 
    }
    
    const currentIndex = playQueue.findIndex(s => s.id === currentSong.id);
    
    if (currentIndex === -1) {
      setCurrentSong(playQueue[0]);
      setIsPlaying(true);
      setIsCurrentlyPlayingFromQueue(false);
      return;
    }
    
    const nextIndex = (currentIndex + 1) % playQueue.length;
    setCurrentSong(playQueue[nextIndex]);
    setIsPlaying(true);
    setIsCurrentlyPlayingFromQueue(false); 
  };

  const playPrevious = () => {
    if (!currentSong) return;
    
    // Hanya gunakan queue jika sedang bermain dari queue DAN queue masih ada isinya
    if (isCurrentlyPlayingFromQueue && queue.length > 0) {
      const currentIndex = queue.findIndex(s => s.id === currentSong.id);
      if (currentIndex !== -1 && currentIndex > 0) {
        // Masih ada lagu sebelumnya di queue
        const prevIndex = currentIndex - 1;
        setCurrentSong(queue[prevIndex]);
        setIsPlaying(true);
        setIsCurrentlyPlayingFromQueue(true); 
        return; 
      } else {
        // Di awal queue, loop ke akhir antrian
        setCurrentSong(queue[queue.length - 1]);
        setIsPlaying(true);
        setIsCurrentlyPlayingFromQueue(true);
        return;
      }
    }
    
    // Gunakan daftar lagu (filtered atau shuffled)
    // let playQueue = (isShuffled && shuffledOrder.length > 0) ? shuffledOrder : filteredSongs;
    // PERBAIKAN: Gunakan active playlist songs, bukan filtered songs
    let playQueue = (isShuffled && shuffledOrder.length > 0) ? shuffledOrder : activePlaylistSongs;
    if (playQueue.length === 0) { setIsPlaying(false); return; }
    
    const currentIndex = playQueue.findIndex(s => s.id === currentSong.id);
    const prevIndex = currentIndex === 0 ? playQueue.length - 1 : currentIndex - 1;
    setCurrentSong(playQueue[prevIndex]);
    setIsPlaying(true);
    setIsCurrentlyPlayingFromQueue(false);
  };

  // TAMBAHKAN USEEFFECT BARU INI setelah useEffect auto re-shuffle:

  const toggleShuffle = () => {
    // Cegah shuffle saat memutar dari queue
    if (isCurrentlyPlayingFromQueue) {
      showNotification('⚠️ Shuffle tidak tersedia saat memutar antrian');
      return;
    }
    
    // PERBAIKAN: Jika repeat ONE aktif, matikan otomatis saat shuffle diaktifkan
    if (repeatMode === 'one' && !isShuffled) {
      repeatModeRef.current = 'off';
      setRepeatMode('off');
      showNotification('🔁 Repeat One dimatikan • 🔀 Shuffle diaktifkan');
      // Lanjutkan ke aktivasi shuffle di bawah
    }
    
    if (!isShuffled) {
      // Aktifkan shuffle
      const playQueue = activePlaylistSongs;
      
      const currentIndex = playQueue.findIndex(s => s.id === currentSong?.id);
      const isLastSong = currentIndex === playQueue.length - 1;
      
      if (isLastSong && currentSong) {
        const allSongs = [...playQueue];
        const shuffled = allSongs.sort(() => Math.random() - 0.5);
        setShuffledOrder(shuffled);
        setIsShuffled(true);
        
        // TAMBAHAN: Update ref langsung
        shuffledOrderRef.current = shuffled;
        isShuffledRef.current = true;
        
        showNotification('🔀 Shuffle diaktifkan (lagu berikutnya acak)');
      } else {
        let songsToShuffle = [...playQueue.filter(s => s.id !== currentSong?.id)];
        const shuffled = songsToShuffle.sort(() => Math.random() - 0.5);
        const newOrder = currentSong ? [currentSong, ...shuffled] : shuffled;
        setShuffledOrder(newOrder);
        setIsShuffled(true);
        
        // TAMBAHAN: Update ref langsung
        shuffledOrderRef.current = newOrder;
        isShuffledRef.current = true;
        
        showNotification('🔀 Shuffle diaktifkan');
      }
    } else {
      // Matikan shuffle
      setShuffledOrder([]);
      setIsShuffled(false);
      
      // PERBAIKAN KRUSIAL: Kosongkan ref SEGERA (jangan tunggu state update)
      shuffledOrderRef.current = [];
      isShuffledRef.current = false;
      
      showNotification('🔀 Shuffle dimatikan');
    }
  };

  const toggleRepeat = () => {
    // Cegah repeat all/one saat memutar dari queue
    if (isCurrentlyPlayingFromQueue && (repeatMode === 'off' || repeatMode === 'one')) {
      // Hanya izinkan repeat 'all' untuk queue
      if (repeatMode === 'off') {
        repeatModeRef.current = 'all';
        setRepeatMode('all');
        showNotification('🔁 Repeat semua antrian');
      } else {
        // Dari 'one' ke 'all' diperbolehkan
        repeatModeRef.current = 'all';
        setRepeatMode('all');
        showNotification('🔁 Repeat semua antrian');
      }
      return;
    }
    
    // Cegah repeat one saat dari queue
    if (isCurrentlyPlayingFromQueue && repeatMode === 'all') {
      showNotification('⚠️ Repeat One tidak tersedia untuk antrian');
      // Matikan repeat
      repeatModeRef.current = 'off';
      setRepeatMode('off');
      return;
    }
    
    // LOGIKA BARU: Jika shuffle aktif DAN repeat all aktif, langsung ke repeat one + matikan shuffle
    if (isShuffled && repeatMode === 'all') {
      // Matikan shuffle
      setShuffledOrder([]);
      setIsShuffled(false);
      
      // Aktifkan repeat one
      repeatModeRef.current = 'one';
      setRepeatMode('one');
      
      showNotification('🔁 Repeat One aktif • Shuffle dimatikan');
      return;
    }
    
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    const newMode = modes[(currentIndex + 1) % modes.length];
    
    repeatModeRef.current = newMode;
    setRepeatMode(newMode);
    
    const msgs = { 
      off: '🔁 Repeat dimatikan', 
      all: '🔁 Repeat semua lagu', 
      one: '🔁 Repeat lagu ini saja' 
    };
    showNotification(msgs[newMode]);
  };

  // TAMBAHKAN REF BARU untuk queue (taruh setelah repeatModeRef)
  const queueRef = useRef<Song[]>([]);

  // UPDATE: Sync queueRef dengan queue state
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseInt(e.target.value, 10);
    setCurrentTime(seekTime);
    if (playerRef.current && isPlayerReady) {
      playerRef.current.seekTo(seekTime, true);
    }
  };

  // ✅ BENAR - Support string & number
  const songListRef = useRef<{ [key: string | number]: HTMLDivElement | null }>({});

  const addToQueue = (song: Song) => {
    setQueue(prev => {
      // Hapus lagu yang sama jika sudah ada
      const filtered = prev.filter(s => s.id !== song.id);
      // Tambahkan ke posisi terakhir
      return [...filtered, song];
    });
    showNotification(`✅ "${song.judul}" ditambahkan ke antrian`);
  };

  const removeFromQueue = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  const clearQueue = () => {
    if (confirm('Hapus semua lagu dari antrian?')) {
      setQueue([]);
      showNotification('🗑️ Antrian dikosongkan');
    }
  };

  const moveQueueItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= queue.length || fromIndex === toIndex) return;

    setQueue(prevQueue => {
      const newQueue = [...prevQueue];
      const [movedItem] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, movedItem);
      return newQueue;
    });
  };

  const handleSidebarToggle = () => {
    const willOpen = !isSidebarOpen;
    setIsSidebarOpen(willOpen);
    setUserClosedSidebar(isSidebarOpen);
    
    // Jika sidebar akan dibuka dan ada lagu yang sedang diputar, scroll ke lagu tersebut
    if (willOpen && currentSong && mounted) {
      setTimeout(() => {
        const songElement = songListRef.current[currentSong.id];
        if (songElement) {
          songElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 350); // Delay sedikit lebih lama dari transisi sidebar (300ms)
    }
  };

  const handleSortChange = (criteria: SortCriteria) => {
    setSortCriteria(criteria);
    setShowSortDropdown(false);
    
    const sortLabels: Record<SortCriteria, string> = {
      'default': 'Urutan Default',
      'judul-asc': 'Judul A-Z',
      'judul-desc': 'Judul Z-A',
      'tahun-asc': 'Tahun Lama-Baru',
      'tahun-desc': 'Tahun Baru-Lama',
      'added-asc': 'Ditambahkan Lama-Baru',
      'added-desc': 'Ditambahkan Baru-Lama'
    };
    
    showNotification(`📊 ${sortLabels[criteria]}`);
  };

  const [activePlaylistFilter, setActivePlaylistFilter] = useState<{
    nada: string | null;
    mood: string | null;
    jenis: string | null;
    likedBy: string | null;
  } | null>(null);

  const activePlaylistSongs = useMemo(() => {
    if (!activePlaylistFilter) return filteredSongs;  // ✅ TETAP
    
    const filtered = songs.filter(song => {
      const matchesNada = activePlaylistFilter.nada === null || (song.playlist && song.playlist.includes(activePlaylistFilter.nada));
      const matchesMood = activePlaylistFilter.mood === null || (song.playlist && song.playlist.includes(activePlaylistFilter.mood));
      const matchesJenis = activePlaylistFilter.jenis === null || (song.playlist && song.playlist.includes(activePlaylistFilter.jenis));
      const matchesLikedBy = activePlaylistFilter.likedBy === null || (song.playlist && song.playlist.includes(activePlaylistFilter.likedBy));

      return matchesLikedBy && matchesNada && matchesMood && matchesJenis;
    });

    const sorted = sortSongs(filtered, sortCriteria);  // ✅ SAMA SEPERTI filteredSongs
    
    // ✅ TAMBAHKAN LOG DEBUGGING (opsional, bisa dihapus nanti)
    console.log('Active Playlist Songs:', {
      count: sorted.length,
      sortCriteria,
      firstSong: sorted[0]?.judul
    });
    
    return sorted;
  }, [songs, activePlaylistFilter, sortCriteria, filteredSongs]);  // ✅ TAMBAH filteredSongs

  // Tambahkan useEffect baru setelah useEffect yang ada
  useEffect(() => {
    // PERBAIKAN KRUSIAL: Cek ref DAN length shuffledOrder saat ini
    // Jika shuffledOrderRef kosong, jangan lakukan apa-apa (shuffle baru dimatikan)
    if (!isShuffledRef.current || shuffledOrderRef.current.length === 0) {
      return; // Skip jika shuffle tidak aktif atau baru dimatikan
    }
    
    // Auto re-shuffle ketika activePlaylistSongs berubah dan shuffle aktif
    if (isShuffled && activePlaylistSongs.length > 0 && !isCurrentlyPlayingFromQueue) {
      let songsToShuffle = [...activePlaylistSongs.filter(s => s.id !== currentSong?.id)];
      const shuffled = songsToShuffle.sort(() => Math.random() - 0.5);
      const newOrder = currentSong ? [currentSong, ...shuffled] : shuffled;
      setShuffledOrder(newOrder);
      
      // TAMBAHAN PENTING: Update ref juga!
      shuffledOrderRef.current = newOrder;
    }
  }, [activePlaylistSongs, isShuffled]);

  // Re-shuffle dan maintain repeat saat berganti playlist
  useEffect(() => {
    // Jika tidak ada active playlist filter atau sedang dari queue, skip
    if (!activePlaylistFilter || isCurrentlyPlayingFromQueue) return;
    
    // PERBAIKAN KRUSIAL: Cek ref DAN length shuffledOrder saat ini
    // Jika shuffledOrderRef kosong, jangan lakukan apa-apa (shuffle baru dimatikan)
    if (!isShuffledRef.current || shuffledOrderRef.current.length === 0) {
      return; // Skip jika shuffle tidak aktif atau baru dimatikan
    }
    
    // Re-shuffle dengan lagu dari playlist baru jika shuffle aktif
    if (isShuffled && activePlaylistSongs.length > 0) {
      let songsToShuffle = [...activePlaylistSongs.filter(s => s.id !== currentSong?.id)];
      const shuffled = songsToShuffle.sort(() => Math.random() - 0.5);
      const newOrder = currentSong ? [currentSong, ...shuffled] : shuffled;
      setShuffledOrder(newOrder);
      
      // TAMBAHAN PENTING: Update ref juga!
      shuffledOrderRef.current = newOrder;
      
      showNotification('🔀 Shuffle diperbarui untuk playlist baru');
    }
    
    // Repeat mode tetap aktif, hanya notifikasi
    if (repeatMode !== 'off') {
      showNotification(`🔁 Repeat ${repeatMode === 'all' ? 'All' : 'One'} tetap aktif`);
    }
  }, [activePlaylistFilter]);

  // AUTO-HIDE CONTROLS - Tampilkan saat mouse di 1/3 bawah layar (DESKTOP ONLY)
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    
    const checkDesktop = () => window.innerWidth >= 768;
    
    // Set initial state
    if (!checkDesktop()) {
      setShowControls(true); // Mobile: selalu tampilkan
      return;
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      // Double check desktop saat event
      if (!checkDesktop()) return;
      
      const windowHeight = window.innerHeight;
      const mouseY = e.clientY;
      const lowerThreshold = windowHeight * (2/3);
      
      if (mouseY >= lowerThreshold) {
        setShowControls(true);
        
        if (controlsTimeoutRef.current) {
          window.clearTimeout(controlsTimeoutRef.current);
        }
        
        controlsTimeoutRef.current = window.setTimeout(() => {
          setShowControls(false);
        }, 3000) as number;
      } else {
        setShowControls(false);
      }
    };
    
    const handleResize = () => {
      if (!checkDesktop()) {
        setShowControls(true); // Paksa tampil jika resize ke mobile
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [mounted]);

  if (!mounted) return <div className="h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-900 text-white relative overflow-x-hidden" suppressHydrationWarning={true}>
      
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-70 backdrop-blur-md px-8 py-4 rounded-2xl shadow-2xl z-50 animate-fade-in-out">
          <p className="font-medium">{notification}</p>
        </div>
      )}

      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'translate-x-0 w-full md:w-80' : '-translate-x-full md:w-0'} fixed md:relative h-full inset-y-0 md:inset-auto transition-all duration-300 bg-gray-800 overflow-y-auto z-40`}>
        <div className="h-full flex flex-col">
          {/* Sticky Header */}
          <div className="flex-shrink-0 sticky top-0 bg-gray-800 z-10 p-4 pb-2 border-b border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                🎵 Music Playlist 
                <span className="ml-2 text-base font-normal text-gray-400">
                  ({filteredSongs.length})
                </span>
              </h2>
              <button onClick={() => { setIsSidebarOpen(false); setUserClosedSidebar(true); }} className="md:hidden p-2 hover:bg-gray-700 rounded"><X size={24} /></button>
            </div>
          
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Cari lagu..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-10 py-2 bg-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={18} /></button>}
          </div>

          <div className="mb-4">
            {/* Header dengan tombol minimize dan clear */}
            <div className="flex items-center justify-between mb-3">
              <button 
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
              >
                {isFilterExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                Filter Playlist
                {hasActiveFilters() && !isFilterExpanded && (
                  <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                    {[
                      selectedPlaylists.likedBy,
                      selectedPlaylists.nada,
                      selectedPlaylists.mood,
                      selectedPlaylists.jenis
                    ].filter(Boolean).length}
                  </span>
                )}
                {/* DIHAPUS: Indikator ✓ Aktif */}
              </button>
              {hasActiveFilters() && (
                <button 
                  onClick={clearAllFilters}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <X size={12} /> Clear
                </button>
              )}
            </div>

            {/* Konten filter - hanya tampil jika expanded */}
            {isFilterExpanded && (
              <div className="space-y-3">

                {/* Grup Liked by */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Liked by
                    {activePlaylistFilter?.likedBy && (
                      <span className="ml-2 text-pink-400 font-semibold">
                        • {playlistGroups.likedBy.find(p => p.id === activePlaylistFilter.likedBy)?.name}
                      </span>
                    )}
                  </label>
                  <div className="overflow-x-auto pb-2 -mx-1 px-1 playlist-filter-scrollbar">
                    <div className="flex gap-2 min-w-max py-1">
                      {playlistGroups.likedBy.map(pl => {
                        const isActive = activePlaylistFilter?.likedBy === pl.id;
                        const isSelected = selectedPlaylists.likedBy === pl.id;
                        
                        return (
                          <button 
                            key={pl.id} 
                            onClick={() => togglePlaylistSelection('likedBy', pl.id)} 
                            className={`px-2.5 py-0.5 rounded-full text-xs transition-all whitespace-nowrap ${
                              isActive && isSelected
                                ? 'bg-pink-600 text-white shadow-[0_0_0_2px_rgba(219,39,119,0.5)]' 
                                : isActive && !isSelected
                                  ? 'bg-gray-700/50 text-pink-300 shadow-[0_0_0_2px_rgba(244,114,182,0.4)]'
                                  : isSelected
                                    ? 'bg-pink-600 text-white shadow-[0_0_0_2px_rgba(219,39,119,0.5)]'
                                    : 'bg-gray-700/30 text-gray-400 hover:bg-gray-700/50'
                            }`}
                          >
                            {pl.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Grup Nada */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Nada
                    {activePlaylistFilter?.nada && (
                      <span className="ml-2 text-blue-400 font-semibold">
                        • {playlistGroups.nada.find(p => p.id === activePlaylistFilter.nada)?.name}
                      </span>
                    )}
                  </label>
                  <div className="overflow-x-auto pb-2 -mx-1 px-1 playlist-filter-scrollbar">
                    <div className="flex gap-2 min-w-max py-1">
                      {playlistGroups.nada.map(pl => {
                        const isActive = activePlaylistFilter?.nada === pl.id;
                        const isSelected = selectedPlaylists.nada === pl.id;
                        
                        return (
                          <button 
                            key={pl.id} 
                            onClick={() => togglePlaylistSelection('nada', pl.id)} 
                            className={`px-2.5 py-0.5 rounded-full text-xs transition-all whitespace-nowrap ${
                              isActive && isSelected
                                ? 'bg-blue-600 text-white border-2 border-blue-600 shadow-lg' 
                                : isActive && !isSelected
                                  ? 'bg-gray-800 text-blue-300 border-2 border-blue-400 shadow-md'
                                  : isSelected
                                    ? 'bg-blue-600 text-white border-2 border-blue-600'
                                    : 'bg-gray-700/30 text-gray-400 border-2 border-gray-600 hover:border-gray-500 hover:bg-gray-700/50'
                            }`}
                          >
                            {pl.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Grup Mood */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Mood
                    {activePlaylistFilter?.mood && (
                      <span className="ml-2 text-green-400 font-semibold">
                        • {playlistGroups.mood.find(p => p.id === activePlaylistFilter.mood)?.name}
                      </span>
                    )}
                  </label>
                  <div className="overflow-x-auto pb-2 -mx-1 px-1 playlist-filter-scrollbar">
                    <div className="flex gap-2 min-w-max py-1">
                      {playlistGroups.mood.map(pl => {
                        const isActive = activePlaylistFilter?.mood === pl.id;
                        const isSelected = selectedPlaylists.mood === pl.id;
                        
                        return (
                          <button 
                            key={pl.id} 
                            onClick={() => togglePlaylistSelection('mood', pl.id)} 
                            className={`px-2.5 py-0.5 rounded-full text-xs transition-all whitespace-nowrap ${
                              isActive && isSelected
                                ? 'bg-green-600 text-white border-2 border-green-600 shadow-lg' 
                                : isActive && !isSelected
                                  ? 'bg-gray-800 text-green-300 border-2 border-green-400 shadow-md'
                                  : isSelected
                                    ? 'bg-green-600 text-white border-2 border-green-600'
                                    : 'bg-gray-700/30 text-gray-400 border-2 border-gray-600 hover:border-gray-500 hover:bg-gray-700/50'
                            }`}
                          >
                            {pl.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Grup Jenis */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Jenis
                    {activePlaylistFilter?.jenis && (
                      <span className="ml-2 text-purple-400 font-semibold">
                        • {playlistGroups.jenis.find(p => p.id === activePlaylistFilter.jenis)?.name}
                      </span>
                    )}
                  </label>
                  <div className="overflow-x-auto pb-2 -mx-1 px-1 playlist-filter-scrollbar">
                    <div className="flex gap-2 min-w-max py-1">
                      {playlistGroups.jenis.map(pl => {
                        const isActive = activePlaylistFilter?.jenis === pl.id;
                        const isSelected = selectedPlaylists.jenis === pl.id;
                        
                        return (
                          <button 
                            key={pl.id} 
                            onClick={() => togglePlaylistSelection('jenis', pl.id)} 
                            className={`px-2.5 py-0.5 rounded-full text-xs transition-all whitespace-nowrap ${
                              isActive && isSelected
                                ? 'bg-purple-600 text-white border-2 border-purple-600 shadow-lg' 
                                : isActive && !isSelected
                                  ? 'bg-gray-800 text-purple-300 border-2 border-purple-400 shadow-md'
                                  : isSelected
                                    ? 'bg-purple-600 text-white border-2 border-purple-600'
                                    : 'bg-gray-700/30 text-gray-400 border-2 border-gray-600 hover:border-gray-500 hover:bg-gray-700/50'
                            }`}
                          >
                            {pl.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Info filter aktif - tetap sama */}
                {hasActiveFilters() && (
                  <div className="text-xs text-gray-400 bg-gray-700 px-3 py-2 rounded">
                    Filter aktif: {[
                      selectedPlaylists.likedBy && playlistGroups.likedBy.find(p => p.id === selectedPlaylists.likedBy)?.name,
                      selectedPlaylists.nada && playlistGroups.nada.find(p => p.id === selectedPlaylists.nada)?.name,
                      selectedPlaylists.mood && playlistGroups.mood.find(p => p.id === selectedPlaylists.mood)?.name,
                      selectedPlaylists.jenis && playlistGroups.jenis.find(p => p.id === selectedPlaylists.jenis)?.name,
                    ].filter(Boolean).join(' + ')}
                  </div>
                )}
              </div>  
            )}
          </div>

          {/* DROPDOWN SORTING */}
          <div className="mb-4 relative">
            <button 
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              <span className="flex items-center gap-2">
                <ArrowUpDown size={16} />
                {sortCriteria === 'default' ? 'Urutkan' : 
                 sortCriteria === 'judul-asc' ? 'Judul A-Z' :
                 sortCriteria === 'judul-desc' ? 'Judul Z-A' :
                 sortCriteria === 'tahun-asc' ? 'Tahun ↑' :
                 sortCriteria === 'tahun-desc' ? 'Tahun ↓' :
                 sortCriteria === 'added-asc' ? 'Ditambahkan ↑' :
                 'Ditambahkan ↓'}
              </span>
              <ChevronDown size={16} className={`transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showSortDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 rounded-lg shadow-lg z-10 overflow-hidden">
                <button onClick={() => handleSortChange('default')} className="w-full text-left px-3 py-2 hover:bg-gray-600 text-sm">Urutan Default</button>
                <button onClick={() => handleSortChange('judul-asc')} className="w-full text-left px-3 py-2 hover:bg-gray-600 text-sm">Judul A-Z</button>
                <button onClick={() => handleSortChange('judul-desc')} className="w-full text-left px-3 py-2 hover:bg-gray-600 text-sm">Judul Z-A</button>
                <button onClick={() => handleSortChange('tahun-asc')} className="w-full text-left px-3 py-2 hover:bg-gray-600 text-sm">Tahun Lama-Baru</button>
                <button onClick={() => handleSortChange('tahun-desc')} className="w-full text-left px-3 py-2 hover:bg-gray-600 text-sm">Tahun Baru-Lama</button>
                <button onClick={() => handleSortChange('added-asc')} className="w-full text-left px-3 py-2 hover:bg-gray-600 text-sm">Ditambahkan Lama-Baru</button>
                <button onClick={() => handleSortChange('added-desc')} className="w-full text-left px-3 py-2 hover:bg-gray-600 text-sm">Ditambahkan Baru-Lama</button>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 song-list-scrollbar">
          <div className="space-y-2"> 
            {filteredSongs.length === 0 ? (
            <div className="text-center text-gray-400 py-8"><Music size={48} className="mx-auto mb-4 opacity-50" /><p className="text-sm">Tidak ada lagu</p></div>
              ) : (
                filteredSongs.map((song, index) => {
                  return (
                    <div 
                      key={song.id} 
                      ref={(el) => { songListRef.current[song.id] = el; }}
                      className={`group flex items-center gap-3 p-3 rounded-lg transition-all duration-200 cursor-pointer hover:bg-gray-700 ${
                        currentSong?.id === song.id 
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg scale-[1.02]' 
                          : (() => {
                              // Cek apakah ada active playlist filter
                              if (activePlaylistFilter) {
                                const isInActivePlaylist = activePlaylistSongs.some(s => s.id === song.id);
                                const isInCurrentView = filteredSongs.some(s => s.id === song.id);
                                
                                // Lagu ada di active playlist DAN di view sekarang (irisan)
                                if (isInActivePlaylist && isInCurrentView) {
                                  const isViewingDifferentPlaylist = 
                                    activePlaylistFilter.nada !== selectedPlaylists.nada ||
                                    activePlaylistFilter.mood !== selectedPlaylists.mood ||
                                    activePlaylistFilter.jenis !== selectedPlaylists.jenis ||
                                    activePlaylistFilter.likedBy !== selectedPlaylists.likedBy;
                                  
                                  // Jika sedang melihat playlist yang berbeda, tandai dengan warna khusus
                                  return isViewingDifferentPlaylist 
                                    ? 'bg-gradient-to-r from-yellow-700/40 to-yellow-600/40 border border-yellow-500/30 hover:scale-[1.01]' // Gold untuk irisan
                                    : 'bg-gray-750 hover:scale-[1.01]'; // Normal untuk playlist aktif yang sama
                                }
                                
                                // Lagu HANYA di active playlist (tidak di view sekarang) - tidak akan muncul di list
                                // Lagu HANYA di view sekarang (tidak di active playlist)
                                if (!isInActivePlaylist && isInCurrentView) {
                                  return 'bg-gray-800/50 hover:scale-[1.01]'; // Lebih gelap untuk playlist tidak aktif
                                }
                              }
                              
                              // Default: tidak ada active playlist
                              return 'bg-gray-750 hover:scale-[1.01]';
                            })()
                      }`}
                      onClick={() => { 
                        // Deteksi apakah playlist berubah
                        const isPlaylistChanged = 
                          activePlaylistFilter?.nada !== selectedPlaylists.nada ||
                          activePlaylistFilter?.mood !== selectedPlaylists.mood ||
                          activePlaylistFilter?.jenis !== selectedPlaylists.jenis ||
                          activePlaylistFilter?.likedBy !== selectedPlaylists.likedBy;
                        
                        // Set active playlist hanya jika berbeda
                        if (isPlaylistChanged) {
                          setActivePlaylistFilter({...selectedPlaylists});
                        }
                        
                        // Clear search dan scroll ke lagu
                        if (searchQuery !== '') {
                          setSearchQuery('');
                          
                          setTimeout(() => {
                            const songElement = songListRef.current[song.id];
                            if (songElement) {
                              songElement.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'center' 
                              });
                            }
                          }, 100);
                        }
                        
                        // PERBAIKAN: Logika baru untuk handle klik lagu
                        if (currentSong?.id === song.id) {
                          // Lagu sama yang diklik
                          if (!isPlaying && !isCurrentlyPlayingFromQueue) {
                            // Cek apakah ini lagu terakhir yang sudah selesai
                            const playQueue = (isShuffled && shuffledOrder.length > 0) ? shuffledOrder : activePlaylistSongs;
                            const currentIndex = playQueue.findIndex(s => s.id === song.id);
                            const isLastSong = currentIndex === playQueue.length - 1;
                            
                            if (isLastSong && repeatMode === 'off') {
                              // Lagu terakhir yang sudah selesai -> mulai dari awal playlist
                              setCurrentSong(playQueue[0]);
                              setIsPlaying(true);
                              showNotification('🔄 Memutar ulang dari awal playlist');
                            } else {
                              // Lagu di tengah yang dipause -> lanjutkan
                              setIsPlaying(true);
                            }
                          } else if (isPlaying) {
                            // Sedang playing -> pause
                            setIsPlaying(false);
                          } else {
                            // Dari queue yang tidak playing -> play lanjut
                            setIsPlaying(true);
                          }
                        } else {
                          // Lagu berbeda, ganti dan play
                          setCurrentSong(song); 
                          
                          trackEvent('change_song', {
                            song_title: song.judul,
                            song_year: song.tahun,
                            playlist: song.playlist?.join(', ')
                          });
                          
                          // ✅ TAMBAHKAN INI
                          trackUmamiEvent('change_song', {
                            song: song.judul,
                            year: song.tahun
                          });
                          
                          setIsPlaying(true); 
                        }
                        setIsCurrentlyPlayingFromQueue(false);
                        
                        if (window.innerWidth < 768) { 
                          setIsSidebarOpen(false); 
                          setUserClosedSidebar(true); 
                        }
                      }}
                    >
                      {/* Nomor urut dengan animasi */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        currentSong?.id === song.id 
                          ? 'bg-white text-blue-600 shadow-md' 
                          : 'bg-gray-700 text-gray-400 group-hover:bg-gray-600'
                      }`}>
                        {currentSong?.id === song.id && isPlaying ? (
                          <div className="flex gap-0.5 items-center justify-center h-4">
                            <span className="w-0.5 bg-blue-600 rounded-full animate-pulse-bar" style={{height: '60%'}}></span>
                            <span className="w-0.5 bg-blue-600 rounded-full animate-pulse-bar" style={{height: '100%', animationDelay: '0.2s'}}></span>
                            <span className="w-0.5 bg-blue-600 rounded-full animate-pulse-bar" style={{height: '80%', animationDelay: '0.4s'}}></span>
                          </div>
                        ) : (
                          index + 1
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-sm truncate transition-colors ${
                          currentSong?.id === song.id ? 'text-white' : 'text-gray-200 group-hover:text-white'
                        }`}>
                          {song.judul}
                        </div>
                        <div className={`text-xs truncate transition-colors flex items-center gap-1 flex-wrap ${
                          currentSong?.id === song.id ? 'text-blue-100' : 'text-gray-400 group-hover:text-gray-300'
                        }`}>
                          {song.tahun && (
                            <>
                              <span>{song.tahun}</span>
                              <span>•</span>
                            </>
                          )}
                          {song.added && <span>Added {song.added}</span>}
                          {song.negara && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1">
                                🌍 {song.negara}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          // Toggle: jika sudah di queue, hapus. Jika belum, tambah.
                          const isInQueue = queue.some(q => q.id === song.id);
                          if (isInQueue) {
                            const queueIndex = queue.findIndex(q => q.id === song.id);
                            removeFromQueue(queueIndex);
                            showNotification(`❌ "${song.judul}" dihapus dari antrian`);
                          } else {
                            addToQueue(song);
                          }
                        }} 
                        className={`flex-shrink-0 p-2 rounded-lg transition-all transform hover:scale-110 ${
                          queue.some(q => q.id === song.id) 
                            ? 'bg-green-600 hover:bg-green-700 shadow-md' 
                            : currentSong?.id === song.id
                              ? 'bg-white text-blue-600 hover:bg-gray-100'
                              : 'bg-gray-700 hover:bg-gray-600 text-white'
                        }`}
                        title={queue.some(q => q.id === song.id) ? "Hapus dari antrian" : "Tambah ke antrian"}
                      >
                        <List size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {isSidebarOpen && <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30" onClick={() => { setIsSidebarOpen(false); setUserClosedSidebar(true); }} />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0"> 
        
        {/* Header */}
        <div className="bg-gray-800 p-2 md:p-4 flex items-center justify-between flex-shrink-0">
          <button onClick={handleSidebarToggle} className="p-1 md:p-2 hover:bg-gray-700 rounded">
            {isSidebarOpen ? <ChevronLeft size={20} className="md:w-6 md:h-6" /> : <ChevronRight size={20} className="md:w-6 md:h-6" />}
          </button>
          
          <div className="flex gap-1 md:gap-2 items-center">
            <button onClick={() => { setMode('audio'); showNotification('🎵 Mode Audio'); }} className={`px-2 py-1 md:px-4 md:py-2 rounded flex items-center gap-1 text-sm transition-colors ${mode === 'audio' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
              <Music size={14} className="md:w-5 md:h-5" /><span className="hidden sm:inline">Audio</span>
            </button>
            <button onClick={() => { setMode('video'); showNotification('🎬 Mode Video'); }} className={`px-2 py-1 md:px-4 md:py-2 rounded flex items-center gap-1 text-sm transition-colors ${mode === 'video' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
              <Video size={14} className="md:w-5 md:h-5" /><span className="hidden sm:inline">Video</span>
            </button>
          </div>

          <button onClick={() => setShowQueue(!showQueue)} className="p-1 md:p-2 hover:bg-gray-700 rounded relative">
            <List size={20} className="md:w-6 md:h-6" />
            {queue.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">{queue.length > 9 ? '9+' : queue.length}</span>}
          </button>
        </div>

        {/* Player Area: bisa scroll untuk sembunyikan controls */}
        <div className="flex-1 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 overflow-y-auto relative">
          <div className="min-h-full flex items-center justify-center py-4">
            {currentSong ? (
              <>
                {/* --- CONTAINER 1: VIDEO PLAYER (Visibility Diubah) --- */}
                {/* Menggunakan kelas kustom untuk menyembunyikan tanpa display: none */}
                <div 
                  className={`w-full h-full flex flex-col items-center justify-center p-4 md:p-8 transition-all duration-300 ${mode === 'audio' ? 'player-invisible' : 'block'}`}
                >
                  <div className="w-full flex-1 flex items-center justify-center min-h-0">
                    <div className="w-full h-full bg-black rounded-lg overflow-hidden relative" style={{ maxHeight: '100%', aspectRatio: '16/9', maxWidth: 'min(100%, calc(100vh * 16/9))' }}>
                      <div id="youtube-player" className="absolute top-0 left-0 w-full h-full"></div>
                    </div>
                  </div>
                  <div className="mt-4 text-center flex-shrink-0 max-h-[20%] overflow-y-auto">
                    <h2 className="text-lg md:text-xl lg:text-2xl font-bold">{currentSong.judul}</h2>
                    <p className="text-gray-400 text-xs md:text-sm">
                      {currentSong.tahun && `${currentSong.tahun} • `}
                      {currentSong.added && `Added ${currentSong.added}`}
                    </p>
                    {currentSong.playlist && currentSong.playlist.length > 0 && (
                      <p className="text-gray-500 text-xs md:text-sm mt-1">
                        {currentSong.playlist.map(p => getPlaylistName(p)).join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                {/* --- CONTAINER 2: AUDIO UI (COVER ART) --- */}
                <div className={`text-center max-w-md w-full transition-all duration-300 ${mode === 'video' ? 'hidden' : 'block'}`}>
                  <div className="w-40 h-40 md:w-64 md:h-64 mx-auto bg-gradient-to-br from-purple-600 via-pink-500 to-blue-600 rounded-full flex items-center justify-center mb-6 md:mb-8 shadow-2xl animate-pulse-slow">
                    <Music size={60} className="md:w-[120px] md:h-[120px] text-white" />
                  </div>
                  <h1 className="text-xl md:text-3xl font-bold mb-2 px-4">{currentSong.judul}</h1>
                  <p className="text-gray-400 text-sm md:text-lg mb-4">
                    {currentSong.tahun && `${currentSong.tahun} • `}
                    {currentSong.added && `Added ${currentSong.added}`}
                  </p>
                  {currentSong.playlist && currentSong.playlist.length > 0 && (
                    <p className="text-gray-500 text-xs md:text-sm px-4">
                      {currentSong.playlist.map(p => getPlaylistName(p)).join(', ')}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400"><Music size={80} className="mx-auto mb-4 opacity-50" /><p>Pilih lagu dari playlist</p></div>
            )}
          </div>
        </div>

        {/* Controls - sticky di bawah dengan auto-hide (desktop only) */}
        <div className={`bg-gray-800 p-3 md:p-6 fixed md:relative bottom-0 left-0 right-0 z-30 ${
          showControls ? 'block' : 'md:hidden'
        }`}>
          <div className="max-w-4xl mx-auto">
            
            {/* Timeline */}
            {currentSong && (
                <div className="flex items-center gap-2 md:gap-3 mb-3 text-xs md:text-sm">
                    <span className="text-gray-400 w-8 md:w-10 text-right">{formatTime(currentTime)}</span>
                    <input type="range" min="0" max={duration} value={currentTime} onChange={handleSeek} className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" disabled={!isPlayerReady || duration === 0} style={{ background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #374151 ${(currentTime / duration) * 100}%, #374151 100%)` }} />
                    <span className="text-gray-400 w-8 md:w-10 text-left">{formatTime(duration)}</span>
                </div>
            )}

            {/* KONTROL VOLUME & PLAYBACK */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6">
                
                {/* KONTROL VOLUME */}
                <div className="flex items-center gap-2 order-2 md:order-1 w-full md:w-auto justify-center md:justify-start">
                    <Volume2 size={16} className="md:w-5 md:h-5 text-gray-400" />
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => setVolume(parseInt(e.target.value))}
                        className="w-20 md:w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        style={{
                            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${volume}%, #374151 ${volume}%, #374151 100%)`
                        }}
                    />
                    <span className="text-xs text-gray-400 w-6 md:w-8">{volume}%</span>
                </div>
                
                {/* KONTROL UTAMA PLAYBACK - dengan scroll horizontal */}
                <div className="overflow-visible order-1 md:order-2 w-full md:w-auto">
                {/* ✅ UBAH overflow-x-auto menjadi overflow-visible */}
                  <div className="flex items-center justify-center gap-3 md:gap-6 min-w-max px-2">
                    <button 
                      onClick={toggleShuffle} 
                      disabled={isCurrentlyPlayingFromQueue}
                      className={`p-1 md:p-2 rounded hover:bg-gray-700 transition-opacity flex-shrink-0 ${
                        isCurrentlyPlayingFromQueue 
                          ? 'opacity-30 cursor-not-allowed' 
                          : isShuffled 
                            ? 'text-blue-500' 
                            : ''
                      }`}
                    >
                      <Shuffle size={16} className="md:w-5 md:h-5" />
                    </button>
                    
                    <button onClick={playPrevious} className="p-1 md:p-2 rounded hover:bg-gray-700 flex-shrink-0">
                      <SkipBack size={20} className="md:w-7 md:h-7" />
                    </button>
                    
                    <button onClick={togglePlay} className="p-3 md:p-4 bg-blue-600 rounded-full hover:bg-blue-700 hover:scale-105 transition-transform flex-shrink-0">
                      {isPlaying ? <Pause size={20} className="md:w-8 md:h-8" /> : <Play size={20} className="md:w-8 md:h-8" />}
                    </button>
                    
                    <button onClick={playNext} className="p-1 md:p-2 rounded hover:bg-gray-700 flex-shrink-0">
                      <SkipForward size={20} className="md:w-7 md:h-7" />
                    </button>
                    
                    <button 
                      onClick={toggleRepeat} 
                      className={`p-1 md:p-2 rounded hover:bg-gray-700 relative transition-opacity flex-shrink-0 ${
                        repeatMode !== 'off' ? 'text-blue-500' : ''
                      } ${
                        isCurrentlyPlayingFromQueue && repeatMode === 'off' 
                          ? 'opacity-50' 
                          : ''
                      }`}
                    >
                      <Repeat size={16} className="md:w-5 md:h-5" />
                      {repeatMode === 'one' && (
                        <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[8px] md:text-[10px] rounded-full w-3 h-3 md:w-4 md:h-4 flex items-center justify-center">
                          1
                        </span>
                      )}
                    </button>

                    {/* MENU KUALITAS VIDEO */}
                    <div className="relative quality-menu-container flex-shrink-0">
                      <button 
                        onClick={() => {
                          if (mode === 'audio') {
                            showNotification('⚠️ Kualitas hanya tersedia di mode video');
                            return;
                          }
                          if (!isPlayerReady) {
                            showNotification('⚠️ Player belum siap');
                            return;
                          }
                          setShowQualityMenu(!showQualityMenu);
                        }}
                        className={`p-1 md:p-2 rounded hover:bg-gray-700 transition-colors relative ${
                          showQualityMenu ? 'bg-gray-700' : ''
                        } ${mode === 'audio' || !isPlayerReady ? 'opacity-50' : ''}`}
                        title="Kualitas Video"
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          className="md:w-5 md:h-5"
                        >
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                          <line x1="12" y1="22.08" x2="12" y2="12"/>
                        </svg>
                        {currentQuality && currentQuality !== 'auto' && (
                          <span className="absolute -top-1 -right-1 bg-green-500 w-2 h-2 rounded-full"></span>
                        )}
                      </button>
                      
                      {/* ✅ PERBAIKAN: Hapus pengecekan mode dan isPlayerReady di sini */}
                      {showQualityMenu && (
                        <div className="absolute bottom-full mb-2 right-0 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-1 min-w-[140px] z-[9999] max-h-[300px] overflow-y-auto">
                          {/* ✅ UBAH z-50 menjadi z-[9999] */}
                          <div className="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-700 font-semibold">
                            Kualitas Video
                          </div>
                          
                          {/* Auto Quality */}
                          <button
                            onClick={() => changeQuality('auto')}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors flex items-center justify-between ${
                              currentQuality === 'auto' ? 'bg-gray-700 text-blue-400 font-semibold' : 'text-white'
                            }`}
                          >
                            <span>Auto</span>
                            {currentQuality === 'auto' && <span className="text-blue-400">✓</span>}
                          </button>
                          
                          {/* Available Qualities */}
                          {availableQualities.length > 0 ? (
                            availableQualities.map((quality) => {
                              const qualityLabels: Record<string, string> = {
                                'highres': '4K/8K',
                                'hd2160': '4K (2160p)',
                                'hd1440': '2K (1440p)',
                                'hd1080': 'Full HD (1080p)',
                                'hd720': 'HD (720p)',
                                'large': 'SD (480p)',
                                'medium': '360p',
                                'small': '240p',
                                'tiny': '144p'
                              };
                              
                              const isCurrentQuality = currentQuality === quality;
                              
                              return (
                                <button
                                  key={quality}
                                  onClick={() => changeQuality(quality)}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors flex items-center justify-between ${
                                    isCurrentQuality ? 'bg-gray-700 text-blue-400 font-semibold' : 'text-white'
                                  }`}
                                >
                                  <span>{qualityLabels[quality] || quality}</span>
                                  {isCurrentQuality && <span className="text-blue-400">✓</span>}
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-3 py-2 text-xs text-gray-500 italic">
                              Loading qualities...
                            </div>
                          )}
                          
                          {/* Info Footer */}
                          <div className="px-3 py-1.5 text-[10px] text-gray-500 border-t border-gray-700 mt-1">
                            <div>Current: {(() => {
                              const labels: Record<string, string> = {
                                'highres': '4K/8K', 'hd2160': '4K', 'hd1440': '2K',
                                'hd1080': '1080p', 'hd720': '720p', 'large': '480p',
                                'medium': '360p', 'small': '240p', 'tiny': '144p', 'auto': 'Auto'
                              };
                              return labels[currentQuality] || currentQuality;
                            })()}</div>
                            {preferredQuality !== 'auto' && (
                              <div className="text-green-400 mt-0.5">
                                Saved: {(() => {
                                  const labels: Record<string, string> = {
                                    'highres': '4K/8K', 'hd2160': '4K', 'hd1440': '2K',
                                    'hd1080': '1080p', 'hd720': '720p', 'large': '480p',
                                    'medium': '360p', 'small': '240p', 'tiny': '144p'
                                  };
                                  return labels[preferredQuality] || preferredQuality;
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={toggleFullscreen}
                      className={`p-1 md:p-2 rounded hover:bg-gray-700 transition-colors flex-shrink-0 ${
                        isFullscreen ? 'text-blue-500' : ''
                      }`}
                      title={isFullscreen ? 'Keluar dari Fullscreen' : 'Fullscreen'}
                    >
                      {isFullscreen ? <Minimize size={16} className="md:w-5 md:h-5" /> : <Maximize size={16} className="md:w-5 md:h-5" />}
                    </button>
                  </div>
                </div>
                
                <div className="hidden md:block w-40 order-3"> {/* Spacer agar kontrol di tengah */}</div>
            </div>
            
            {currentSong && (
              <div className="text-center text-[10px] md:text-sm text-gray-400 mt-2">
                <div className="truncate px-4">Now Playing: {currentSong.judul}</div>
                <div className="flex items-center justify-center gap-2 md:gap-4 mt-1 text-[8px] md:text-xs flex-wrap">
                  {isShuffled && <span className="text-blue-400 flex items-center gap-1"><Shuffle size={10} /> Shuffle</span>}
                  {repeatMode !== 'off' && <span className="text-blue-400 flex items-center gap-1"><Repeat size={10} /> {repeatMode === 'all' ? 'All' : 'One'}</span>}
                  {queue.length > 0 && <span className="text-green-400 flex items-center gap-1"><List size={10} /> {queue.length}</span>}
                  {isCurrentlyPlayingFromQueue && <span className="text-purple-400 flex items-center gap-1">▶️ Dari Antrian</span>}
                  {activePlaylistFilter && (
                    <span className="text-yellow-400 flex items-center gap-1">
                      🎯 Playlist Aktif
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Queue Sidebar */}
      {showQueue && (
        <>
          <div className="md:hidden fixed inset-0 bg-black bg-opacity-30 z-40 backdrop-blur-sm" onClick={() => setShowQueue(false)} />
          {/* Menggunakan h-auto max-h-[70dvh] untuk mobile agar responsif terhadap keyboard/browser bar */}
          <div className="fixed md:relative bottom-0 md:bottom-auto right-0 md:right-auto w-full md:w-80 h-[90dvh] md:h-full bg-gray-800 border-t md:border-t-0 md:border-l border-gray-700 z-50 rounded-t-2xl md:rounded-none flex flex-col">
            {/* Sticky Header */}
            <div className="flex-shrink-0 sticky top-0 bg-gray-800 z-10 p-4 pb-2 border-b border-gray-700 rounded-t-2xl md:rounded-none">
              <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-bold">📋 Antrian ({queue.length})</h2>
              <div className="flex gap-2">
                {queue.length > 0 && <button onClick={clearQueue} className="text-red-500 text-sm hover:bg-gray-700 p-1 rounded">🗑️ Kosongkan</button>}
                <button onClick={() => setShowQueue(false)} className="md:hidden text-gray-400 hover:bg-gray-700 p-1 rounded"><X size={20} /></button>
              </div>

              </div>
            </div>
            
            {/* Scrollable Queue Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2 queue-scrollbar">
              <div className="space-y-2">
              {queue.map((song, index) => (
                <div 
                  key={`${song.id}-${index}`} 
                  className={`p-2 rounded flex items-center gap-2 text-sm transition-colors ${currentSong?.id === song.id ? 'bg-blue-900 border-l-4 border-blue-500' : 'bg-gray-700'}`}
                >
                  <div className="text-xs text-gray-400 w-4 flex-shrink-0 text-center">{index + 1}</div>
                  
                  <div 
                    className="flex-1 cursor-pointer min-w-0" 
                    onClick={() => { 
                      // PERBAIKAN: Logika baru untuk handle klik lagu di antrian
                      if (currentSong?.id === song.id) {
                        // Lagu sama yang diklik
                        if (!isPlaying && isCurrentlyPlayingFromQueue) {
                          // Cek apakah ini lagu terakhir di antrian yang sudah selesai
                          const currentIndex = queue.findIndex(s => s.id === song.id);
                          const isLastSongInQueue = currentIndex === queue.length - 1;
                          
                          if (isLastSongInQueue && repeatMode !== 'all') {
                            // Lagu terakhir antrian yang sudah selesai -> mulai dari awal antrian
                            setCurrentSong(queue[0]);
                            setIsPlaying(true);
                            setIsCurrentlyPlayingFromQueue(true);
                            showNotification('🔄 Memutar ulang antrian dari awal');
                          } else {
                            // Lagu di tengah antrian yang dipause -> lanjutkan
                            setIsPlaying(true);
                            setIsCurrentlyPlayingFromQueue(true);
                          }
                        } else if (isPlaying) {
                          // Sedang playing -> pause
                          setIsPlaying(!isPlaying);
                          setIsCurrentlyPlayingFromQueue(true);
                        } else {
                          // Dari playlist yang tidak playing -> play lanjut
                          setIsPlaying(true);
                          setIsCurrentlyPlayingFromQueue(true);
                        }
                      } else {
                        // Lagu berbeda, ganti lagu dan play
                        setCurrentSong(song); 
                        setIsPlaying(true); 
                        setIsCurrentlyPlayingFromQueue(true); 
                      }
                    }}
                  >
                    <div className="font-semibold text-sm truncate">{song.judul}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {song.tahun && `${song.tahun} • `}
                      {song.added && `Added ${song.added}`}
                      {song.negara && ` • ${song.negara}`}
                    </div>
                  </div>
                  
                  <div className="flex gap-0 items-center flex-shrink-0">
                    <button 
                      onClick={() => moveQueueItem(index, index - 1)} 
                      disabled={index === 0} 
                      title="Pindah ke Atas"
                      className={`p-1 rounded transition-colors ${index === 0 ? 'text-gray-500 cursor-not-allowed' : 'hover:bg-gray-600 text-white'}`}
                    >
                      <ChevronUp size={16} />
                    </button>
                    
                    <button 
                      onClick={() => moveQueueItem(index, index + 1)} 
                      disabled={index === queue.length - 1} 
                      title="Pindah ke Bawah"
                      className={`p-1 rounded transition-colors ${index === queue.length - 1 ? 'text-gray-500 cursor-not-allowed' : 'hover:bg-gray-600 text-white'}`}
                    >
                      <ChevronDown size={16} />
                    </button>

                    <button 
                      onClick={() => removeFromQueue(index)} 
                      title="Hapus dari Antrian"
                      className="text-red-500 text-lg p-1 hover:bg-gray-600 rounded"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
      )}

      {/* GLOBAL STYLES (Penyesuaian Viewport untuk Mobile) */}
      <style>{`
        /* Memastikan tidak ada overflow horizontal di seluruh halaman */
        html, body, #__next {
            margin: 0;
            padding: 0;
            overflow-x: hidden; 
        }

        /* Kelas kustom untuk menyembunyikan player tanpa display: none; */
        .player-invisible {
            position: absolute;
            top: 0;
            left: 0;
            width: 1px;
            height: 1px;
            overflow: hidden;
            opacity: 0.01;
            z-index: -10;
        }

        /* Menggunakan unit Dynamic Viewport Height (dvh) untuk Mobile (<768px) */
        @media (max-width: 767px) {
            html, body {
                height: 100%;
            }
            /* Menargetkan container utama di mobile untuk menggunakan dvh */
            .h-screen {
                height: 100dvh;
            }
            /* Memastikan antrian mobile menggunakan dvh */
            .h-\\[90dvh\\] {
                height: 90dvh;
            }
        }

        /* Gaya Animasi & Range Input */
        @keyframes fade-in-out { 0% { opacity: 0; transform: scale(0.9); } 10% { opacity: 1; transform: scale(1); } 90% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(0.9); } }
        @keyframes pulse-slow { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.9; } }
        .animate-fade-in-out { animation: fade-in-out 3s ease-in-out; }
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
        input[type="range"] { height: 8px; }
        input[type="range"]::-webkit-slider-thumb { appearance: none; width: 16px; height: 16px; background: #3b82f6; border-radius: 50%; margin-top: -4px; position: relative; z-index: 10; }
        input[type="range"]::-webkit-slider-runnable-track { width: 100%; height: 8px; background: transparent; border-radius: 4px; }

        @keyframes pulse-bar { 
          0%, 100% { height: 60%; } 
          50% { height: 100%; } 
        }
        .animate-pulse-bar { 
          animation: pulse-bar 0.8s ease-in-out infinite; 
        }
        
        /* Warna custom untuk bg-gray-750 */
        .bg-gray-750 {
          background-color: #2d3748;
        }

        /* Aktifkan interaksi pada YouTube player */
        #youtube-player {
          pointer-events: auto;  /* ✅ User bisa klik kontrol YouTube */
        }

        #youtube-player iframe {
          pointer-events: auto;  /* ✅ Iframe bisa diinteraksi */
        }

        /* ===== CUSTOM SCROLLBAR STYLES ===== */

        /* Scrollbar untuk daftar lagu (elegan dengan indikator) */
        .song-list-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .song-list-scrollbar::-webkit-scrollbar-track {
          background: rgba(55, 65, 81, 0.3);
          border-radius: 10px;
        }

        .song-list-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #3b82f6, #8b5cf6);
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: content-box;
        }

        .song-list-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #2563eb, #7c3aed);
          background-clip: content-box;
        }

        /* Scrollbar untuk playlist filter (HIDDEN - tanpa scrollbar visual) */
        .playlist-filter-scrollbar::-webkit-scrollbar {
          height: 0px;
          width: 0px;
        }

        .playlist-filter-scrollbar {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }

        /* Scrollbar untuk antrian (elegan) */
        .queue-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .queue-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 10px;
        }

        .queue-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.6);
          border-radius: 10px;
        }

        .queue-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.8);
        }

        /* Scrollbar untuk nav controls (hidden) */
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}