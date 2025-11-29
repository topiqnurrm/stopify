'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, List, ChevronLeft, ChevronRight, Music, Search, X, Volume2, Video } from 'lucide-react';

// YouTube Player API Types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

// Interface Song yang Disederhanakan
interface Song {
  id: number;
  judul: string;
  link: string;
  tahun: string;
  playlist: string[];
}

// Kunci Local Storage
const QUEUE_STORAGE_KEY = 'musicPlayerQueue';

// Fungsi untuk mendapatkan Origin URL saat ini (penting untuk PostMessage security)
const getOriginUrl = (): string | undefined => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return undefined;
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
  
  const playerRef = useRef<any>(null);

  // --- FUNGSI UTILITY LOCAL STORAGE ---
  const saveQueueToLocalStorage = (newQueue: Song[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(newQueue));
      } catch (error) {
        console.error('Error saving queue to local storage:', error);
      }
    }
  };

  const loadQueueFromLocalStorage = (): Song[] => {
    if (typeof window !== 'undefined') {
      try {
        const storedQueue = localStorage.getItem(QUEUE_STORAGE_KEY);
        return storedQueue ? JSON.parse(storedQueue) : [];
      } catch (error) {
        console.error('Error loading queue from local storage:', error);
        return [];
      }
    }
    return [];
  };

  // Mount, Load Queue, dan fetch songs
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const initialQueue = loadQueueFromLocalStorage();
        setQueue(initialQueue);
        
        // 2. Load YouTube IFrame API
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

  // Simpan queue ke Local Storage setiap kali queue berubah
  useEffect(() => {
    saveQueueToLocalStorage(queue);
  }, [queue]);


  // Auto-open sidebar on desktop
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

  // Initialize YouTube Player when song changes
  useEffect(() => {
    if (!currentSong || !mounted || typeof window === 'undefined') return;

    setIsPlayerReady(false);

    const videoId = getYoutubeVideoId(currentSong.link);
    if (!videoId) return;

    // Destroy existing player
    if (playerRef.current) {
      try {
        if (typeof playerRef.current.destroy === 'function') {
           playerRef.current.destroy();
        }
        playerRef.current = null;
      } catch (e) {
        // Ignore error
      }
    }

    if (window.YT && window.YT.Player) {
      const targetElement = 'youtube-player'; 
      const playerOrigin = getOriginUrl();

      playerRef.current = new window.YT.Player(targetElement, {
        height: mode === 'video' ? '100%' : '0',
        width: mode === 'video' ? '100%' : '0',
        videoId: videoId,
        playerVars: {
          autoplay: 0, 
          controls: mode === 'video' ? 1 : 0,
          disablekb: mode === 'audio' ? 1 : 0,
          fs: mode === 'video' ? 1 : 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          // Mengatasi PostMessage Mismatch (Error origin)
          origin: playerOrigin 
        },
        events: {
          onReady: (event: any) => {
            setIsPlayerReady(true); 
            
            event.target.setVolume(volume);
            if (isPlaying) {
              event.target.playVideo();
            }
          },
          onError: (event: any) => {
            if (event.data === -2) {
              console.warn("YouTube Service Unstable (Error -2).");
              showNotification("⚠️ Layanan YouTube tidak stabil. Coba lagi dalam beberapa saat.");
            } else {
              console.error(`Youtubeer Error: ${event.data}`, currentSong);
              showNotification(`❌ Error Player YouTube: ${event.data}`);
            }
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
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [currentSong, mounted, mode, isPlaying, volume]); // isPlaying dan volume ditambahkan untuk memastikan player bereaksi cepat saat inisialisasi

  // Handle play/pause
  useEffect(() => {
    if (!playerRef.current || !isPlayerReady) return; 

    try {
      if (isPlaying) {
        if (typeof playerRef.current.playVideo === 'function') {
           playerRef.current.playVideo();
        }
      } else {
        if (typeof playerRef.current.pauseVideo === 'function') {
          playerRef.current.pauseVideo();
        }
      }
    } catch (e) {
      console.error('Player control error:', e);
    }
  }, [isPlaying, isPlayerReady]);

  // Handle volume change
  useEffect(() => {
    if (playerRef.current && isPlayerReady && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(volume);
    }
  }, [volume, isPlayerReady]);

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

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const playNext = () => {
    if (!currentSong) return;
    
    if (queue.length > 0) {
      const currentIndex = queue.findIndex(s => s.id === currentSong.id);
      
      if (currentIndex !== -1) {
        const nextIndex = (currentIndex + 1) % queue.length;
        setCurrentSong(queue[nextIndex]);
        setIsPlaying(true);
        return; 
      } 
    }

    let playQueue: Song[];
    if (isShuffled && shuffledOrder.length > 0) {
      playQueue = shuffledOrder;
    } else {
      playQueue = filteredSongs;
    }
    
    const currentIndex = playQueue.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % playQueue.length;

    if (playQueue.length === 0) {
        setIsPlaying(false);
        return;
    }
    
    setCurrentSong(playQueue[nextIndex]);
    setIsPlaying(true);
  };

  const playPrevious = () => {
    if (!currentSong) return;
    
    let playQueue: Song[];
    if (isShuffled && shuffledOrder.length > 0) {
      playQueue = shuffledOrder;
    } else {
      playQueue = filteredSongs;
    }

    if (playQueue.length === 0) {
        setIsPlaying(false);
        return;
    }
    
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

      const finalShuffledOrder = currentSong ? [currentSong, ...shuffled] : shuffled;

      setShuffledOrder(finalShuffledOrder);
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
    const currentIndex = modes.indexOf(repeatMode);
    const newMode = modes[(currentIndex + 1) % modes.length];
    
    if (newMode !== 'off' && isShuffled) {
      setIsShuffled(false);
      setShuffledOrder([]);
    }
    
    setRepeatMode(newMode);
    
    const messages = {
      off: '🔁 Repeat dimatikan',
      all: '🔁 Repeat semua lagu',
      one: '🔁 Repeat lagu ini'
    };
    showNotification(messages[newMode]);
  };

  const addToQueue = (song: Song) => {
    setQueue(prevQueue => {
      const newQueue = [...prevQueue, song];
      return newQueue; 
    });
    showNotification(`✅ "${song.judul}" ditambahkan ke antrian`);
  };

  const removeFromQueue = (index: number) => {
    setQueue(prevQueue => {
      const removedSong = prevQueue[index];
      const newQueue = prevQueue.filter((_, i) => i !== index);
      showNotification(`❌ "${removedSong.judul}" dihapus dari antrian`);
      return newQueue; 
    });
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
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    setUserClosedSidebar(!newState);
  };

  if (!mounted) {
    return (
      <div 
        className="flex flex-col md:flex-row h-screen bg-gray-900 text-white relative items-center justify-center"
        suppressHydrationWarning={true}
      >
        <p>Loading Music Player...</p>
      </div>
    );
  }

  return (
    // suppressHydrationWarning pada elemen root adalah solusi standar untuk mengatasi error ekstensi browser.
    <div 
        className="flex flex-col md:flex-row h-screen bg-gray-900 text-white relative"
        suppressHydrationWarning={true}
    >
      {/* Notification Toast */}
      {notification && (
        <div 
          className="fixed bg-black bg-opacity-70 backdrop-blur-md text-white px-8 py-4 rounded-2xl shadow-2xl z-50 animate-fade-in-out"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <p className="text-center text-lg font-medium">{notification}</p>
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        ${isSidebarOpen ? 'md:w-80' : 'md:w-0'}
        fixed md:relative inset-0 md:inset-auto
        transition-all duration-300 bg-gray-800 overflow-hidden z-40
      `}>
        <div className="p-4 h-full overflow-y-auto">
          <button
            onClick={() => {
              setIsSidebarOpen(false);
              setUserClosedSidebar(true);
            }}
            className="md:hidden absolute top-4 right-4 p-2 hover:bg-gray-700 rounded"
          >
            <X size={24} />
          </button>

          <h2 className="text-xl font-bold mb-4">🎵 Music Playlist</h2>
          
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Cari lagu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Playlist Filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {playlists.map(pl => (
              <button
                key={pl}
                onClick={() => setSelectedPlaylist(pl)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedPlaylist === pl 
                    ? 'bg-blue-600' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {pl === 'all' ? 'All' : pl}
              </button>
            ))}
          </div>

          {/* Song List */}
          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pb-20 md:pb-0">
            {filteredSongs.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Music size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-sm">Tidak ada lagu ditemukan</p>
              </div>
            ) : (
              filteredSongs.map((song) => (
                <div
                  key={song.id}
                  className={`p-3 rounded hover:bg-gray-700 ${
                    currentSong?.id === song.id ? 'bg-gray-700 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div 
                    onClick={() => {
                      setCurrentSong(song);
                      setIsPlaying(true);
                      if (window.innerWidth < 768) {
                        setIsSidebarOpen(false);
                        setUserClosedSidebar(true);
                      }
                    }}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-semibold text-sm">{song.judul}</div>
                    <div className="text-xs text-gray-400">{song.tahun}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToQueue(song);
                    }}
                    className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-2 rounded transition-colors"
                  >
                    ➕ Tambah ke Antrian
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => {
            setIsSidebarOpen(false);
            setUserClosedSidebar(true);
          }}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 p-3 md:p-4 flex items-center justify-between">
          <button
            onClick={handleSidebarToggle}
            className="p-2 hover:bg-gray-700 rounded"
          >
            {isSidebarOpen ? <ChevronLeft size={20} className="md:w-6 md:h-6" /> : <ChevronRight size={20} className="md:w-6 md:h-6" />}
          </button>
          
          <div className="flex gap-2 items-center">
            <button
              onClick={() => {
                setMode('audio');
                showNotification('🎵 Mode Audio');
              }}
              className={`px-2 md:px-4 py-2 rounded flex items-center gap-1 md:gap-2 text-sm transition-colors ${
                mode === 'audio' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <Music size={16} className="md:w-5 md:h-5" />
              <span className="hidden md:inline">Audio</span>
            </button>
            <button
              onClick={() => {
                setMode('video');
                showNotification('🎬 Mode Video');
              }}
              className={`px-2 md:px-4 py-2 rounded flex items-center gap-1 md:gap-2 text-sm transition-colors ${
                mode === 'video' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <Video size={16} className="md:w-5 md:h-5" />
              <span className="hidden md:inline">Video</span>
            </button>
          </div>

          <button
            onClick={() => setShowQueue(!showQueue)}
            className="p-2 hover:bg-gray-700 rounded relative"
          >
            <List size={20} className="md:w-6 md:h-6" />
            {queue.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {queue.length}
              </span>
            )}
          </button>
        </div>

        {/* Player Area */}
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 md:p-8 overflow-hidden">
          {currentSong ? (
            mode === 'video' ? (
              <div className="w-full max-w-4xl">
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <div 
                    id="youtube-player" 
                    style={{ 
                      width: '100%', 
                      height: '100%',
                      position: 'relative'
                    }}
                  ></div>
                </div>
                <div className="mt-4 text-center">
                  <h2 className="text-xl md:text-2xl font-bold">{currentSong.judul}</h2>
                  <p className="text-gray-400 text-sm md:text-base">{currentSong.tahun}</p>
                </div>
              </div>
            ) : (
              <div className="text-center max-w-md w-full">
                {/* Hidden YouTube Player for Audio Mode */}
                <div style={{ position: 'absolute', left: '-9999px', width: '0', height: '0' }}>
                  <div id="youtube-player"></div>
                </div>
                
                <div className="w-48 h-48 md:w-64 md:h-64 mx-auto bg-gradient-to-br from-purple-600 via-pink-500 to-blue-600 rounded-full flex items-center justify-center mb-6 md:mb-8 shadow-2xl animate-pulse-slow">
                  <Music size={80} className="md:w-[120px] md:h-[120px] text-white" />
                </div>
                <h1 className="text-xl md:text-3xl font-bold mb-2 px-4">{currentSong.judul}</h1>
                <p className="text-gray-400 text-sm md:text-lg mb-6">{currentSong.tahun}</p>
                
                {/* Volume Control */}
                <div className="flex items-center gap-3 justify-center px-4">
                  <Volume2 size={20} className="text-gray-400" />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(parseInt(e.target.value))}
                    className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${volume}%, #374151 ${volume}%, #374151 100%)`
                    }}
                  />
                  <span className="text-sm text-gray-400 w-8">{volume}%</span>
                </div>
              </div>
            )
          ) : (
            <div className="text-center text-gray-400">
              <Music size={80} className="mx-auto mb-4 opacity-50" />
              <p>Pilih lagu dari playlist</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-3 md:gap-6 mb-3 md:mb-4">
              <button
                onClick={toggleShuffle}
                className={`p-2 rounded hover:bg-gray-700 transition-colors ${
                  isShuffled ? 'text-blue-500' : ''
                }`}
                title={isShuffled ? 'Shuffle: Aktif' : 'Shuffle: Nonaktif'}
              >
                <Shuffle size={18} className="md:w-5 md:h-5" />
              </button>
              
              <button
                onClick={playPrevious}
                className="p-2 rounded hover:bg-gray-700 transition-colors"
                title="Previous"
              >
                <SkipBack size={24} className="md:w-7 md:h-7" />
              </button>
              
              <button
                onClick={togglePlay}
                className="p-3 md:p-4 bg-blue-600 rounded-full hover:bg-blue-700 transition-all transform hover:scale-105"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={28} className="md:w-8 md:h-8" /> : <Play size={28} className="md:w-8 md:h-8" />}
              </button>
              
              <button
                onClick={playNext}
                className="p-2 rounded hover:bg-gray-700 transition-colors"
                title="Next"
              >
                <SkipForward size={24} className="md:w-7 md:h-7" />
              </button>
              
              <button
                onClick={toggleRepeat}
                className={`p-2 rounded hover:bg-gray-700 relative transition-colors ${
                  repeatMode !== 'off' ? 'text-blue-500' : ''
                }`}
                title={`Repeat: ${repeatMode === 'off' ? 'Nonaktif' : repeatMode === 'all' ? 'Semua' : 'Satu'}`}
              >
                <Repeat size={18} className="md:w-5 md:h-5" />
                {repeatMode === 'one' && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                    1
                  </span>
                )}
              </button>
            </div>
            
            {currentSong && (
              <div className="text-center text-xs md:text-sm text-gray-400">
                <div className="truncate px-4">Now Playing: {currentSong.judul}</div>
                <div className="flex items-center justify-center gap-2 md:gap-4 mt-2 text-[10px] md:text-xs flex-wrap">
                  {isShuffled && (
                    <span className="text-blue-400 flex items-center gap-1">
                      <Shuffle size={10} className="md:w-3 md:h-3" /> Shuffle
                    </span>
                  )}
                  {repeatMode !== 'off' && (
                    <span className="text-blue-400 flex items-center gap-1">
                      <Repeat size={10} className="md:w-3 md:h-3" /> {repeatMode === 'all' ? 'All' : 'One'}
                    </span>
                  )}
                  {queue.length > 0 && (
                    <span className="text-green-400 flex items-center gap-1">
                      <List size={10} className="md:w-3 md:h-3" /> {queue.length}
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
          <div 
            className="md:hidden fixed inset-0 bg-black bg-opacity-30 z-40 backdrop-blur-sm"
            onClick={() => setShowQueue(false)}
          />
          
          <div className="fixed md:relative bottom-0 md:bottom-auto right-0 md:right-auto w-full md:w-80 max-h-[70vh] md:max-h-full md:h-full bg-gray-800 p-4 overflow-y-auto overflow-x-hidden border-t md:border-t-0 md:border-l border-gray-700 rounded-t-2xl md:rounded-none z-50 transition-transform duration-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold">📋 Antrian ({queue.length})</h2>
              <div className="flex gap-2">
                {queue.length > 0 && (
                  <button
                    onClick={clearQueue}
                    className="text-red-500 hover:text-red-400 text-sm"
                    title="Kosongkan antrian"
                  >
                    🗑️
                  </button>
                )}
                <button
                  onClick={() => setShowQueue(false)}
                  className="md:hidden text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {queue.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <List size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-sm">Antrian kosong</p>
                <p className="text-xs mt-2">Tambahkan lagu dari playlist</p>
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map((song, index) => (
                  <div
                    key={`${song.id}-${index}`}
                    className={`p-3 rounded flex items-center gap-2 ${
                      currentSong?.id === song.id ? 'bg-blue-900' : 'bg-gray-700'
                    } hover:bg-gray-600 transition-colors`}
                  >
                    <div 
                      className="flex-1 cursor-pointer min-w-0" 
                      onClick={() => {
                        setCurrentSong(song);
                        setIsPlaying(true);
                      }}
                    >
                      <div className="font-semibold text-sm truncate">{song.judul}</div>
                      <div className="text-xs text-gray-400 truncate">{song.tahun}</div>
                    </div>
                    <div className="flex gap-1 md:gap-2 flex-shrink-0">
                      {index > 0 && (
                        <button
                          onClick={() => moveQueueItem(index, index - 1)}
                          className="text-gray-400 hover:text-white text-sm p-1"
                          title="Pindah ke atas"
                        >
                          ⬆
                        </button>
                      )}
                      {index < queue.length - 1 && (
                        <button
                          onClick={() => moveQueueItem(index, index + 1)}
                          className="text-gray-400 hover:text-white text-sm p-1"
                          title="Pindah ke bawah"
                        >
                          ⬇
                        </button>
                      )}
                      <button
                        onClick={() => removeFromQueue(index)}
                        className="text-red-500 hover:text-red-400 text-lg p-1"
                        title="Hapus dari antrian"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes fade-in-out {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          10% {
            opacity: 1;
            transform: scale(1);
          }
          90% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.9);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }

        .animate-fade-in-out {
          animation: fade-in-out 3s ease-in-out;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #3b82f6;
          cursor: pointer;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        input[type="range"]::-webkit-slider-thumb:hover {
          background: #2563eb;
          transform: scale(1.2);
        }

        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #3b82f6;
          cursor: pointer;
          border-radius: 50%;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        input[type="range"]::-moz-range-thumb:hover {
          background: #2563eb;
          transform: scale(1.2);
        }
      `}</style>
    </div>
  );
}