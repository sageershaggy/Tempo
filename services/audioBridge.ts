// Audio Bridge - Communicates with offscreen document for persistent audio
// When the popup closes, audio keeps playing via the offscreen document

import { BinauralRange } from './soundGenerator';

const isChromeExtension = typeof chrome !== 'undefined' && chrome.runtime?.sendMessage;
const YOUTUBE_UNAVAILABLE_ERROR = 'YouTube audio is only available in the Chrome extension.';

// Send message to background/offscreen with fallback
const sendAudioMessage = (message: any): Promise<any> => {
  return new Promise((resolve) => {
    if (!isChromeExtension) {
      resolve({ success: false, error: 'Not in extension context' });
      return;
    }
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response || { success: false });
        }
      });
    } catch (e) {
      resolve({ success: false, error: String(e) });
    }
  });
};

// Play a sound via offscreen document (persistent)
export const playOffscreen = async (trackId: string, volume: number = 0.5, range?: BinauralRange): Promise<boolean> => {
  const response = await sendAudioMessage({
    action: 'audio-play',
    trackId,
    volume,
    range,
  });
  return response?.success || false;
};

// Stop sound in offscreen document
export const stopOffscreen = async (): Promise<boolean> => {
  const response = await sendAudioMessage({ action: 'audio-stop' });
  return response?.success || false;
};

// Set volume in offscreen document
export const setOffscreenVolume = async (volume: number): Promise<boolean> => {
  const response = await sendAudioMessage({ action: 'audio-volume', volume });
  return response?.success || false;
};

// Switch binaural range in offscreen document
export const switchOffscreenRange = async (trackId: string, range: BinauralRange): Promise<boolean> => {
  const response = await sendAudioMessage({ action: 'audio-range', trackId, range });
  return response?.success || false;
};

// Get current audio status from offscreen document
export const getOffscreenStatus = async (): Promise<{ isPlaying: boolean; trackId: string | null; volume: number }> => {
  const response = await sendAudioMessage({ action: 'audio-status' });
  return {
    isPlaying: response?.isPlaying || false,
    trackId: response?.trackId || null,
    volume: response?.volume || 0.5,
  };
};

export interface YouTubePlaybackResult {
  success: boolean;
  videoId?: string | null;
  error?: string;
}

export interface YouTubeOffscreenStatus {
  isPlaying: boolean;
  videoId: string | null;
  volume?: number | null;
  error?: string | null;
}

export const playYouTubeOffscreen = async (videoId: string): Promise<YouTubePlaybackResult> => {
  const response = await sendAudioMessage({ action: 'youtube-play', videoId });
  if (response?.success) {
    return { success: true, videoId: response.videoId || videoId };
  }
  return { success: false, error: response?.error || YOUTUBE_UNAVAILABLE_ERROR };
};

export const stopYouTubeOffscreen = async (): Promise<boolean> => {
  const response = await sendAudioMessage({ action: 'youtube-stop' });
  return response?.success || false;
};

export const getYouTubeOffscreenStatus = async (): Promise<YouTubeOffscreenStatus> => {
  const response = await sendAudioMessage({ action: 'youtube-status' });
  return {
    isPlaying: !!response?.isPlaying,
    videoId: response?.videoId || null,
    volume: typeof response?.volume === 'number' ? response.volume : null,
    error: response?.error || null,
  };
};

export const setYouTubeOffscreenVolume = async (volume: number): Promise<boolean> => {
  const response = await sendAudioMessage({ action: 'youtube-volume', volume });
  return response?.success || false;
};

export const pauseYouTubeOffscreen = async (): Promise<boolean> => {
  const response = await sendAudioMessage({ action: 'youtube-pause' });
  return response?.success || false;
};

export const resumeYouTubeOffscreen = async (): Promise<boolean> => {
  const response = await sendAudioMessage({ action: 'youtube-resume' });
  return response?.success || false;
};

// Check if offscreen audio is available
export const isOffscreenAvailable = (): boolean => {
  return !!isChromeExtension;
};
