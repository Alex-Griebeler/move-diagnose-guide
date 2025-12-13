// ============================================
// Media Utilities
// Centralized helper functions for media processing
// ============================================

/**
 * Extract a frame from a video URL as a JPEG data URL.
 * Fetches video as blob to avoid CORS issues with Supabase Storage,
 * then seeks to the middle of the video and captures a frame.
 * 
 * @param videoUrl - The URL of the video to extract a frame from
 * @returns Promise<string> - Base64 data URL of the extracted frame
 */
export async function extractFrameFromVideo(videoUrl: string): Promise<string> {
  // Fetch video as blob to avoid CORS issues with Supabase Storage
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error('Failed to fetch video');
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = blobUrl;
    video.muted = true;
    video.playsInline = true;
    
    const cleanup = () => {
      URL.revokeObjectURL(blobUrl);
    };
    
    video.onloadedmetadata = () => {
      // Seek to middle of video for best frame
      video.currentTime = video.duration / 2;
    };
    
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(video, 0, 0);
        const frameUrl = canvas.toDataURL('image/jpeg', 0.8);
        cleanup();
        resolve(frameUrl);
      } catch (error) {
        cleanup();
        reject(error);
      }
    };
    
    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video'));
    };
    
    video.load();
  });
}

/**
 * Check if a URL is a valid image URL
 */
export function isImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowerUrl.includes(ext));
}

/**
 * Check if a URL is a valid video URL
 */
export function isVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext));
}
