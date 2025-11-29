'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, List, ChevronLeft, ChevronRight, Music, Search, X, Volume2, Video } from 'lucide-react';

// YouTube Player API Types
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
}

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
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('all');
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
    if (!mounted || userClosedSidebar || typeof window === 'undefined') return; 
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
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
      setSongs(data);
      if (initialQueue.length > 0) {
        const songInList = data.find(s => s.id === initialQueue[0].id);
        setCurrentSong(songInList || data[0] || null);
      } else if (!currentSong && data.length > 0) {
        setCurrentSong(data[0]);
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
            
            if (isPlaying) {
              event.target.playVideo();
            }

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


  // Effect terpisah untuk volume (Sinkronisasi Volume)
  useEffect(() => {
    if (playerRef.current && isPlayerReady && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(volume);
    }
  }, [volume, isPlayerReady]); // Efek ini memastikan volume sinkron ke YouTube Player

  // Effect terpisah untuk Play/Pause
  useEffect(() => {
    if (!playerRef.current || !isPlayerReady) return; 
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
    } else if (repeatMode === 'all' || queue.length > 0) {
      playNext();
    } else {
      setIsPlaying(false);
    }
  };

  const filteredSongs = songs.filter(song => {
    const matchesPlaylist = selectedPlaylist === 'all' || song.playlist.includes(selectedPlaylist);
    const matchesSearch = searchQuery === '' || 
      song.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.tahun.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPlaylist && matchesSearch;
  });

  const playlists = ['all', 'MYLK', 'CB', 'SED', 'NATI'];

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  const playNext = () => {
    if (!currentSong) return;
    
    // Prioritas 1: Lanjut di Queue
    if (queue.length > 0) {
      const currentIndex = queue.findIndex(s => s.id === currentSong.id);
      if (currentIndex !== -1) {
        const nextIndex = (currentIndex + 1) % queue.length;
        setCurrentSong(queue[nextIndex]);
        setIsPlaying(true);
        return; 
      } 
    }

    // Prioritas 2: Lanjut di Filtered/Shuffled List
    let playQueue = (isShuffled && shuffledOrder.length > 0) ? shuffledOrder : filteredSongs;
    if (playQueue.length === 0) { setIsPlaying(false); return; }
    
    const currentIndex = playQueue.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % playQueue.length;
    setCurrentSong(playQueue[nextIndex]);
    setIsPlaying(true);
  };

  const playPrevious = () => {
    if (!currentSong) return;
    
    // Prioritas 1: Mundur di Queue
    if (queue.length > 0) {
      const currentIndex = queue.findIndex(s => s.id === currentSong.id);
      if (currentIndex !== -1) {
        // Logika mundur di queue (looping dari belakang ke depan)
        const prevIndex = currentIndex === 0 ? queue.length - 1 : currentIndex - 1;
        setCurrentSong(queue[prevIndex]);
        setIsPlaying(true);
        return; 
      }
    }
    // Prioritas 2: Mundur di Filtered/Shuffled List (Jika tidak ada di queue)
    let playQueue = (isShuffled && shuffledOrder.length > 0) ? shuffledOrder : filteredSongs;
    if (playQueue.length === 0) { setIsPlaying(false); return; }
    
    const currentIndex = playQueue.findIndex(s => s.id === currentSong.id);
    const prevIndex = currentIndex === 0 ? playQueue.length - 1 : currentIndex - 1;
    setCurrentSong(playQueue[prevIndex]);
    setIsPlaying(true);
  };

  const toggleShuffle = () => {
    if (!isShuffled) {
      setRepeatMode('off');
      const playQueue = queue.length > 0 ? queue : filteredSongs;
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
    setQueue(prev => [...prev, song]);
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

  if (!mounted) return <div className="h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-900 text-white relative" suppressHydrationWarning={true}>
      
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-70 backdrop-blur-md px-8 py-4 rounded-2xl shadow-2xl z-50 animate-fade-in-out">
          <p className="font-medium">{notification}</p>
        </div>
      )}

      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'translate-x-0 md:w-80' : '-translate-x-full md:w-0'} fixed md:relative inset-0 md:inset-auto transition-all duration-300 bg-gray-800 overflow-hidden z-40`}>
        <div className="p-4 h-full overflow-y-auto">
          <button onClick={() => { setIsSidebarOpen(false); setUserClosedSidebar(true); }} className="md:hidden absolute top-4 right-4 p-2 hover:bg-gray-700 rounded"><X size={24} /></button>
          <h2 className="text-xl font-bold mb-4">🎵 Music Playlist</h2>
          
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Cari lagu..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-10 py-2 bg-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={18} /></button>}
          </div>

          <div className="flex gap-2 mb-4 flex-wrap">
            {playlists.map(pl => (
              <button key={pl} onClick={() => setSelectedPlaylist(pl)} className={`px-3 py-1 rounded-full text-sm ${selectedPlaylist === pl ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>{pl === 'all' ? 'All' : pl}</button>
            ))}
          </div>

          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pb-20 md:pb-0">
            {filteredSongs.length === 0 ? (
              <div className="text-center text-gray-400 py-8"><Music size={48} className="mx-auto mb-4 opacity-50" /><p className="text-sm">Tidak ada lagu</p></div>
            ) : (
              filteredSongs.map((song) => (
                <div key={song.id} className={`p-3 rounded flex items-center justify-between gap-3 hover:bg-gray-700 ${currentSong?.id === song.id ? 'bg-gray-700 border-l-4 border-blue-500' : ''}`}>
                  <div onClick={() => { setCurrentSong(song); setIsPlaying(true); if (window.innerWidth < 768) { setIsSidebarOpen(false); setUserClosedSidebar(true); }}} className="flex-1 cursor-pointer min-w-0">
                    <div className="font-semibold text-sm truncate">{song.judul}</div>
                    <div className="text-xs text-gray-400 truncate">{song.tahun}</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); addToQueue(song); }} className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors"><List size={16} /></button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {isSidebarOpen && <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30" onClick={() => { setIsSidebarOpen(false); setUserClosedSidebar(true); }} />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 p-3 md:p-4 flex items-center justify-between">
          <button onClick={handleSidebarToggle} className="p-2 hover:bg-gray-700 rounded">
            {isSidebarOpen ? <ChevronLeft size={20} className="md:w-6 md:h-6" /> : <ChevronRight size={20} className="md:w-6 md:h-6" />}
          </button>
          
          <div className="flex gap-2 items-center">
            <button onClick={() => { setMode('audio'); showNotification('🎵 Mode Audio'); }} className={`px-2 md:px-4 py-2 rounded flex items-center gap-1 md:gap-2 text-sm transition-colors ${mode === 'audio' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
              <Music size={16} className="md:w-5 md:h-5" /><span className="hidden md:inline">Audio</span>
            </button>
            <button onClick={() => { setMode('video'); showNotification('🎬 Mode Video'); }} className={`px-2 md:px-4 py-2 rounded flex items-center gap-1 md:gap-2 text-sm transition-colors ${mode === 'video' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
              <Video size={16} className="md:w-5 md:h-5" /><span className="hidden md:inline">Video</span>
            </button>
          </div>

          <button onClick={() => setShowQueue(!showQueue)} className="p-2 hover:bg-gray-700 rounded relative">
            <List size={20} className="md:w-6 md:h-6" />
            {queue.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{queue.length}</span>}
          </button>
        </div>

        {/* Player Area (MODIFIED) */}
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 md:p-8 overflow-hidden relative">
          {currentSong ? (
            <>
              {/* --- CONTAINER 1: VIDEO PLAYER (MODIFIED CLASS) --- */}
              <div 
                // MENGHAPUS max-w-4xl dan MENGUBAH w-full menjadi flex-1 untuk mengisi ruang horizontal dan vertikal
                // Menambahkan 'h-full flex flex-col' untuk mengelola ruang secara fleksibel
                className={`flex-1 h-full flex flex-col items-center justify-center transition-all duration-300 ${mode === 'audio' ? 'hidden' : 'block'}`}
              >
                {/* Div ini sekarang akan mengisi ruang yang tersedia (flex-1) di Main Content */}
                <div className="w-full h-full bg-black rounded-lg overflow-hidden relative" style={{ flex: '1 1 auto' }}>
                  {/* Container video (tinggi dan lebar 100% dari parent-nya) */}
                  <div id="youtube-player" className="w-full h-full"></div>
                </div>
                <div className="mt-4 text-center flex-shrink-0">
                  <h2 className="text-xl md:text-2xl font-bold">{currentSong.judul}</h2>
                  <p className="text-gray-400 text-sm md:text-base">{currentSong.tahun}</p>
                </div>
              </div>

              {/* --- CONTAINER 2: AUDIO UI (COVER ART) --- */}
              <div 
                className={`text-center max-w-md w-full transition-all duration-300 ${mode === 'video' ? 'hidden' : 'block'}`}
              >
                <div className="w-48 h-48 md:w-64 md:h-64 mx-auto bg-gradient-to-br from-purple-600 via-pink-500 to-blue-600 rounded-full flex items-center justify-center mb-6 md:mb-8 shadow-2xl animate-pulse-slow">
                  <Music size={80} className="md:w-[120px] md:h-[120px] text-white" />
                </div>
                <h1 className="text-xl md:text-3xl font-bold mb-2 px-4">{currentSong.judul}</h1>
                <p className="text-gray-400 text-sm md:text-lg mb-6">{currentSong.tahun}</p>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400"><Music size={80} className="mx-auto mb-4 opacity-50" /><p>Pilih lagu dari playlist</p></div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-4 md:p-6 flex-shrink-0">
          <div className="max-w-4xl mx-auto">
            
            {/* Timeline */}
            {currentSong && (
                <div className="flex items-center gap-3 mb-4 text-xs md:text-sm">
                    <span className="text-gray-400 w-10 text-right">{formatTime(currentTime)}</span>
                    <input type="range" min="0" max={duration} value={currentTime} onChange={handleSeek} className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" disabled={!isPlayerReady || duration === 0} style={{ background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #374151 ${(currentTime / duration) * 100}%, #374151 100%)` }} />
                    <span className="text-gray-400 w-10 text-left">{formatTime(duration)}</span>
                </div>
            )}

            {/* KONTROL VOLUME BARU (SELAU TERLIHAT) */}
            <div className="flex items-center justify-center gap-6 mb-4">
                <div className="flex items-center gap-3">
                    <Volume2 size={20} className="text-gray-400" />
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => setVolume(parseInt(e.target.value))}
                        className="w-24 md:w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        style={{
                            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${volume}%, #374151 ${volume}%, #374151 100%)`
                        }}
                    />
                    <span className="text-sm text-gray-400 w-8">{volume}%</span>
                </div>
                
                {/* KONTROL UTAMA PLAYBACK */}
                <div className="flex items-center justify-center gap-3 md:gap-6">
                    <button onClick={toggleShuffle} className={`p-2 rounded hover:bg-gray-700 ${isShuffled ? 'text-blue-500' : ''}`}><Shuffle size={18} className="md:w-5 md:h-5" /></button>
                    <button onClick={playPrevious} className="p-2 rounded hover:bg-gray-700"><SkipBack size={24} className="md:w-7 md:h-7" /></button>
                    <button onClick={togglePlay} className="p-3 md:p-4 bg-blue-600 rounded-full hover:bg-blue-700 hover:scale-105 transition-transform">{isPlaying ? <Pause size={28} className="md:w-8 md:h-8" /> : <Play size={28} className="md:w-8 md:h-8" />}</button>
                    <button onClick={playNext} className="p-2 rounded hover:bg-gray-700"><SkipForward size={24} className="md:w-7 md:h-7" /></button>
                    <button onClick={toggleRepeat} className={`p-2 rounded hover:bg-gray-700 relative ${repeatMode !== 'off' ? 'text-blue-500' : ''}`}><Repeat size={18} className="md:w-5 md:h-5" />{repeatMode === 'one' && <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">1</span>}</button>
                </div>
            </div>
            
            {currentSong && (
              <div className="text-center text-xs md:text-sm text-gray-400">
                <div className="truncate px-4">Now Playing: {currentSong.judul}</div>
                <div className="flex items-center justify-center gap-2 md:gap-4 mt-2 text-[10px] md:text-xs flex-wrap">
                  {isShuffled && <span className="text-blue-400 flex items-center gap-1"><Shuffle size={10} /> Shuffle</span>}
                  {repeatMode !== 'off' && <span className="text-blue-400 flex items-center gap-1"><Repeat size={10} /> {repeatMode === 'all' ? 'All' : 'One'}</span>}
                  {queue.length > 0 && <span className="text-green-400 flex items-center gap-1"><List size={10} /> {queue.length}</span>}
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
          <div className="fixed md:relative bottom-0 md:bottom-auto right-0 md:right-auto w-full md:w-80 max-h-[70vh] md:max-h-full md:h-full bg-gray-800 p-4 overflow-y-auto border-t md:border-t-0 md:border-l border-gray-700 z-50 rounded-t-2xl md:rounded-none">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold">📋 Antrian ({queue.length})</h2>
              <div className="flex gap-2">
                {queue.length > 0 && <button onClick={clearQueue} className="text-red-500 text-sm">🗑️</button>}
                <button onClick={() => setShowQueue(false)} className="md:hidden text-gray-400"><X size={20} /></button>
              </div>
            </div>
            <div className="space-y-2">
              {queue.map((song, index) => (
                <div key={`${song.id}-${index}`} className={`p-3 rounded flex items-center gap-2 ${currentSong?.id === song.id ? 'bg-blue-900' : 'bg-gray-700'}`}>
                  <div className="flex-1 cursor-pointer min-w-0" onClick={() => { setCurrentSong(song); setIsPlaying(true); }}><div className="font-semibold text-sm truncate">{song.judul}</div></div>
                  <div className="flex gap-1">
                    <button onClick={() => removeFromQueue(index)} className="text-red-500 text-lg p-1">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <style jsx>{`
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