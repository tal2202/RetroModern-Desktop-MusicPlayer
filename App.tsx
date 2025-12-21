
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Track, PlayerState, RepeatMode } from './types';
import RetroButton from './components/RetroButton';
import Visualizer from './components/Visualizer';

declare global {
  interface Window {
    electronAPI?: {
      send: (channel: string, data: any) => void;
    }
  }
}

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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

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

  const handleWindowControl = (action: 'minimize' | 'maximize' | 'close') => {
    if (window.electronAPI) {
      window.electronAPI.send('window-control', action);
    } else {
      console.warn("Electron API not found");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newTracks: Track[] = Array.from(files).map((file: File) => ({
      id: Math.random().toString(36).substring(2, 11),
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Local File",
      url: URL.createObjectURL(file),
      duration: 0,
      file,
      type: 'local'
    }));

    setTracks(prev => [...prev, ...newTracks]);
    if (playerState.currentTrackIndex === null && newTracks.length > 0) {
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
    const audio = audioRef.current;
    if (!audio) return;
    let isSubscribed = true;

    const handlePlayback = async () => {
      try {
        if (playerState.isPlaying) {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            await playPromise;
            if (!isSubscribed && !audio.paused) audio.pause();
          }
        } else {
          audio.pause();
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error("Playback failed:", err);
      }
    };

    handlePlayback();
    return () => { isSubscribed = false; };
  }, [playerState.isPlaying, playerState.currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = playerState.volume;
    }
  }, [playerState.volume]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentTrack = playerState.currentTrackIndex !== null ? tracks[playerState.currentTrackIndex] : null;

  return (
    <div className="flex flex-col items-center justify-start overflow-hidden h-screen">
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

      <div className="flex flex-col gap-0 w-full max-w-lg bg-[#222] winamp-border shadow-2xl overflow-hidden">
        {/* Title Bar */}
        <div className="draggable-region flex items-center justify-between px-2 py-1 bg-gradient-to-r from-blue-900 to-blue-700 text-[10px] font-bold text-white cursor-move">
          <div className="flex items-center gap-1">
            <i className="fa-solid fa-compact-disc animate-spin-slow"></i>
            <span className="truncate max-w-[280px] uppercase tracking-widest">
              RetroModern - {currentTrack ? currentTrack.title : 'NO TRACK LOADED'}
            </span>
          </div>
          <div className="flex gap-1 non-draggable">
            <button className="w-3 h-3 bg-gray-400 border border-gray-600 hover:bg-white" onClick={() => handleWindowControl('minimize')}></button>
            <button className="w-3 h-3 bg-gray-400 border border-gray-600 hover:bg-white" onClick={() => handleWindowControl('maximize')}></button>
            <button className="w-3 h-3 bg-red-800 border border-gray-600 hover:bg-red-500" onClick={() => handleWindowControl('close')}></button>
          </div>
        </div>

        {/* Top Module */}
        <div className="flex gap-1 bg-[#222] p-1 h-36">
          <div className="flex-1 retro-lcd p-3 flex flex-col justify-between border border-black shadow-inner overflow-hidden">
             <div className="flex justify-between items-start">
                <div className="text-4xl font-bold leading-none tracking-tighter">
                  {formatTime(playerState.currentTime)}
                </div>
                <div className="text-[9px] text-right uppercase tracking-widest opacity-80 leading-tight">
                  {playerState.isPlaying ? 'Playing' : 'Paused'}<br/>
                  44khz Stereo
                </div>
             </div>
             <div className="flex-1 flex items-center justify-center overflow-hidden my-1">
               <div className="text-[11px] truncate w-full text-center tracking-wide">
                 {currentTrack ? `${currentTrack.artist} - ${currentTrack.title}` : 'LOAD AUDIO FILES (.MP3, .WAV)'}
               </div>
             </div>
             <Visualizer analyser={analyserRef.current} />
          </div>

          <div className="w-10 bg-[#333] border border-black p-1 flex flex-col items-center gap-1 shadow-inner">
            <div className="text-[7px] text-gray-500 uppercase font-bold">Vol</div>
            <input 
              type="range" min="0" max="1" step="0.01" value={playerState.volume}
              onChange={(e) => setPlayerState(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
              className="appearance-none w-1 h-20 bg-black rounded-full cursor-pointer orientation-vertical non-draggable"
            />
            <div className="text-[8px] text-green-500 font-mono mt-1">{Math.round(playerState.volume * 100)}</div>
          </div>
        </div>

        {/* Transport Controls */}
        <div className="flex items-center justify-between p-1 bg-[#333] border-t border-gray-600">
          <div className="flex gap-1">
            <RetroButton onClick={prevTrack} icon="fa-solid fa-backward-step" />
            <RetroButton onClick={togglePlay} icon={playerState.isPlaying ? "fa-solid fa-pause" : "fa-solid fa-play"} />
            <RetroButton onClick={() => {
              if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
              setPlayerState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
            }} icon="fa-solid fa-stop" />
            <RetroButton onClick={nextTrack} icon="fa-solid fa-forward-step" />
            <RetroButton onClick={() => document.getElementById('file-upload')?.click()} icon="fa-solid fa-plus" className="ml-2" />
            <input id="file-upload" type="file" multiple accept="audio/*" className="hidden" onChange={handleFileUpload} />
          </div>
          <div className="flex gap-1 items-center">
            <RetroButton onClick={() => setPlayerState(prev => ({ ...prev, isShuffled: !prev.isShuffled }))} icon="fa-solid fa-shuffle" active={playerState.isShuffled} />
            <RetroButton onClick={() => setPlayerState(prev => ({ 
              ...prev, 
              repeatMode: prev.repeatMode === RepeatMode.NONE ? RepeatMode.ALL : (prev.repeatMode === RepeatMode.ALL ? RepeatMode.ONE : RepeatMode.NONE) 
            }))} icon="fa-solid fa-repeat" active={playerState.repeatMode !== RepeatMode.NONE} />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-2 py-1 bg-[#333]">
           <input 
             type="range" min="0" max={currentTrack?.duration || 100} value={playerState.currentTime}
             onChange={(e) => { if (audioRef.current) audioRef.current.currentTime = parseFloat(e.target.value); }}
             className="w-full h-1 bg-black rounded-lg appearance-none cursor-pointer accent-green-500"
           />
        </div>

        {/* Playlist Container */}
        <div className="flex flex-col bg-[#111] border-t border-black">
          <div className="text-[9px] bg-[#222] p-1 border-b border-black text-gray-500 uppercase tracking-widest flex justify-between font-bold">
            <span>Playlist editor</span>
            <span>{tracks.length} Items</span>
          </div>
          <div className="h-56 overflow-y-auto custom-scrollbar bg-black font-mono text-[11px]">
            {tracks.length === 0 ? (
              <div className="text-gray-800 italic p-6 text-center text-xs uppercase tracking-widest opacity-50">Drag music here or click (+)</div>
            ) : (
              tracks.map((track, idx) => (
                <div key={track.id} onClick={() => playTrack(idx)} className={`flex justify-between p-1.5 px-3 cursor-pointer border-b border-gray-900 group ${playerState.currentTrackIndex === idx ? 'bg-blue-900/50 text-white' : 'text-green-900 hover:bg-gray-900 hover:text-green-500'}`}>
                  <div className="truncate flex-1 flex gap-2 items-center">
                    <span className="opacity-40 text-[9px] w-4">{idx + 1}.</span>
                    <span className="truncate">{track.title}</span>
                  </div>
                  <div className="w-12 text-right opacity-60 group-hover:opacity-100">{formatTime(track.duration)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
