/**
 * Client-side video compression utility
 * Reduces video resolution to 720p and bitrate to 1.5Mbps
 */

interface CompressionOptions {
  maxWidth: number;
  maxHeight: number;
  videoBitrate: number;
  onProgress?: (progress: number) => void;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1280,
  maxHeight: 720,
  videoBitrate: 1500000, // 1.5 Mbps
};

/**
 * Compress a video file using MediaRecorder API
 */
export async function compressVideo(
  file: File,
  options: Partial<CompressionOptions> = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Skip compression for small files (less than 15MB)
  if (file.size < 15 * 1024 * 1024) {
    console.log('Video is small enough, skipping compression');
    return file;
  }

  // Check browser support
  if (!isCompressionSupported()) {
    console.warn('Video compression not supported, returning original');
    return file;
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    
    const blobUrl = URL.createObjectURL(file);
    video.src = blobUrl;

    let hasStarted = false;
    let mediaRecorder: MediaRecorder | null = null;
    const chunks: Blob[] = [];

    const cleanup = () => {
      URL.revokeObjectURL(blobUrl);
      video.pause();
      video.src = '';
      video.load();
    };

    video.onloadedmetadata = () => {
      video.currentTime = 0;
    };

    video.oncanplaythrough = async () => {
      if (hasStarted) return;
      hasStarted = true;

      try {
        // Calculate new dimensions maintaining aspect ratio
        let width = video.videoWidth;
        let height = video.videoHeight;
        
        if (width > opts.maxWidth || height > opts.maxHeight) {
          const aspectRatio = width / height;
          
          if (aspectRatio > opts.maxWidth / opts.maxHeight) {
            width = opts.maxWidth;
            height = Math.round(opts.maxWidth / aspectRatio);
          } else {
            height = opts.maxHeight;
            width = Math.round(opts.maxHeight * aspectRatio);
          }
        }

        // Ensure even dimensions (required for some codecs)
        width = Math.floor(width / 2) * 2;
        height = Math.floor(height / 2) * 2;

        // Create canvas for rendering
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: false });
        
        if (!ctx) {
          cleanup();
          resolve(file); // Fallback to original
          return;
        }

        // Get canvas stream at 30fps
        const canvasStream = canvas.captureStream(30);
        
        // Determine best supported format
        const mimeType = getSupportedMimeType();
        if (!mimeType) {
          cleanup();
          resolve(file);
          return;
        }

        // Create MediaRecorder with lower bitrate
        mediaRecorder = new MediaRecorder(canvasStream, {
          mimeType,
          videoBitsPerSecond: opts.videoBitrate,
        });

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          cleanup();
          
          if (chunks.length === 0) {
            console.warn('No video data captured, using original');
            resolve(file);
            return;
          }
          
          const blob = new Blob(chunks, { type: mimeType });
          
          // If compressed file is larger or too small, use original
          if (blob.size >= file.size || blob.size < 1000) {
            console.warn('Compression ineffective, using original');
            resolve(file);
            return;
          }
          
          const extension = mimeType.includes('webm') ? 'webm' : 'mp4';
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, `.${extension}`),
            { type: mimeType }
          );
          
          console.log(`Video compressed: ${formatBytes(file.size)} → ${formatBytes(compressedFile.size)}`);
          resolve(compressedFile);
        };

        mediaRecorder.onerror = () => {
          cleanup();
          resolve(file);
        };

        // Start recording with timeslice for more reliable data capture
        mediaRecorder.start(100);
        
        const duration = video.duration;
        let animationId: number;
        
        // Render loop - draw video frames to canvas
        const renderFrame = () => {
          if (video.paused || video.ended) {
            return;
          }
          
          ctx.drawImage(video, 0, 0, width, height);
          
          // Update progress
          const progress = Math.min(99, Math.round((video.currentTime / duration) * 100));
          opts.onProgress?.(progress);
          
          animationId = requestAnimationFrame(renderFrame);
        };

        video.onended = () => {
          cancelAnimationFrame(animationId);
          opts.onProgress?.(100);
          
          // Small delay to ensure last frames are captured
          setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
          }, 200);
        };

        video.onerror = () => {
          cancelAnimationFrame(animationId);
          cleanup();
          resolve(file);
        };

        // Start playback
        video.currentTime = 0;
        await video.play();
        renderFrame();
        
      } catch (error) {
        console.error('Compression error:', error);
        cleanup();
        resolve(file);
      }
    };

    video.onerror = () => {
      cleanup();
      resolve(file);
    };

    // Timeout fallback - if compression takes too long, use original
    setTimeout(() => {
      if (!hasStarted || (mediaRecorder && mediaRecorder.state === 'recording')) {
        console.warn('Compression timeout, using original');
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
        cleanup();
        resolve(file);
      }
    }, 120000); // 2 minute timeout
  });
}

/**
 * Get supported MIME type for MediaRecorder
 */
function getSupportedMimeType(): string | null {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4;codecs=avc1',
    'video/mp4',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return null;
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if video compression is supported
 */
export function isCompressionSupported(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' && 
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    getSupportedMimeType() !== null
  );
}
