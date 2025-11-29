'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, List, ChevronLeft, ChevronRight, Music, Video } from 'lucide-react';

interface Song {
  id: number;
  judul: string;
  type: string;
  link: string;
  ss: string;
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
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load queue from localStorage on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem('stopify_queue');
    const savedCurrentSong = localStorage.getItem('stopify_current_song');
    
    // Load saved queue if exists
    if (savedQueue) {
      try {
        const parsedQueue = JSON.parse(savedQueue);
        setQueue(parsedQueue);
      } catch (error) {
        console.error('Error loading queue:', error);
      }
    }

    // Load saved current song if exists
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
      // If queue is empty, remove from localStorage
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
      
      // Only set first song if no current song exists
      if (!currentSong && data.length > 0) {
        setCurrentSong(data[0]);
      }
    } catch (error) {
      console.error('Error fetching songs:', error);
    }
  };

  const filteredSongs = selectedPlaylist === 'all' 
    ? songs 
    : songs.filter(song => song.playlist.includes(selectedPlaylist));

  const playlists = ['all', 'MYLK', 'CB', 'SED', 'NATI', 's', 'd', ];

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
    
    // Determine which list to use for playback
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
    
    // Determine which list to use for playback
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
      // Activate shuffle - deactivate repeat
      setRepeatMode('off');
      
      const playQueue = queue.length > 0 ? queue : songs;
      const shuffled = [...playQueue].sort(() => Math.random() - 0.5);
      setShuffledOrder(shuffled);
      setIsShuffled(true);
      showNotification('🔀 Shuffle diaktifkan (Repeat dimatikan)');
    } else {
      // Deactivate shuffle
      setShuffledOrder([]);
      setIsShuffled(false);
      showNotification('🔀 Shuffle dimatikan');
    }
  };

  const toggleRepeat = () => {
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    const newMode = modes[(currentIndex + 1) % modes.length];
    
    // If activating repeat, deactivate shuffle
    if (newMode !== 'off' && isShuffled) {
      setIsShuffled(false);
      setShuffledOrder([]);
    }
    
    setRepeatMode(newMode);
    
    const messages = {
      off: '🔁 Repeat dimatikan',
      all: '🔁 Repeat semua lagu (Shuffle dimatikan)',
      one: '🔁 Repeat lagu ini (Shuffle dimatikan)'
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
    <div className="flex h-screen bg-gray-900 text-white relative">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in">
          {notification}
        </div>
      )}

      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-gray-800 overflow-hidden`}>
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">🎵 Playlist</h2>
          
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
          <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
            {filteredSongs.map((song) => (
              <div
                key={song.id}
                className={`p-3 rounded cursor-pointer hover:bg-gray-700 group ${
                  currentSong?.id === song.id ? 'bg-gray-700 border-l-4 border-blue-500' : ''
                }`}
              >
                <div 
                  onClick={() => {
                    setCurrentSong(song);
                    setIsPlaying(true);
                  }}
                  className="flex-1"
                >
                  <div className="font-semibold text-sm">{song.judul}</div>
                  <div className="text-xs text-gray-400">{song.tahun}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addToQueue(song);
                  }}
                  className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ➕ Tambah ke Antrian
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 p-4 flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-700 rounded"
          >
            {isSidebarOpen ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={() => setMode('audio')}
              className={`px-4 py-2 rounded flex items-center gap-2 ${
                mode === 'audio' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <Music size={20} />
              Audio
            </button>
            <button
              onClick={() => setMode('video')}
              className={`px-4 py-2 rounded flex items-center gap-2 ${
                mode === 'video' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <Video size={20} />
              Video
            </button>
          </div>

          <button
            onClick={() => setShowQueue(!showQueue)}
            className="p-2 hover:bg-gray-700 rounded relative"
          >
            <List size={24} />
            {queue.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {queue.length}
              </span>
            )}
          </button>
        </div>

        {/* Player Area */}
        <div className="flex-1 flex items-center justify-center bg-black p-8">
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
                  <div className="w-64 h-64 mx-auto bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center mb-8 shadow-2xl">
                    <Music size={120} />
                  </div>
                  <h1 className="text-3xl font-bold mb-2">{currentSong.judul}</h1>
                  <p className="text-gray-400 text-lg">{currentSong.tahun}</p>
                  <audio
                    ref={audioRef}
                    src={currentSong.images[0]}
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
        <div className="bg-gray-800 p-6">
          <div className="max-w-4xl mx-auto">
            {/* Progress Bar - Only show in audio mode */}
            {mode === 'audio' && currentSong && (
              <div className="mb-6">
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

            <div className="flex items-center justify-center gap-6 mb-4">
              <button
                onClick={toggleShuffle}
                className={`p-2 rounded hover:bg-gray-700 ${
                  isShuffled ? 'text-blue-500' : ''
                }`}
                title={isShuffled ? 'Shuffle: Aktif' : 'Shuffle: Nonaktif'}
              >
                <Shuffle size={20} />
              </button>
              
              <button
                onClick={playPrevious}
                className="p-2 rounded hover:bg-gray-700"
                title="Previous"
              >
                <SkipBack size={28} />
              </button>
              
              <button
                onClick={togglePlay}
                className="p-4 bg-blue-600 rounded-full hover:bg-blue-700"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={32} /> : <Play size={32} />}
              </button>
              
              <button
                onClick={playNext}
                className="p-2 rounded hover:bg-gray-700"
                title="Next"
              >
                <SkipForward size={28} />
              </button>
              
              <button
                onClick={toggleRepeat}
                className={`p-2 rounded hover:bg-gray-700 relative ${
                  repeatMode !== 'off' ? 'text-blue-500' : ''
                }`}
                title={`Repeat: ${repeatMode === 'off' ? 'Nonaktif' : repeatMode === 'all' ? 'Semua' : 'Satu'}`}
              >
                <Repeat size={20} />
                {repeatMode === 'one' && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                    1
                  </span>
                )}
              </button>
            </div>
            
            {currentSong && (
              <div className="text-center text-sm text-gray-400">
                <div>Now Playing: {currentSong.judul}</div>
                <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                  {isShuffled && (
                    <span className="text-blue-400 flex items-center gap-1">
                      <Shuffle size={12} /> Shuffle Aktif
                    </span>
                  )}
                  {repeatMode !== 'off' && (
                    <span className="text-blue-400 flex items-center gap-1">
                      <Repeat size={12} /> Repeat: {repeatMode === 'all' ? 'Semua' : 'Satu'}
                    </span>
                  )}
                  {queue.length > 0 && (
                    <span className="text-green-400 flex items-center gap-1">
                      <List size={12} /> Queue: {queue.length}
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
        <div className="w-80 bg-gray-800 p-4 overflow-y-auto border-l border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">📋 Antrian ({queue.length})</h2>
            {queue.length > 0 && (
              <button
                onClick={clearQueue}
                className="text-red-500 hover:text-red-400 text-sm"
                title="Kosongkan antrian"
              >
                🗑️ Hapus Semua
              </button>
            )}
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
                  className={`p-3 rounded flex justify-between items-center ${
                    currentSong?.id === song.id ? 'bg-blue-900' : 'bg-gray-700'
                  } hover:bg-gray-600`}
                >
                  <div 
                    className="flex-1 cursor-pointer" 
                    onClick={() => {
                      setCurrentSong(song);
                      setIsPlaying(true);
                    }}
                  >
                    <div className="font-semibold text-sm">{song.judul}</div>
                    <div className="text-xs text-gray-400">{song.tahun}</div>
                  </div>
                  <div className="flex gap-2 ml-2">
                    {index > 0 && (
                      <button
                        onClick={() => moveQueueItem(index, index - 1)}
                        className="text-gray-400 hover:text-white text-sm"
                        title="Pindah ke atas"
                      >
                        ⬆
                      </button>
                    )}
                    {index < queue.length - 1 && (
                      <button
                        onClick={() => moveQueueItem(index, index + 1)}
                        className="text-gray-400 hover:text-white text-sm"
                        title="Pindah ke bawah"
                      >
                        ⬇
                      </button>
                    )}
                    <button
                      onClick={() => removeFromQueue(index)}
                      className="text-red-500 hover:text-red-400 text-lg"
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