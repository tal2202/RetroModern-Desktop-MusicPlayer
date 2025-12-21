
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Track, PlayerState, RepeatMode, GeminiInsight } from './types';
import { getTrackInsights } from './services/geminiService';
import RetroButton from './components/RetroButton';
import Visualizer from './components/Visualizer';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentTrackIndex: null,
    isPlaying: false,
    volume: 0.7,
    currentTime: 0,
    isShuffled: false,
    repeatMode: RepeatMode.NONE,
  });
  const [insight, setInsight] = useState<GeminiInsight | null>(null);
  const [isInsightLoading, setIsInsightLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const [playbackStats, setPlaybackStats] = useState<{ time: string, level: number }[]>([]);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current && audioRef.current) {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      audioContextRef.current = new AudioContextClass();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newTracks: Track[] = Array.from(files).map((file: File) => ({
      id: Math.random().toString(36).substring(2, 11),
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Unknown Artist",
      url: URL.createObjectURL(file),
      duration: 0,
      file,
      type: 'local'
    }));

    setTracks(prev => [...prev, ...newTracks]);
    if (playerState.currentTrackIndex === null) {
      playTrack(0);
    }
  };

  const playTrack = (index: number) => {
    initAudioContext();
    setPlayerState(prev => ({ ...prev, currentTrackIndex: index, isPlaying: true }));
  };

  const togglePlay = () => {
    if (playerState.currentTrackIndex === null && tracks.length > 0) {
      playTrack(0);
      return;
    }
    initAudioContext();
    setPlayerState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const nextTrack = useCallback(() => {
    if (tracks.length === 0) return;
    const nextIdx = (playerState.currentTrackIndex !== null ? playerState.currentTrackIndex + 1 : 0) % tracks.length;
    playTrack(nextIdx);
  }, [playerState.currentTrackIndex, tracks.length]);

  const prevTrack = () => {
    if (tracks.length === 0) return;
    const prevIdx = (playerState.currentTrackIndex !== null ? playerState.currentTrackIndex - 1 + tracks.length : 0) % tracks.length;
    playTrack(prevIdx);
  };

  useEffect(() => {
    if (audioRef.current) {
      if (playerState.isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [playerState.isPlaying, playerState.currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = playerState.volume;
    }
  }, [playerState.volume]);

  useEffect(() => {
    const currentTrack = playerState.currentTrackIndex !== null ? tracks[playerState.currentTrackIndex] : null;
    if (currentTrack) {
      setIsInsightLoading(true);
      setInsight(null);
      getTrackInsights(currentTrack.title, currentTrack.artist).then(res => {
        setInsight(res);
        setIsInsightLoading(false);
      });
    }
  }, [playerState.currentTrackIndex, tracks]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (playerState.isPlaying) {
        setPlaybackStats(prev => {
          const newStats = [...prev, { time: new Date().toLocaleTimeString(), level: Math.random() * 100 }];
          return newStats.slice(-20);
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [playerState.isPlaying]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentTrack = playerState.currentTrackIndex !== null ? tracks[playerState.currentTrackIndex] : null;

  return (
    <div className="min-h-screen p-2 flex flex-col items-center justify-start gap-4 overflow-x-hidden">
      <audio
        ref={audioRef}
        src={currentTrack?.url}
        onTimeUpdate={() => setPlayerState(prev => ({ ...prev, currentTime: audioRef.current?.currentTime || 0 }))}
        onEnded={nextTrack}
        onLoadedMetadata={(e) => {
          const duration = e.currentTarget.duration;
          setTracks(prev => prev.map((t, i) => i === playerState.currentTrackIndex ? { ...t, duration } : t));
        }}
      />

      {/* Main Player Window */}
      <div className="flex flex-col gap-2 w-full max-w-lg bg-[#222] p-1 winamp-border shadow-2xl">
        
        {/* Title Bar (Draggable Region for Electron) */}
        <div className="draggable-region flex items-center justify-between px-2 py-1 bg-gradient-to-r from-blue-900 to-blue-700 text-xs font-bold text-white cursor-move">
          <div className="flex items-center gap-1">
            <i className="fa-solid fa-music"></i>
            <span className="truncate max-w-[250px] uppercase">
              <span className="italic">RetroModern</span> Player - {currentTrack ? currentTrack.title : 'READY'}
            </span>
          </div>
          <div className="flex gap-1 non-draggable">
            <button className="w-3 h-3 bg-gray-400 border border-gray-600 hover:bg-white active:bg-gray-200" title="Minimize"></button>
            <button className="w-3 h-3 bg-gray-400 border border-gray-600 hover:bg-white active:bg-gray-200" title="Maximize"></button>
            <button className="w-3 h-3 bg-red-800 border border-gray-600 hover:bg-red-500 active:bg-red-900" title="Close" onClick={() => window.close()}></button>
          </div>
        </div>

        {/* Top Module: Info & Visualization */}
        <div className="flex gap-2 bg-[#222] p-2 h-40">
          <div className="flex-1 retro-lcd p-3 flex flex-col justify-between border border-black shadow-inner overflow-hidden">
             <div className="flex justify-between items-start">
                <div className="text-3xl font-bold leading-none tracking-tighter">
                  {formatTime(playerState.currentTime)}
                </div>
                <div className="text-[9px] text-right uppercase tracking-widest opacity-80 leading-tight">
                  {playerState.isPlaying ? 'Playing' : 'Paused'}<br/>
                  44.1kHz ST
                </div>
             </div>
             
             <div className="flex-1 flex items-center justify-center overflow-hidden my-1">
               <div className="text-[11px] truncate w-full text-center tracking-wide">
                 {currentTrack ? `${currentTrack.artist} - ${currentTrack.title}` : 'LOAD AUDIO FILES...'}
               </div>
             </div>

             <Visualizer analyser={analyserRef.current} />
          </div>

          <div className="w-12 bg-[#333] border border-black p-1 flex flex-col items-center gap-1 shadow-inner">
            <div className="text-[8px] text-gray-500 uppercase">Vol</div>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={playerState.volume}
              onChange={(e) => setPlayerState(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
              className="appearance-none w-1 h-24 bg-black rounded-full cursor-pointer orientation-vertical"
              style={{ writingMode: 'bt-lr', appearance: 'slider-vertical' } as any}
            />
            <div className="text-[8px] text-green-500 font-mono mt-1">{Math.round(playerState.volume * 100)}%</div>
          </div>
        </div>

        {/* Transport Controls */}
        <div className="flex items-center justify-between p-2 bg-[#333] border-t border-gray-600">
          <div className="flex gap-1">
            <RetroButton onClick={prevTrack} icon="fa-solid fa-backward-step" title="Previous" />
            <RetroButton onClick={togglePlay} icon={playerState.isPlaying ? "fa-solid fa-pause" : "fa-solid fa-play"} title="Play/Pause" />
            <RetroButton onClick={() => setPlayerState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }))} icon="fa-solid fa-stop" title="Stop" />
            <RetroButton onClick={nextTrack} icon="fa-solid fa-forward-step" title="Next" />
            <RetroButton 
              onClick={() => document.getElementById('file-upload')?.click()} 
              icon="fa-solid fa-folder-open" 
              title="Add Files" 
              className="ml-2"
            />
            <input id="file-upload" type="file" multiple accept="audio/*" className="hidden" onChange={handleFileUpload} />
          </div>
          
          <div className="flex gap-1 items-center">
            <RetroButton 
              onClick={() => setPlayerState(prev => ({ ...prev, isShuffled: !prev.isShuffled }))} 
              icon="fa-solid fa-shuffle" 
              active={playerState.isShuffled} 
              title="Shuffle"
            />
            <RetroButton 
              onClick={() => setPlayerState(prev => ({ 
                ...prev, 
                repeatMode: prev.repeatMode === RepeatMode.NONE ? RepeatMode.ALL : (prev.repeatMode === RepeatMode.ALL ? RepeatMode.ONE : RepeatMode.NONE) 
              }))} 
              icon="fa-solid fa-repeat" 
              active={playerState.repeatMode !== RepeatMode.NONE}
              title="Repeat"
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-2 pb-2 bg-[#333]">
           <input 
             type="range"
             min="0"
             max={currentTrack?.duration || 100}
             value={playerState.currentTime}
             onChange={(e) => {
               const val = parseFloat(e.target.value);
               if (audioRef.current) audioRef.current.currentTime = val;
             }}
             className="w-full h-1 bg-black rounded-lg appearance-none cursor-pointer hover:bg-green-900 transition-colors accent-green-500"
           />
        </div>

        {/* Playlist Container */}
        <div className="flex flex-col bg-[#111] border-t border-black">
          <div className="text-[10px] bg-[#222] p-1 border-b border-black text-gray-400 uppercase tracking-tighter flex justify-between">
            <span>Playlist editor</span>
            <span>{tracks.length} Tracks</span>
          </div>
          <div className="h-32 overflow-y-auto custom-scrollbar bg-black font-mono text-[11px]">
            {tracks.length === 0 ? (
              <div className="text-gray-700 italic p-2 text-center">Playlist Empty</div>
            ) : (
              tracks.map((track, idx) => (
                <div 
                  key={track.id}
                  onClick={() => playTrack(idx)}
                  className={`
                    flex justify-between p-1 px-2 cursor-pointer border-b border-gray-900
                    ${playerState.currentTrackIndex === idx ? 'bg-blue-900 text-white' : 'text-green-800 hover:bg-gray-900 hover:text-green-500'}
                  `}
                >
                  <div className="truncate flex-1">
                    {idx + 1}. {track.artist} - {track.title}
                  </div>
                  <div className="w-12 text-right">{formatTime(track.duration)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Insight Section - Adjusted for Smaller Desktop Window */}
      <div className="w-full max-w-lg flex flex-col gap-2">
        <div className="bg-[#1a1a1a] border border-gray-800 rounded p-3 shadow-2xl">
          <div className="flex items-center gap-2 mb-2 text-orange-400">
            <i className="fa-solid fa-brain text-xs"></i>
            <h2 className="uppercase text-[10px] font-bold tracking-widest">AI Insights</h2>
          </div>
          
          {currentTrack && !isInsightLoading && insight ? (
            <div className="space-y-2 animate-fadeIn text-[11px]">
              <p className="text-gray-300 italic border-l border-orange-500 pl-2">"{insight.mood}"</p>
              <p className="text-gray-400 leading-tight">{insight.factoid}</p>
              <div className="text-green-500 font-mono">{insight.genreVibe}</div>
            </div>
          ) : isInsightLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-4 h-4 border border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="text-gray-600 text-[10px] italic">Waiting for playback...</div>
          )}
        </div>

        {/* Mini Status Chart */}
        <div className="bg-[#1a1a1a] border border-gray-800 rounded h-20 p-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={playbackStats}>
              <Area type="monotone" dataKey="level" stroke="#00ff00" fill="#00ff00" fillOpacity={0.1} animationDuration={100} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-[9px] uppercase tracking-widest text-gray-700 font-bold">
        <span className="italic">RetroModern</span> Engine v1.0.5
      </p>
    </div>
  );
};

export default App;