'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, List, ChevronLeft, ChevronRight, Music, Search, X, Volume2, Video, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

// =========================================================
// KOREKSI TYPEDEFS DENGAN DECLARATION MERGING
// =========================================================
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    setInterval: (handler: TimerHandler, timeout?: number | undefined, ...args: any[]) => number;
    clearInterval: (handle: number | undefined) => void;
  }
}

// Interface Song
interface Song {
  id: number;
  judul: string;
  link: string;
  tahun: string;
  playlist: string[];
  added: string;
  negara?: string; // Tambahan field negara
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
        
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }

        window.onYouTubeIframeAPIReady = () => {
          console.log('YouTube API Ready');
        };

        fetchSongs(initialQueue); 
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

  const fetchSongs = async (initialQueue: Song[]) => {
    try {
      const response = await fetch('/api/music');
      const data: Song[] = await response.json();
      
      // Tambahkan field negara ke setiap song berdasarkan playlist
      const songsWithCountry = data.map(song => {
        const countryPlaylist = song.playlist.find(p => {
          const num = parseInt(p);
          return num >= 9 && num <= 203;
        });
        return {
          ...song,
          negara: countryPlaylist ? getPlaylistName(countryPlaylist) : undefined
        };
      });
      
      setSongs(songsWithCountry);
      if (initialQueue.length > 0) {
        const songInList = songsWithCountry.find(s => s.id === initialQueue[0].id);
        setCurrentSong(songInList || songsWithCountry[0] || null);
        if (songInList) {
            setIsCurrentlyPlayingFromQueue(true);
        }
      } else if (!currentSong && songsWithCountry.length > 0) {
        setCurrentSong(songsWithCountry[0]);
        setIsCurrentlyPlayingFromQueue(false);
      }
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
          controls: 1, 
          disablekb: 0,
          fs: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: playerOrigin 
        },
        events: {
          onReady: (event: any) => {
            setIsPlayerReady(true); 
            event.target.setVolume(volume);
            
            setDuration(event.target.getDuration()); 
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
            } else if (event.data === 1) {
              setIsPlaying(true);
            } else if (event.data === 2) {
              setIsPlaying(false);
            }
          },
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
        playerRef.current.playVideo();
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
    if (repeatMode === 'one') {
      playerRef.current?.seekTo(0);
      playerRef.current?.playVideo();
    } else if (repeatMode === 'all' || isCurrentlyPlayingFromQueue || queue.length > 0) {
      playNext();
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
        return sorted.sort((a, b) => a.judul.localeCompare(b.judul));
      case 'judul-desc':
        return sorted.sort((a, b) => b.judul.localeCompare(a.judul));
      case 'tahun-asc':
        return sorted.sort((a, b) => a.tahun.localeCompare(b.tahun));
      case 'tahun-desc':
        return sorted.sort((a, b) => b.tahun.localeCompare(a.tahun));
      case 'added-asc':
        return sorted.sort((a, b) => {
          const dateA = parseIndonesianDate(a.added);
          const dateB = parseIndonesianDate(b.added);
          return dateA.getTime() - dateB.getTime();
        });
      case 'added-desc':
        return sorted.sort((a, b) => {
          const dateA = parseIndonesianDate(a.added);
          const dateB = parseIndonesianDate(b.added);
          return dateB.getTime() - dateA.getTime();
        });
      default:
        return sorted;
    }
  };

  // --- FILTERING DAN SORTING DENGAN useMemo ---
  const filteredSongs = useMemo(() => {
    const filtered = songs.filter(song => {
      // Filter berdasarkan grup playlist (kombinasi AND antar grup)
      const matchesNada = selectedPlaylists.nada === null || song.playlist.includes(selectedPlaylists.nada);
      const matchesMood = selectedPlaylists.mood === null || song.playlist.includes(selectedPlaylists.mood);
      const matchesJenis = selectedPlaylists.jenis === null || song.playlist.includes(selectedPlaylists.jenis);
      const matchesLikedBy = selectedPlaylists.likedBy === null || song.playlist.includes(selectedPlaylists.likedBy);
      
      const matchesSearch = searchQuery === '' || 
        song.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.tahun.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.added.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (song.negara && song.negara.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesLikedBy && matchesNada && matchesMood && matchesJenis && matchesSearch;
    });

    return sortSongs(filtered, sortCriteria);
  }, [songs, selectedPlaylists, searchQuery, sortCriteria]);

  // Daftar playlist yang ditampilkan sebagai filter (hanya kategori utama)
  const playlistGroups = {
    likedBy: [
      { id: 'b', name: 'Taufiq' },
      { id: 'c', name: 'Nadzar' },
    ],
    nada: [
      { id: '1', name: 'Nada Tinggi' },
      { id: '2', name: 'Nada Cepat' },
      { id: '3', name: 'Nada Santai' },
    ],
    mood: [
      { id: '4', name: 'Sedih' },
      { id: '5', name: 'Bahagia' },
      { id: '6', name: 'Adrenalin' },
      { id: 'a', name: 'Normal' },
      { id: 'd', name: 'Rap' },
    ],
    jenis: [
      { id: '7', name: 'Nyanyiable' },
      { id: '8', name: 'Hearingable' },
    ],
  };
  
  // Mapping nomor playlist ke nama
  const playlistNames: { [key: string]: string } = { 
    'b': 'Taufiq',
    'c': 'Nadzar',

    '1': 'Nada Tinggi',
    '2': 'Nada Cepat',
    '3': 'Nada Santai',

    '4': 'Sedih',
    '5': 'Bahagia',
    '6': 'Adrenalin',
    'a' : "Normal",
    'd' : "Rap",

    '7': 'Nyanyiable',
    '8': 'Hearingable',

    // ... negara-negara

    // --- Asia Tenggara, Timur, dan Selatan ---
    '9': 'Indonesia',
    '10': 'Korea Selatan',
    '11': 'Jepang',
    '12': 'Barat (Kategori Umum)',
    '13': 'Tiongkok',
    '14': 'Filipina',
    '15': 'Vietnam',
    '16': 'Thailand',
    '17': 'Malaysia',
    '18': 'Singapura',
    '19': 'Myanmar',
    '20': 'Kamboja',
    '21': 'Laos',
    '22': 'Brunei',
    '23': 'Timor Leste',
    '24': 'Korea Utara',
    '25': 'India',
    '26': 'Pakistan',
    '27': 'Bangladesh',
    '28': 'Nepal',
    '29': 'Sri Lanka',
    '30': 'Maladewa',
    '31': 'Bhutan',
    
    // --- Asia Tengah dan Barat (Timur Tengah) ---
    '32': 'Afganistan',
    '33': 'Kazakhstan',
    '34': 'Uzbekistan',
    '35': 'Turkmenistan',
    '36': 'Kirgistan',
    '37': 'Tajikistan',
    '38': 'Iran',
    '39': 'Irak',
    '40': 'Arab Saudi',
    '41': 'Uni Emirat Arab',
    '42': 'Qatar',
    '43': 'Bahrain',
    '44': 'Kuwait',
    '45': 'Oman',
    '46': 'Yaman',
    '47': 'Suriah',
    '48': 'Yordania',
    '49': 'Lebanon',
    '50': 'Israel',
    '51': 'Palestina (Negara pengamat PBB)',
    '52': 'Turki',
    '53': 'Siprus',
    '54': 'Georgia',
    '55': 'Armenia',
    '56': 'Azerbaijan',
    
    // --- Eropa Utara dan Barat ---
    '57': 'Rusia',
    '58': 'Jerman',
    '59': 'Prancis',
    '60': 'Inggris Raya',
    '61': 'Italia',
    '62': 'Spanyol',
    '63': 'Belanda',
    '64': 'Belgia',
    '65': 'Luksemburg',
    '66': 'Swiss',
    '67': 'Austria',
    '68': 'Irlandia',
    '69': 'Portugal',
    '70': 'Norwegia',
    '71': 'Swedia',
    '72': 'Finlandia',
    '73': 'Islandia',
    '74': 'Denmark',
    '75': 'Estonia',
    '76': 'Latvia',
    '77': 'Lituania',

    // --- Eropa Selatan, Timur, dan Balkan ---
    '78': 'Polandia',
    '79': 'Ceko',
    '80': 'Slowakia',
    '81': 'Hungaria',
    '82': 'Rumania',
    '83': 'Bulgaria',
    '84': 'Yunani',
    '85': 'Albania',
    '86': 'Kroasia',
    '87': 'Serbia',
    '88': 'Bosnia dan Herzegovina',
    '89': 'Montenegro',
    '90': 'Makedonia Utara',
    '91': 'Slovenia',
    '92': 'Malta',
    '93': 'San Marino',
    '94': 'Vatikan',
    '95': 'Monako',
    '96': 'Andorra',
    '97': 'Liechtenstein',
    '98': 'Moldova',
    '99': 'Ukraina',
    '100': 'Belarus',

    // --- Amerika Utara dan Tengah ---
    '101': 'Amerika Serikat',
    '102': 'Kanada',
    '103': 'Meksiko',
    '104': 'Guatemala',
    '105': 'Honduras',
    '106': 'El Salvador',
    '107': 'Nikaragua',
    '108': 'Kosta Rika',
    '109': 'Panama',
    '110': 'Belize',

    // --- Karibia ---
    '111': 'Kuba',
    '112': 'Haiti',
    '113': 'Republik Dominika',
    '114': 'Jamaika',
    '115': 'Trinidad dan Tobago',
    '116': 'Bahama',
    '117': 'Barbados',
    '118': 'Grenada',
    '119': 'Saint Vincent dan Grenadine',
    '120': 'Saint Lucia',
    '121': 'Saint Kitts dan Nevis',
    '122': 'Antigua dan Barbuda',
    '123': 'Dominika',

    // --- Amerika Selatan ---
    '124': 'Brasil',
    '125': 'Argentina',
    '126': 'Kolombia',
    '127': 'Peru',
    '128': 'Cile',
    '129': 'Ekuador',
    '130': 'Venezuela',
    '131': 'Bolivia',
    '132': 'Paraguay',
    '133': 'Uruguay',
    '134': 'Guyana',
    '135': 'Suriname',

    // --- Afrika Utara ---
    '136': 'Mesir',
    '137': 'Libya',
    '138': 'Tunisia',
    '139': 'Aljazair',
    '140': 'Maroko',
    '141': 'Sudan',
    '142': 'Sudan Selatan',
    '143': 'Mauritania',

    // --- Afrika Barat ---
    '144': 'Nigeria',
    '145': 'Ghana',
    '146': 'Pantai Gading',
    '147': 'Senegal',
    '148': 'Mali',
    '149': 'Burkina Faso',
    '150': 'Niger',
    '151': 'Gambia',
    '152': 'Guinea',
    '153': 'Guinea-Bissau',
    '154': 'Sierra Leone',
    '155': 'Liberia',
    '156': 'Togo',
    '157': 'Benin',
    '158': 'Tanjung Verde',

    // --- Afrika Tengah ---
    '159': 'Kamerun',
    '160': 'Republik Demokratik Kongo',
    '161': 'Republik Kongo',
    '162': 'Afrika Tengah',
    '163': 'Chad',
    '164': 'Gabon',
    '165': 'Guinea Khatulistiwa',
    '166': 'Sao Tome dan Principe',

    // --- Afrika Timur ---
    '167': 'Etiopia',
    '168': 'Kenya',
    '169': 'Tanzania',
    '170': 'Uganda',
    '171': 'Rwanda',
    '172': 'Burundi',
    '173': 'Somalia',
    '174': 'Jibuti',
    '175': 'Eritrea',
    '176': 'Komoro',
    '177': 'Seychelles',
    '178': 'Madagaskar',
    '179': 'Mauritius',
    '180': 'Mozambik',

    // --- Afrika Selatan ---
    '181': 'Afrika Selatan',
    '182': 'Zimbabwe',
    '183': 'Zambia',
    '184': 'Angola',
    '185': 'Namibia',
    '186': 'Botswana',
    '187': 'Lesotho',
    '188': 'Eswatini (Swaziland)',
    '189': 'Malawi',

    // --- Oseania dan Kepulauan Pasifik ---
    '190': 'Australia',
    '191': 'Selandia Baru',
    '192': 'Papua Nugini',
    '193': 'Fiji',
    '194': 'Samoa',
    '195': 'Tonga',
    '196': 'Vanuatu',
    '197': 'Kepulauan Solomon',
    '198': 'Kiribati',
    '199': 'Tuvalu',
    '200': 'Palau',
    '201': 'Mikronesia',
    '202': 'Kepulauan Marshall',
    '203': 'Nauru',
    // ... tambahkan semua mapping hingga 203 sesuai dengan data Anda
  };

  // Helper function untuk convert playlist number ke nama
  const getPlaylistName = (playlistNumber: string): string => {
    return playlistNames[playlistNumber] || playlistNumber;
  };

  const togglePlaylistSelection = (groupKey: 'nada' | 'mood' | 'jenis' | 'likedBy', playlistId: string) => {
    setSelectedPlaylists(prev => ({
      ...prev,
      [groupKey]: prev[groupKey] === playlistId ? null : playlistId
    }));
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

  const togglePlay = () => setIsPlaying(!isPlaying);

  const playNext = () => {
    if (!currentSong) return;
    
    if (isCurrentlyPlayingFromQueue && queue.length > 0) {
      const currentIndex = queue.findIndex(s => s.id === currentSong.id);
      if (currentIndex !== -1) {
        const nextIndex = (currentIndex + 1) % queue.length;
        setCurrentSong(queue[nextIndex]);
        setIsPlaying(true);
        setIsCurrentlyPlayingFromQueue(true); 
        return; 
      } 
      setIsCurrentlyPlayingFromQueue(false);
    }

    let playQueue = (isShuffled && shuffledOrder.length > 0) ? shuffledOrder : filteredSongs;
    if (playQueue.length === 0) { setIsPlaying(false); return; }
    
    const currentIndex = playQueue.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % playQueue.length;
    setCurrentSong(playQueue[nextIndex]);
    setIsPlaying(true);
    setIsCurrentlyPlayingFromQueue(false); 
  };

  const playPrevious = () => {
    if (!currentSong) return;
    
    if (isCurrentlyPlayingFromQueue && queue.length > 0) {
      const currentIndex = queue.findIndex(s => s.id === currentSong.id);
      if (currentIndex !== -1) {
        const prevIndex = currentIndex === 0 ? queue.length - 1 : currentIndex - 1;
        setCurrentSong(queue[prevIndex]);
        setIsPlaying(true);
        setIsCurrentlyPlayingFromQueue(true); 
        return; 
      }
      setIsCurrentlyPlayingFromQueue(false);
    }
    
    let playQueue = (isShuffled && shuffledOrder.length > 0) ? shuffledOrder : filteredSongs;
    if (playQueue.length === 0) { setIsPlaying(false); return; }
    
    const currentIndex = playQueue.findIndex(s => s.id === currentSong.id);
    const prevIndex = currentIndex === 0 ? playQueue.length - 1 : currentIndex - 1;
    setCurrentSong(playQueue[prevIndex]);
    setIsPlaying(true);
    setIsCurrentlyPlayingFromQueue(false);
  };

  const toggleShuffle = () => {
    if (!isShuffled) {
      setRepeatMode('off');
      const playQueue = isCurrentlyPlayingFromQueue && queue.length > 0 ? queue : filteredSongs; 
      let songsToShuffle = [...playQueue.filter(s => s.id !== currentSong?.id)];
      const shuffled = songsToShuffle.sort(() => Math.random() - 0.5);
      setShuffledOrder(currentSong ? [currentSong, ...shuffled] : shuffled);
      setIsShuffled(true);
      showNotification('🔀 Shuffle diaktifkan');
    } else {
      setShuffledOrder([]);
      setIsShuffled(false);
      showNotification('🔀 Shuffle dimatikan');
    }
  };

  const toggleRepeat = () => {
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
    const newMode = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
    if (newMode !== 'off' && isShuffled) {
      setIsShuffled(false);
      setShuffledOrder([]);
    }
    setRepeatMode(newMode);
    const msgs = { off: '🔁 Repeat dimatikan', all: '🔁 Repeat semua', one: '🔁 Repeat lagu ini' };
    showNotification(msgs[newMode]);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseInt(e.target.value, 10);
    setCurrentTime(seekTime);
    if (playerRef.current && isPlayerReady) {
      playerRef.current.seekTo(seekTime, true);
    }
  };

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
    setIsSidebarOpen(!isSidebarOpen);
    setUserClosedSidebar(isSidebarOpen); 
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
        <div className="p-4 h-full">
          <button onClick={() => { setIsSidebarOpen(false); setUserClosedSidebar(true); }} className="md:hidden absolute top-4 right-4 p-2 hover:bg-gray-700 rounded"><X size={24} /></button>
          <h2 className="text-xl font-bold mb-4">🎵 Music Playlist</h2>
          
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Cari lagu..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-10 py-2 bg-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={18} /></button>}
          </div>

          <div className="mb-4 space-y-3">
          {/* Header dengan tombol clear */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-400">Filter Playlist</label>
            {hasActiveFilters() && (
              <button 
                onClick={clearAllFilters}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <X size={12} /> Clear All
              </button>
            )}
          </div>

          {/* Grup Liked by - DIPINDAHKAN KE ATAS */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Liked by</label>
            <div className="flex gap-2 flex-wrap">
              {playlistGroups.likedBy.map(pl => (
                <button 
                  key={pl.id} 
                  onClick={() => togglePlaylistSelection('likedBy', pl.id)} 
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    selectedPlaylists.likedBy === pl.id 
                      ? 'bg-pink-600 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {pl.name}
                </button>
              ))}
            </div>
          </div>

          {/* Grup Nada */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nada</label>
              <div className="flex gap-2 flex-wrap">
                {playlistGroups.nada.map(pl => (
                  <button 
                    key={pl.id} 
                    onClick={() => togglePlaylistSelection('nada', pl.id)} 
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${
                      selectedPlaylists.nada === pl.id 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    {pl.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Grup Mood */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Mood</label>
              <div className="flex gap-2 flex-wrap">
                {playlistGroups.mood.map(pl => (
                  <button 
                    key={pl.id} 
                    onClick={() => togglePlaylistSelection('mood', pl.id)} 
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${
                      selectedPlaylists.mood === pl.id 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    {pl.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Grup Jenis */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Jenis</label>
              <div className="flex gap-2 flex-wrap">
                {playlistGroups.jenis.map(pl => (
                  <button 
                    key={pl.id} 
                    onClick={() => togglePlaylistSelection('jenis', pl.id)} 
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${
                      selectedPlaylists.jenis === pl.id 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    {pl.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Info filter aktif */}
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

          <div className="space-y-2 pb-4"> 
            {filteredSongs.length === 0 ? (
              <div className="text-center text-gray-400 py-8"><Music size={48} className="mx-auto mb-4 opacity-50" /><p className="text-sm">Tidak ada lagu</p></div>
            ) : (
              filteredSongs.map((song) => {
                // Cari nama negara dari playlist 9-203
                const countryPlaylist = song.playlist.find(p => {
                  const num = parseInt(p);
                  return num >= 9 && num <= 203;
                });
                const countryName = countryPlaylist ? getPlaylistName(countryPlaylist) : null;

                return (
                  <div key={song.id} className={`p-3 rounded flex items-center justify-between gap-3 hover:bg-gray-700 ${currentSong?.id === song.id ? 'bg-gray-700 border-l-4 border-blue-500' : ''}`}>
                    <div 
                      onClick={() => { 
                        setCurrentSong(song); 
                        setIsPlaying(true); 
                        setIsCurrentlyPlayingFromQueue(false); 
                        if (window.innerWidth < 768) { 
                          setIsSidebarOpen(false); 
                          setUserClosedSidebar(true); 
                        } 
                      }} 
                      className="flex-1 cursor-pointer min-w-0"
                    >
                      <div className="font-semibold text-sm truncate">{song.judul}</div>
                      <div className="text-xs text-gray-400 truncate">
                          {song.tahun} • Added {song.added}{countryName && ` • ${countryName}`}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); addToQueue(song); }} 
                      className={`flex-shrink-0 ${queue.some(q => q.id === song.id) ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white p-2 rounded-full transition-colors`}
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

        {/* Player Area: overflow-y-auto untuk mengatasi layar kecil vertical space */}
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 overflow-hidden relative">
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
                  <p className="text-gray-400 text-xs md:text-sm">{currentSong.tahun} • Added {currentSong.added}</p>
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
                <p className="text-gray-400 text-sm md:text-lg mb-4">{currentSong.tahun} • Added {currentSong.added}</p>
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

        {/* Controls */}
        <div className="bg-gray-800 p-3 md:p-6 flex-shrink-0">
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
                
                {/* KONTROL UTAMA PLAYBACK */}
                <div className="flex items-center justify-center gap-3 md:gap-6 order-1 md:order-2">
                    <button onClick={toggleShuffle} className={`p-1 md:p-2 rounded hover:bg-gray-700 ${isShuffled ? 'text-blue-500' : ''}`}><Shuffle size={16} className="md:w-5 md:h-5" /></button>
                    <button onClick={playPrevious} className="p-1 md:p-2 rounded hover:bg-gray-700"><SkipBack size={20} className="md:w-7 md:h-7" /></button>
                    <button onClick={togglePlay} className="p-3 md:p-4 bg-blue-600 rounded-full hover:bg-blue-700 hover:scale-105 transition-transform">{isPlaying ? <Pause size={20} className="md:w-8 md:h-8" /> : <Play size={20} className="md:w-8 md:h-8" />}</button>
                    <button onClick={playNext} className="p-1 md:p-2 rounded hover:bg-gray-700"><SkipForward size={20} className="md:w-7 md:h-7" /></button>
                    <button onClick={toggleRepeat} className={`p-1 md:p-2 rounded hover:bg-gray-700 relative ${repeatMode !== 'off' ? 'text-blue-500' : ''}`}><Repeat size={16} className="md:w-5 md:h-5" />{repeatMode === 'one' && <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[8px] md:text-[10px] rounded-full w-3 h-3 md:w-4 md:h-4 flex items-center justify-center">1</span>}</button>
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
          <div className="fixed md:relative bottom-0 md:bottom-auto right-0 md:right-auto w-full md:w-80 h-[90dvh] md:h-full bg-gray-800 p-4 overflow-y-auto border-t md:border-t-0 md:border-l border-gray-700 z-50 rounded-t-2xl md:rounded-none">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-lg md:text-xl font-bold">📋 Antrian ({queue.length})</h2>
              <div className="flex gap-2">
                {queue.length > 0 && <button onClick={clearQueue} className="text-red-500 text-sm hover:bg-gray-700 p-1 rounded">🗑️ Kosongkan</button>}
                <button onClick={() => setShowQueue(false)} className="md:hidden text-gray-400 hover:bg-gray-700 p-1 rounded"><X size={20} /></button>
              </div>
            </div>
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
                      setCurrentSong(song); 
                      setIsPlaying(true); 
                      setIsCurrentlyPlayingFromQueue(true); 
                    }}
                  >
                    <div className="font-semibold text-sm truncate">{song.judul}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {song.tahun} • Added {song.added}
                      {(() => {
                        const countryPlaylist = song.playlist.find(p => {
                          const num = parseInt(p);
                          return num >= 9 && num <= 203;
                        });
                        const countryName = countryPlaylist ? getPlaylistName(countryPlaylist) : null;
                        return countryName ? ` • ${countryName}` : '';
                      })()}
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
        </>
      )}

      {/* GLOBAL STYLES (Penyesuaian Viewport untuk Mobile) */}
      <style jsx global>{`
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
            .h-\[90dvh\] {
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
      `}</style>
    </div>
  );
}