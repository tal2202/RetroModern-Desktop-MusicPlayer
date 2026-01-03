import {Track} from '../types';
const SOUND_CLOUD_CLIENT_ID = 'dH1Xed1fpITYonugor6sw39jvdq58M3h';

export interface SoundCloudTrackData {
  id: string;
  title: string;
  user: {
    username: string;
  };
  duration: number;
  permalink_url: string;
}


export async function fetchSoundCloudRandomSongs(): Promise<Track> {
  
  return fetchSoundCloudTrack('https://soundcloud.com/random', SOUND_CLOUD_CLIENT_ID);

}



export async function fetchSoundCloudTrack(url: string, clientId: string): Promise<Track> {
  const resolveUrl = `https://api.soundcloud.com/resolve?url=${encodeURIComponent(url)}&client_id=${clientId}`;
  const response = await fetch(resolveUrl);
  if (!response.ok) {
    throw new Error(`SoundCloud API error: ${response.statusText}`);
  }
  const data: SoundCloudTrackData = await response.json();
  return {
    id: data.id.toString(),
    title: data.title,
    artist: data.user.username,
    url: data.permalink_url,
    duration: data.duration,
    type: 'remote',
  };
}