import { AES } from "../../utils/AES";
import type { MediaSources, MediaSource, TrackSource } from "../../types/types";


  
  export function spoofMediaSources(
    sources: MediaSources,
    options: {
      baseUrl?: string;
      encrypt?: boolean;
      videoPath?: string;
      trackPath?: string;
    } = {}
  ) {
    const {
      baseUrl = Bun.env.M3U8_URL || "https://m3u8.aniflame.lol/",
      encrypt = true,
      videoPath = '/video',
      trackPath = ''
    } = options;
  
    function encodeUrl(url: string): string {
      if (!encrypt) return url;
      const secretKey = Bun.env.SECRET_KEY;
      if (!secretKey) {
        throw new Error("SECRET_KEY is not defined");
      }
      return AES.Encrypt(url, secretKey);
    }
  
    function processSource(source: MediaSource, path: string) {
      if (source.file) {
        source.file = `${baseUrl}${path}/${encodeUrl(source.file)}`;
      }
      return source;
    }
  
    // Process video sources
    for (const key of Object.keys(sources)) {
      if (Array.isArray(sources[key])) {
        (sources[key] as MediaSource[]).forEach(source => 
          processSource(source, videoPath)
        );
      } else if (sources[key]?.file) {
        processSource(sources[key] as MediaSource, videoPath);
      }
    }
  
    // Process track sources
    if (sources.track) {
      const trackSource = sources.track as TrackSource;
      if (Array.isArray(trackSource.tracks)) {
        trackSource.tracks.forEach((track: MediaSource) => 
          processSource(track, trackPath)
        );
      } else if (trackSource.file) {
        processSource(sources.track as MediaSource, trackPath);
      }
    }
  
    return sources;
  }