'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, List, ChevronLeft, ChevronRight, Music, Video, Search, X } from 'lucide-react';

interface Song {
  id: number;
  judul: string;
  type?: string;
  link: string;
  ss?: string;
  tahun: string;
  images: string[];
  playlist: string[];
}

export default function MusicPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mode, setMode] = useState<'video' | 'audio'>('audio');
  const [queue, setQueue] = useState<Song[]>([]);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [shuffledOrder, setShuffledOrder] = useState<Song[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('all');
  const [showQueue, setShowQueue] = useState(false);
  const [notification, setNotification] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load queue from localStorage on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem('stopify_queue');
    const savedCurrentSong = localStorage.getItem('stopify_current_song');
    
    if (savedQueue) {
      try {
        const parsedQueue = JSON.parse(savedQueue);
        setQueue(parsedQueue);
      } catch (error) {
        console.error('Error loading queue:', error);
      }
    }

    if (savedCurrentSong) {
      try {
        const parsedSong = JSON.parse(savedCurrentSong);
        setCurrentSong(parsedSong);
      } catch (error) {
        console.error('Error loading current song:', error);
      }
    }

    fetchSongs();
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    if (queue.length > 0) {
      localStorage.setItem('stopify_queue', JSON.stringify(queue));
    } else {
      localStorage.removeItem('stopify_queue');
    }
  }, [queue]);

  // Save current song to localStorage
  useEffect(() => {
    if (currentSong) {
      localStorage.setItem('stopify_current_song', JSON.stringify(currentSong));
    }
  }, [currentSong]);

  const fetchSongs = async () => {
    try {
      const response = await fetch('/api/music');
      const data = await response.json();
      setSongs(data);
      
      if (!currentSong && data.length > 0) {
        setCurrentSong(data[0]);
      }
    } catch (error) {
      console.error('Error fetching songs:', error);
    }
  };

  // Convert Google Drive link to direct download link
  const getDirectAudioUrl = (url: string) => {
    if (!url) return '';
    
    // Check if it's a Google Drive link
    if (url.includes('drive.google.com')) {
      const fileIdMatch = url.match(/\/d\/([^/]+)/);
      if (fileIdMatch) {
        const fileId = fileIdMatch[1];
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
      }
    }
    
    // Return as is for regular URLs
    return url;
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
    if (mode === 'audio' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const playNext = () => {
    if (!currentSong) return;
    
    let playQueue: Song[];
    if (isShuffled && shuffledOrder.length > 0) {
      playQueue = shuffledOrder;
    } else if (queue.length > 0) {
      playQueue = queue;
    } else {
      playQueue = songs;
    }
    
    const currentIndex = playQueue.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % playQueue.length;
    setCurrentSong(playQueue[nextIndex]);
    setIsPlaying(true);
  };

  const playPrevious = () => {
    if (!currentSong) return;
    
    let playQueue: Song[];
    if (isShuffled && shuffledOrder.length > 0) {
      playQueue = shuffledOrder;
    } else if (queue.length > 0) {
      playQueue = queue;
    } else {
      playQueue = songs;
    }
    
    const currentIndex = playQueue.findIndex(s => s.id === currentSong.id);
    const prevIndex = currentIndex === 0 ? playQueue.length - 1 : currentIndex - 1;
    setCurrentSong(playQueue[prevIndex]);
    setIsPlaying(true);
  };

  const toggleShuffle = () => {
    if (!isShuffled) {
      setRepeatMode('off');
      const playQueue = queue.length > 0 ? queue : songs;
      const shuffled = [...playQueue].sort(() => Math.random() - 0.5);
      setShuffledOrder(shuffled);
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
    setQueue([...queue, song]);
    showNotification(`✅ "${song.judul}" ditambahkan ke antrian`);
  };

  const removeFromQueue = (index: number) => {
    const removedSong = queue[index];
    const newQueue = queue.filter((_, i) => i !== index);
    setQueue(newQueue);
    showNotification(`❌ "${removedSong.judul}" dihapus dari antrian`);
  };

  const clearQueue = () => {
    if (confirm('Hapus semua lagu dari antrian?')) {
      setQueue([]);
      localStorage.removeItem('stopify_queue');
      showNotification('🗑️ Antrian dikosongkan');
    }
  };

  const moveQueueItem = (fromIndex: number, toIndex: number) => {
    const newQueue = [...queue];
    const [movedItem] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, movedItem);
    setQueue(newQueue);
  };

  const getYoutubeEmbedUrl = (url: string) => {
    const videoId = url.split('v=')[1]?.split('&')[0];
    return `https://www.youtube.com/embed/${videoId}?autoplay=${isPlaying ? 1 : 0}`;
  };

  useEffect(() => {
    if (mode === 'audio' && audioRef.current && currentSong) {
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play();
      }
    }
  }, [currentSong, mode]);

  const handleAudioEnded = () => {
    if (repeatMode === 'one') {
      audioRef.current?.play();
    } else if (repeatMode === 'all' || queue.length > 1) {
      playNext();
    } else {
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-900 text-white relative">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in">
          {notification}
        </div>
      )}

      {/* Sidebar - Mobile: Full screen overlay, Desktop: Side panel */}
      <div className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        ${isSidebarOpen ? 'md:w-80' : 'md:w-0'}
        fixed md:relative inset-0 md:inset-auto
        transition-all duration-300 bg-gray-800 overflow-hidden z-40
      `}>
        <div className="p-4 h-full overflow-y-auto">
          {/* Mobile close button */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden absolute top-4 right-4 p-2 hover:bg-gray-700 rounded"
          >
            <X size={24} />
          </button>

          <h2 className="text-xl font-bold mb-4">🎵 Playlist</h2>
          
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
                      setIsSidebarOpen(false); // Close sidebar on mobile after selecting
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

      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 p-3 md:p-4 flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-700 rounded"
          >
            {isSidebarOpen ? <ChevronLeft size={20} className="md:w-6 md:h-6" /> : <ChevronRight size={20} className="md:w-6 md:h-6" />}
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={() => setMode('audio')}
              className={`px-2 md:px-4 py-2 rounded flex items-center gap-1 md:gap-2 text-sm ${
                mode === 'audio' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <Music size={16} className="md:w-5 md:h-5" />
              <span className="hidden md:inline">Audio</span>
            </button>
            <button
              onClick={() => setMode('video')}
              className={`px-2 md:px-4 py-2 rounded flex items-center gap-1 md:gap-2 text-sm ${
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
        <div className="flex-1 flex items-center justify-center bg-black p-4 md:p-8 overflow-hidden">
          {currentSong && (
            <div className="w-full max-w-4xl">
              {mode === 'video' ? (
                <div className="aspect-video">
                  <iframe
                    src={getYoutubeEmbedUrl(currentSong.link)}
                    className="w-full h-full rounded-lg"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-48 h-48 md:w-64 md:h-64 mx-auto bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center mb-6 md:mb-8 shadow-2xl">
                    <Music size={80} className="md:w-[120px] md:h-[120px]" />
                  </div>
                  <h1 className="text-xl md:text-3xl font-bold mb-2 px-4">{currentSong.judul}</h1>
                  <p className="text-gray-400 text-sm md:text-lg">{currentSong.tahun}</p>
                  <audio
                    ref={audioRef}
                    src={getDirectAudioUrl(currentSong.images[0])}
                    onEnded={handleAudioEnded}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            {/* Progress Bar - Only show in audio mode */}
            {mode === 'audio' && currentSong && (
              <div className="mb-4 md:mb-6">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #374151 ${(currentTime / duration) * 100}%, #374151 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 md:gap-6 mb-3 md:mb-4">
              <button
                onClick={toggleShuffle}
                className={`p-2 rounded hover:bg-gray-700 ${
                  isShuffled ? 'text-blue-500' : ''
                }`}
                title={isShuffled ? 'Shuffle: Aktif' : 'Shuffle: Nonaktif'}
              >
                <Shuffle size={18} className="md:w-5 md:h-5" />
              </button>
              
              <button
                onClick={playPrevious}
                className="p-2 rounded hover:bg-gray-700"
                title="Previous"
              >
                <SkipBack size={24} className="md:w-7 md:h-7" />
              </button>
              
              <button
                onClick={togglePlay}
                className="p-3 md:p-4 bg-blue-600 rounded-full hover:bg-blue-700"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={28} className="md:w-8 md:h-8" /> : <Play size={28} className="md:w-8 md:h-8" />}
              </button>
              
              <button
                onClick={playNext}
                className="p-2 rounded hover:bg-gray-700"
                title="Next"
              >
                <SkipForward size={24} className="md:w-7 md:h-7" />
              </button>
              
              <button
                onClick={toggleRepeat}
                className={`p-2 rounded hover:bg-gray-700 relative ${
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

      {/* Queue Sidebar - Mobile: Bottom sheet, Desktop: Side panel */}
      {showQueue && (
        <>
          {/* Mobile overlay - Transparent to show background */}
          <div 
            className="md:hidden fixed inset-0 bg-black bg-opacity-30 z-40 backdrop-blur-sm"
            onClick={() => setShowQueue(false)}
          />
          
          <div className={`
            fixed md:relative
            bottom-0 md:bottom-auto right-0 md:right-auto
            w-full md:w-80
            max-h-[70vh] md:max-h-full md:h-full
            bg-gray-800 p-4 overflow-y-auto overflow-x-hidden border-t md:border-t-0 md:border-l border-gray-700
            rounded-t-2xl md:rounded-none
            z-50
            transition-transform duration-300
          `}>
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
                    } hover:bg-gray-600`}
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
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }

        /* Custom slider styles */
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #3b82f6;
          cursor: pointer;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .slider::-webkit-slider-thumb:hover {
          background: #2563eb;
          transform: scale(1.2);
        }

        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #3b82f6;
          cursor: pointer;
          border-radius: 50%;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .slider::-moz-range-thumb:hover {
          background: #2563eb;
          transform: scale(1.2);
        }
      `}</style>
    </div>
  );
}