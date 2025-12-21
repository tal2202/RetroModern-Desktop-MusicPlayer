
export interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration: number;
  file?: File;
  type: 'local' | 'remote';
}

export interface PlayerState {
  currentTrackIndex: number | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  isShuffled: boolean;
  repeatMode: RepeatMode;
}

export enum RepeatMode {
  NONE = 'NONE',
  ONE = 'ONE',
  ALL = 'ALL'
}

export interface GeminiInsight {
  mood: string;
  factoid: string;
  genreVibe: string;
}
