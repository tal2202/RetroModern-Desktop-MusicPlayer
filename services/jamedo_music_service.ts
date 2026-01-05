import {Track} from '../types';
const JAMEDO_CLIENT_ID = 'e58bb8c7';


export async function fetchJamedoRandomSongs(): Promise<Track> {
    return fetchJamedoTrack(JAMEDO_CLIENT_ID);
}
export async function fetchJamedoTrack(clientId: string): Promise<Track> {
    const resolveUrl = `https://api.jamendo.com/v3.0/tracks/?client_id=${clientId}&format=json&limit=5&namesearch=lofi`;
    const response = await fetch(resolveUrl);
    if (!response.ok) {
        console.log(`Jamedo API error: ${response.statusText}`);
    }
    const data = await response.json();
    const trackData = data.results[0];
    return {
        id: trackData.id.toString(),
        title: trackData.name,
        artist: trackData.artist_name,
        url: trackData.audio,
        duration: trackData.duration * 1000,
        type: 'remote',
    };
}
